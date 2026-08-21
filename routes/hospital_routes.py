from flask import Blueprint, request, jsonify

from utils.hospital_loader import load_hospitals


hospital_bp = Blueprint(
    "hospitals",
    __name__,
    url_prefix="/api/hospitals"
)


@hospital_bp.route("/", methods=["GET"])
def get_hospitals():

    query = request.args.get(
        "query",
        ""
    ).strip().lower()

    hospitals = load_hospitals()

    if query:

        filtered = []

        for hospital in hospitals:

            searchable_text = str(
                hospital
            ).lower()

            if query in searchable_text:
                filtered.append(hospital)

        hospitals = filtered

    return jsonify({
        "success": True,
        "count": len(hospitals),
        "hospitals": hospitals
    })


@hospital_bp.route("/nearby", methods=["GET"])
def nearby_hospitals():

    latitude = request.args.get("lat")
    longitude = request.args.get("lng")

    if not latitude or not longitude:

        return jsonify({
            "success": False,
            "error": "Latitude and longitude are required."
        }), 400

    hospitals = load_hospitals()

    return jsonify({
        "success": True,
        "latitude": latitude,
        "longitude": longitude,
        "count": len(hospitals),
        "hospitals": hospitals
    })