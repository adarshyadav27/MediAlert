"""MedAlert Lucknow Flask application with Virtual Doctor AI persona and Sarvam multi-modal prescription OCR."""

from functools import wraps
import csv
import os
import re
import secrets
import sqlite3
import time

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from utils import (
    assess_triage,
    filter_donors,
    filter_hospitals,
    filter_schemes,
    init_rag_vectorstore,
    load_data,
    process_prescription_ocr,
    query_rag_system,
    transcribe_speech_audio,
)

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
app.config["SECRET_KEY"] = os.getenv("MEDIALERT_SECRET_KEY", "change-this-development-secret")
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
DB_PATH = os.path.join(os.path.dirname(__file__), "medialert.sqlite3")
DATA_PATH = os.path.join(os.path.dirname(__file__), "data")


def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                mobile TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                location TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS emergency_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                request_text TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS otp_challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code_hash TEXT NOT NULL,
                purpose TEXT NOT NULL,
                expires_at REAL NOT NULL,
                next_url TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
        if "mobile" not in columns:
            connection.execute("ALTER TABLE users ADD COLUMN mobile TEXT NOT NULL DEFAULT ''")
            connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)")
        legacy_users = connection.execute("SELECT id FROM users WHERE mobile = ''").fetchall()
        for legacy_user in legacy_users:
            connection.execute("UPDATE users SET mobile = ? WHERE id = ?", (f"900000{legacy_user['id']:04d}", legacy_user["id"]))
        admin_email = os.getenv("MEDIALERT_ADMIN_EMAIL", "admin@medialert.local")
        admin_password = os.getenv("MEDIALERT_ADMIN_PASSWORD", "Admin@12345")
        connection.execute(
            "INSERT OR IGNORE INTO users (full_name, email, mobile, password_hash, location, role) VALUES (?, ?, ?, ?, ?, 'admin')",
            ("MediAlert Administrator", admin_email, "9999999999", generate_password_hash(admin_password), "Lucknow"),
        )


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    with get_db() as connection:
        row = connection.execute("SELECT id, full_name, email, mobile, location, role FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required."}), 401
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user:
            return redirect(url_for("login", next=request.path)) if not request.path.startswith("/api/") else (jsonify({"error": "Authentication required."}), 401)
        if user["role"] != "admin":
            return jsonify({"error": "Administrator access required."}), 403
        return view(*args, **kwargs)
    return wrapped


def update_csv_record(filename, identifier_field, identifier, updates):
    """Update only existing CSV columns and preserve the file's tabular shape."""
    path = os.path.join(DATA_PATH, filename)
    with open(path, newline="", encoding="utf-8") as source:
        records = list(csv.DictReader(source))
        fieldnames = source.seek(0) or next(csv.reader(source))
    allowed_updates = {key: str(value).strip() for key, value in updates.items() if key in fieldnames and key != identifier_field}
    for record in records:
        if str(record.get(identifier_field, "")) == str(identifier):
            record.update(allowed_updates)
            with open(path, "w", newline="", encoding="utf-8") as destination:
                writer = csv.DictWriter(destination, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(records)
            return True
    return False


@app.context_processor
def inject_user():
    return {"current_user": current_user()}


def normalize_mobile(value):
    digits = re.sub(r"\D", "", value or "")
    return digits[2:] if digits.startswith("91") and len(digits) == 12 else digits


def start_otp_challenge(user_id, purpose, next_url):
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = time.time() + 300
    safe_next_url = next_url if next_url and next_url.startswith("/") else url_for("index")
    with get_db() as connection:
        connection.execute("DELETE FROM otp_challenges WHERE user_id = ?", (user_id,))
        challenge_id = connection.execute("INSERT INTO otp_challenges (user_id, code_hash, purpose, expires_at, next_url) VALUES (?, ?, ?, ?, ?)", (user_id, generate_password_hash(code), purpose, expires_at, safe_next_url)).lastrowid
    session["otp_challenge_id"] = challenge_id
    send_otp_message(user_id, code, purpose)


def send_otp_message(user_id, code, purpose):
    """Send an OTP by Twilio, falling back to terminal output for local demos."""
    with get_db() as connection:
        user = connection.execute("SELECT mobile FROM users WHERE id = ?", (user_id,)).fetchone()
    mobile = user["mobile"] if user else ""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "")

    if account_sid and auth_token and from_number and mobile:
        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=f"Your MediAlert OTP is: {code}",
                from_=from_number,
                to=f"+91{mobile}",
            )
            print(f"[OTP] Twilio SMS sent for {purpose} user {user_id}; message_sid={message.sid}")
            return True
        except Exception as error:
            print(f"[OTP] Twilio SMS failed for user {user_id}: {error}")

    print(f"[OTP] Terminal fallback for {purpose} user {user_id}: {code} (expires in 5 minutes)")
    return False


init_db()

# RAG Vectorstore initialized on demand when needed
# init_rag_vectorstore()


@app.get("/login")
def login():
    if current_user():
        return redirect(url_for("index"))
    return render_template("login.html", error=None)


@app.post("/login")
def login_submit():
    email = request.form.get("email", "").strip().lower()
    mobile = normalize_mobile(request.form.get("mobile", ""))
    password = request.form.get("password", "")
    with get_db() as connection:
        user = connection.execute("SELECT * FROM users WHERE email = ? OR mobile = ?", (email, mobile)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return render_template("login.html", error="Email or password is incorrect."), 401
    session.clear()
    next_url = request.args.get("next") or request.form.get("next") or url_for("index")
    start_otp_challenge(user["id"], "login", next_url)
    return redirect(url_for("verify_otp"))


@app.get("/signup")
def signup():
    return render_template("signup.html", error=None)


@app.post("/signup")
def signup_submit():
    full_name = request.form.get("full_name", "").strip()
    email = request.form.get("email", "").strip().lower()
    mobile = normalize_mobile(request.form.get("mobile", ""))
    password = request.form.get("password", "")
    location = request.form.get("location", "").strip()
    if not full_name or not email or len(mobile) != 10 or len(password) < 8 or not location:
        return render_template("signup.html", error="Enter all fields, a valid 10-digit mobile number, and a password of at least 8 characters."), 400
    try:
        with get_db() as connection:
            cursor = connection.execute(
                "INSERT INTO users (full_name, email, mobile, password_hash, location) VALUES (?, ?, ?, ?, ?)",
                (full_name, email, mobile, generate_password_hash(password), location),
            )
            new_user_id = cursor.lastrowid
            session.clear()
        start_otp_challenge(new_user_id, "signup", url_for("index"))
    except sqlite3.IntegrityError:
        return render_template("signup.html", error="An account with that email or mobile number already exists."), 409
    return redirect(url_for("verify_otp"))


@app.route("/verify-otp", methods=["GET", "POST"])
def verify_otp():
    challenge_id = session.get("otp_challenge_id")
    with get_db() as connection:
        challenge = connection.execute("SELECT * FROM otp_challenges WHERE id = ?", (challenge_id,)).fetchone() if challenge_id else None
    if not challenge:
        return redirect(url_for("login"))
    if request.method == "POST":
        entered = request.form.get("otp", "").strip()
        if time.time() > challenge["expires_at"]:
            session.pop("otp_challenge_id", None)
            return render_template("otp.html", error="This code expired. Start again to receive a new one."), 400
        if not check_password_hash(challenge["code_hash"], entered):
            return render_template("otp.html", error="The verification code is incorrect. Check the terminal and try again."), 401
        with get_db() as connection:
            connection.execute("DELETE FROM otp_challenges WHERE id = ?", (challenge["id"],))
        session.pop("otp_challenge_id", None)
        session["user_id"] = challenge["user_id"]
        return redirect(challenge["next_url"])
    return render_template("otp.html", error=None)


@app.post("/send-otp")
def send_otp():
    challenge_id = session.get("otp_challenge_id")
    with get_db() as connection:
        challenge = connection.execute("SELECT * FROM otp_challenges WHERE id = ?", (challenge_id,)).fetchone() if challenge_id else None
    if not challenge:
        return redirect(url_for("login"))
    start_otp_challenge(challenge["user_id"], challenge["purpose"], challenge["next_url"])
    return render_template("otp.html", error="A new OTP was sent by SMS, or printed in the terminal if SMS delivery was unavailable.")


@app.post("/resend-otp")
def resend_otp():
    return send_otp()


@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.get("/api/profile")
@login_required
def profile():
    return jsonify(current_user())


@app.patch("/api/profile")
@login_required
def update_profile():
    payload = request.get_json(silent=True) or {}
    user = current_user()
    full_name = payload.get("full_name", "").strip()
    email = payload.get("email", "").strip().lower()
    mobile = normalize_mobile(payload.get("mobile", ""))
    location = payload.get("location", "").strip()
    if not full_name or not email or not location or len(mobile) != 10:
        return jsonify({"error": "Name, email, location, and a valid 10-digit mobile number are required."}), 400
    new_password = payload.get("new_password", "")
    if new_password and len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters."}), 400
    try:
        with get_db() as connection:
            connection.execute("UPDATE users SET full_name = ?, email = ?, mobile = ?, location = ? WHERE id = ?", (full_name, email, mobile, location, user["id"]))
            if new_password:
                connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", (generate_password_hash(new_password), user["id"]))
    except sqlite3.IntegrityError:
        return jsonify({"error": "That email or mobile number is already in use."}), 409
    return jsonify(current_user())


@app.get("/")
@login_required
def index():
    return render_template("index.html")


@app.get("/triage")
@login_required
def triage_page():
    return render_template("triage.html")


@app.get("/hospitals")
@app.get("/hospital-finder")
@login_required
def hospital_page():
    return render_template("hospital_finder.html")


@app.get("/services")
@login_required
def services_page():
    return render_template("services.html", initial_tab="doctor")


@app.get("/donors")
@login_required
def donors_page():
    return render_template("services.html", initial_tab="donors")


@app.get("/schemes")
@login_required
def schemes_page():
    return render_template("services.html", initial_tab="schemes")


@app.get("/admin")
@admin_required
def admin():
    return render_template("admin.html")


@app.get("/api/admin/stats")
@admin_required
def admin_stats():
    with get_db() as connection:
        users = connection.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        requests = connection.execute("SELECT COUNT(*) FROM emergency_requests WHERE status = 'open'").fetchone()[0]
    return jsonify({"users": users, "open_requests": requests})


@app.get("/api/admin/emergency-requests")
@admin_required
def admin_requests():
    with get_db() as connection:
        rows = connection.execute(
            "SELECT emergency_requests.*, users.full_name, users.location FROM emergency_requests JOIN users ON users.id = emergency_requests.user_id ORDER BY emergency_requests.created_at DESC"
        ).fetchall()
    return jsonify({"requests": [dict(row) for row in rows]})


@app.patch("/api/admin/emergency-requests/<int:request_id>")
@admin_required
def update_emergency_request(request_id):
    status = (request.get_json(silent=True) or {}).get("status", "").strip().lower()
    if status not in {"open", "in_progress", "resolved"}:
        return jsonify({"error": "Invalid request status."}), 400
    with get_db() as connection:
        connection.execute("UPDATE emergency_requests SET status = ? WHERE id = ?", (status, request_id))
    return jsonify({"status": status})


@app.patch("/api/admin/hospitals/<hospital_id>")
@admin_required
def update_hospital(hospital_id):
    updates = request.get_json(silent=True) or {}
    if not update_csv_record("hospitals_lucknow.csv", "id", hospital_id, updates):
        return jsonify({"error": "Hospital record not found."}), 404
    return jsonify({"status": "updated", "record_id": hospital_id})


@app.patch("/api/admin/donors/<donor_id>")
@admin_required
def update_donor(donor_id):
    updates = request.get_json(silent=True) or {}
    if not update_csv_record("donors_lucknow.csv", "donor_id", donor_id, updates):
        return jsonify({"error": "Donor record not found."}), 404
    return jsonify({"status": "updated", "record_id": donor_id})


@app.get("/api/health")
@login_required
def health():
    return jsonify({"status": "ok", "service": "medialert-lucknow"})


@app.get("/api/hospitals")
@login_required
def hospitals():
    records = load_data("hospitals_lucknow.csv")
    emergency_val = request.args.get("emergency", "").lower()
    filtered = filter_hospitals(
        records,
        area=request.args.get("area", ""),
        specialty=request.args.get("specialty", ""),
        emergency_only=emergency_val in ["true", "1", "yes", "on"],
        facility_type=request.args.get("facility_type", ""),
        scheme=request.args.get("scheme", ""),
        q=request.args.get("q", ""),
    )
    return jsonify({"count": len(filtered), "hospitals": filtered})


@app.get("/api/donors")
@login_required
def donors():
    records = load_data("donors_lucknow.csv")
    filtered = filter_donors(
        records,
        blood_group=request.args.get("blood_group", ""),
        organ=request.args.get("organ", ""),
        donor_type=request.args.get("type", ""),
        area=request.args.get("area", ""),
        q=request.args.get("q", ""),
    )
    return jsonify({"count": len(filtered), "donors": filtered})


@app.get("/api/schemes")
@login_required
def schemes():
    records = load_data("schemes_up.csv")
    filtered = filter_schemes(
        records,
        q=request.args.get("q", ""),
        department=request.args.get("department", ""),
    )
    return jsonify({"count": len(filtered), "schemes": filtered})


@app.post("/api/triage")
@login_required
def triage():
    payload = request.get_json(silent=True) or {}
    symptoms = payload.get("symptoms", [])
    if isinstance(symptoms, str):
        symptoms = [symptoms]
    vitals = payload.get("vitals", {})
    all_hospitals = load_data("hospitals_lucknow.csv")
    assessment = assess_triage(symptoms, vitals=vitals, hospitals=all_hospitals)
    return jsonify(assessment)


@app.post("/api/chat")
@login_required
def chat():
    payload = request.get_json(silent=True) or {}
    user_message = payload.get("message", "").strip()
    history = payload.get("history", [])
    image_base64 = payload.get("image", None)

    if not user_message and not image_base64:
        return jsonify({"error": "Message payload or image attachment cannot be empty."}), 400

    response = query_rag_system(user_query=user_message, history=history, image_base64=image_base64)
    return jsonify(response)


@app.post("/api/stt")
@login_required
def stt():
    file_name = None
    if "file" in request.files:
        file_obj = request.files["file"]
        file_name = file_obj.filename
        if file_obj.mimetype not in ALLOWED_IMAGE_TYPES:
            return jsonify({"error": "Only JPEG, PNG, or WebP images are supported."}), 415
    result = transcribe_speech_audio(file_name)
    return jsonify(result)


@app.post("/api/ocr")
@login_required
def ocr():
    file_obj = None
    file_name = None
    image_base64 = None

    if "file" in request.files:
        file_obj = request.files["file"]
        file_name = file_obj.filename
        if file_obj.mimetype not in ALLOWED_IMAGE_TYPES:
            return jsonify({"error": "Only JPEG, PNG, or WebP images are supported."}), 415
    elif request.is_json:
        payload = request.get_json(silent=True) or {}
        file_name = payload.get("file_name")
        image_base64 = payload.get("image")

    result = process_prescription_ocr(file_obj=file_obj, file_name=file_name, image_base64=image_base64)
    return jsonify(result)


@app.post("/api/emergency-requests")
@login_required
def create_emergency_request():
    request_text = (request.get_json(silent=True) or {}).get("request_text", "").strip()
    if not request_text:
        return jsonify({"error": "Emergency request details are required."}), 400
    with get_db() as connection:
        connection.execute(
            "INSERT INTO emergency_requests (user_id, request_text) VALUES (?, ?)",
            (session["user_id"], request_text),
        )
    return jsonify({"status": "open"}), 201


@app.errorhandler(FileNotFoundError)
def missing_data(error):
    return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    print("[STARTUP] Loading medical directory and initializing retrieval pipeline...")
    init_rag_vectorstore()
    app.run(debug=True, host="127.0.0.1", port=5000)
