from flask import Blueprint, request, jsonify


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "error": "Name, email and password are required."
        }), 400

    return jsonify({
        "success": True,
        "message": "Registration endpoint is working.",
        "user": {
            "name": name,
            "email": email,
            "role": "user"
        }
    })


@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "error": "Email and password are required."
        }), 400

    return jsonify({
        "success": True,
        "message": "Login endpoint is working.",
        "user": {
            "email": email,
            "role": "user"
        }
    })


@auth_bp.route("/logout", methods=["POST"])
def logout():

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })