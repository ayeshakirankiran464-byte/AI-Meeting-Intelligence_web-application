import os
from flask import Blueprint, request, jsonify
from config.config import Config
from services.llm_service import llm_service

meeting_bp = Blueprint("meeting", __name__)


def load_transcript(filename):
    folder = Config.UPLOAD_FOLDER
    name = os.path.basename(filename)

    txt_name = os.path.splitext(name)[0] + ".txt"
    txt_path = os.path.join(folder, txt_name)

    if os.path.isfile(txt_path):
        with open(txt_path, "r", encoding="utf-8") as f:
            return f.read()
    return None


@meeting_bp.route("/", methods=["GET"])
def list_meetings():
    folder = Config.UPLOAD_FOLDER
    os.makedirs(folder, exist_ok=True)

    files = []
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        if os.path.isfile(path):
            files.append({"filename": name, "size": os.path.getsize(path)})

    return jsonify({"success": True, "files": files})


@meeting_bp.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json(silent=True) or {}
    transcript = data.get("transcript")
    filename = data.get("filename")

    if not transcript and filename:
        transcript = load_transcript(filename)

    if not transcript:
        return jsonify({
            "success": False,
            "error": "Send transcript, or filename of the .txt file in uploads"
        }), 400

    summary = llm_service.summarize_meeting(transcript)
    return jsonify({"success": True, "summary": summary})


@meeting_bp.route("/query", methods=["POST"])
def query_meeting():
    data = request.get_json(silent=True) or {}
    question = data.get("question")
    transcript = data.get("transcript")
    filename = data.get("filename")

    if not question:
        return jsonify({"success": False, "error": "question is required"}), 400

    if not transcript and filename:
        transcript = load_transcript(filename)

    if not transcript:
        return jsonify({
            "success": False,
            "error": "Send transcript, or filename of the .txt file in uploads"
        }), 400

    answer = llm_service.answer_query(transcript, question)
    return jsonify({"success": True, "answer": answer})