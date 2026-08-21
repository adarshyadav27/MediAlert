from flask import Blueprint, request, jsonify
import uuid


grievance_bp = Blueprint(
    "grievance",
    __name__,
    url_prefix="/api/grievance"
)


@grievance_bp.route("/", methods=["POST"])
def create_grievance():

    data = request.get_json(silent=True) or {}

    description = data.get(
        "description",
        ""
    ).strip()

    if not description:

        return jsonify({
            "success": False,
            "error": "Grievance description is required."
        }), 400

    grievance_id = (
        "MED-"
        + uuid.uuid4().hex[:8].upper()
    )

    return jsonify({
        "success": True,
        "message": "Grievance created.",
        "grievance": {
            "id": grievance_id,
            "status": "Submitted",
            "description": description
        }
    })


@grievance_bp.route("/<grievance_id>", methods=["GET"])
def get_grievance(grievance_id):

    return jsonify({
        "success": True,
        "grievance": {
            "id": grievance_id,
            "status": "Under Review"
        }
    })