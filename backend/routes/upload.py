import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config.config import Config

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"txt", "pdf", "doc", "docx", "mp3", "wav", "m4a", "mp4"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route("/", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"success": False, "error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_folder = Config.UPLOAD_FOLDER

        # Make sure upload folder exists
        os.makedirs(upload_folder, exist_ok=True)

        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        return jsonify({
            "success": True,
            "message": "File uploaded successfully",
            "filename": filename,
            "filepath": filepath
        }), 200

    return jsonify({
        "success": False,
        "error": "File type not allowed"
    }), 400