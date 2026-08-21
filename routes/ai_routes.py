from flask import Blueprint, request, jsonify


ai_bp = Blueprint(
    "ai",
    __name__,
    url_prefix="/api/ai"
)


@ai_bp.route("/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True) or {}

    message = data.get("message", "").strip()

    if not message:
        return jsonify({
            "success": False,
            "error": "Message is required."
        }), 400

    return jsonify({
        "success": True,
        "message": "AI endpoint is connected.",
        "query": message,
        "answer": None,
        "sources": []
    })