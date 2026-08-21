from flask import Blueprint, request, jsonify


blood_bp = Blueprint(
    "blood",
    __name__,
    url_prefix="/api/blood"
)


@blood_bp.route("/register", methods=["POST"])
def register_donor():

    data = request.get_json(silent=True) or {}

    required_fields = [
        "name",
        "blood_group",
        "phone"
    ]

    missing = [
        field
        for field in required_fields
        if not data.get(field)
    ]

    if missing:
        return jsonify({
            "success": False,
            "error": "Missing required fields.",
            "fields": missing
        }), 400

    return jsonify({
        "success": True,
        "message": "Donor registration received.",
        "donor": data
    })


@blood_bp.route("/request", methods=["POST"])
def request_blood():

    data = request.get_json(silent=True) or {}

    required_fields = [
        "name",
        "blood_group"
    ]

    missing = [
        field
        for field in required_fields
        if not data.get(field)
    ]

    if missing:
        return jsonify({
            "success": False,
            "error": "Missing required fields.",
            "fields": missing
        }), 400

    return jsonify({
        "success": True,
        "message": "Blood request received.",
        "request": data
    })


@blood_bp.route("/match", methods=["GET"])
def match_donors():

    blood_group = request.args.get(
        "blood_group",
        ""
    ).strip().upper()

    return jsonify({
        "success": True,
        "blood_group": blood_group,
        "matches": []
    })