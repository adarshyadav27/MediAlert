"""MedAlert Lucknow Flask application."""

from flask import Flask, jsonify, render_template, request

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

# Explicitly initialize ChromaDB RAG Vectorstore on Flask startup
init_rag_vectorstore()


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/triage")
def triage_page():
    return render_template("triage.html")


@app.get("/hospitals")
def hospital_page():
    return render_template("hospital_finder.html")


@app.get("/services")
def services_page():
    return render_template("services.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "medialert-lucknow"})


@app.get("/api/hospitals")
def hospitals():
    records = load_data("hospitals_lucknow.csv")
    filtered = filter_hospitals(
        records,
        area=request.args.get("area", ""),
        specialty=request.args.get("specialty", ""),
        emergency_only=request.args.get("emergency", "").lower() == "true",
        facility_type=request.args.get("facility_type", ""),
        scheme=request.args.get("scheme", ""),
        q=request.args.get("q", ""),
    )
    return jsonify({"count": len(filtered), "hospitals": filtered})


@app.get("/api/donors")
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
def schemes():
    records = load_data("schemes_up.csv")
    filtered = filter_schemes(
        records,
        q=request.args.get("q", ""),
        department=request.args.get("department", ""),
    )
    return jsonify({"count": len(filtered), "schemes": filtered})


@app.post("/api/triage")
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
def chat():
    payload = request.get_json(silent=True) or {}
    user_message = payload.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Message payload cannot be empty."}), 400

    response = query_rag_system(user_message)
    return jsonify(response)


@app.post("/api/stt")
def stt():
    file_name = None
    if "file" in request.files:
        file_obj = request.files["file"]
        file_name = file_obj.filename
    result = transcribe_speech_audio(file_name)
    return jsonify(result)


@app.post("/api/ocr")
def ocr():
    file_obj = None
    file_name = None

    if "file" in request.files:
        file_obj = request.files["file"]
        file_name = file_obj.filename
    elif request.is_json:
        payload = request.get_json(silent=True) or {}
        file_name = payload.get("file_name")

    result = process_prescription_ocr(file_obj=file_obj, file_name=file_name)
    return jsonify(result)


@app.errorhandler(FileNotFoundError)
def missing_data(error):
    return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
