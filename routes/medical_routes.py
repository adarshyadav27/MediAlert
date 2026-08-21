from flask import Blueprint, request, jsonify


medical_bp = Blueprint(
    "medical",
    __name__,
    url_prefix="/api/medical"
)


ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "bmp",
    "tiff"
}


def allowed_file(filename):

    if "." not in filename:
        return False

    extension = (
        filename
        .rsplit(".", 1)[1]
        .lower()
    )

    return extension in ALLOWED_EXTENSIONS


@medical_bp.route("/ocr", methods=["POST"])
def medical_ocr():

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "error": "No image uploaded."
        }), 400

    file = request.files["file"]

    if not file.filename:

        return jsonify({
            "success": False,
            "error": "Invalid filename."
        }), 400

    if not allowed_file(file.filename):

        return jsonify({
            "success": False,
            "error": "Unsupported image format."
        }), 400

    return jsonify({
        "success": True,
        "message": "OCR endpoint is ready.",
        "filename": file.filename,
        "text": None,
        "analysis": None
    })


@medical_bp.route("/prescription", methods=["POST"])
def prescription_reader():

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "error": "No prescription uploaded."
        }), 400

    file = request.files["file"]

    if not file.filename:

        return jsonify({
            "success": False,
            "error": "Invalid prescription file."
        }), 400

    return jsonify({
        "success": True,
        "message": "Prescription reader endpoint is ready.",
        "filename": file.filename,
        "extracted_text": None,
        "medicines": []
    })