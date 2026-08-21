from flask import Blueprint, request, jsonify


emergency_bp = Blueprint(
    "emergency",
    __name__,
    url_prefix="/api/emergency"
)


@emergency_bp.route("/sos", methods=["POST"])
def emergency_sos():

    data = request.get_json(silent=True) or {}

    latitude = data.get("latitude")
    longitude = data.get("longitude")
    emergency_contact = data.get(
        "emergency_contact"
    )

    if latitude is None or longitude is None:

        return jsonify({
            "success": False,
            "error": "Location is required."
        }), 400

    return jsonify({
        "success": True,
        "message": "Emergency request received.",
        "emergency": {
            "latitude": latitude,
            "longitude": longitude,
            "emergency_contact": emergency_contact
        }
    })


@emergency_bp.route("/contacts", methods=["GET"])
def emergency_contacts():

    return jsonify({
        "success": True,
        "contacts": []
    })