from flask import Blueprint, request, jsonify


scheme_bp = Blueprint(
    "schemes",
    __name__,
    url_prefix="/api/schemes"
)


@scheme_bp.route("/", methods=["GET"])
def get_schemes():

    query = request.args.get(
        "query",
        ""
    ).strip()

    age = request.args.get("age")
    income = request.args.get("income")
    category = request.args.get("category")

    return jsonify({
        "success": True,
        "query": query,
        "profile": {
            "age": age,
            "income": income,
            "category": category
        },
        "schemes": []
    })


@scheme_bp.route("/<scheme_id>", methods=["GET"])
def get_scheme(scheme_id):

    return jsonify({
        "success": True,
        "scheme": {
            "id": scheme_id
        }
    })