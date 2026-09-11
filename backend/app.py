
import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from config.config import Config
from routes.upload import upload_bp


# Load environment variables from .env
load_dotenv()

# Check Grok / xAI API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

print("Groq API key loaded:", bool(GROQ_API_KEY))

if GROQ_API_KEY:
    print("Groq API key length:", len(GROQ_API_KEY))
    print("Groq API key first 4 characters:", GROQ_API_KEY[:4])
else:
    print("Groq API key is empty")

    



# Import meeting blueprint
try:
    from routes.meeting import meeting_bp
except Exception as e:
    meeting_bp = None
    print("meeting.py import failed:", e)


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Load Flask configuration
    app.config.from_object(Config)

    # Register upload blueprint
    app.register_blueprint(
        upload_bp,
        url_prefix="/api/upload"
    )

    # Register meeting blueprint if available
    if meeting_bp is not None:
        app.register_blueprint(
            meeting_bp,
            url_prefix="/api/meetings"
        )
        print("meeting blueprint registered")
    else:
        print("meeting blueprint NOT registered")

    # Health check
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok"
        }), 200

    # Home page
    @app.route("/", methods=["GET"])
    def home():
        return "Hello! Flask is working with AI Meeting Intelligence."

    # Frontend connection test
    @app.route("/api/test", methods=["GET"])
    def api_test():
        return jsonify({
            "success": True,
            "message": "Frontend connected to Flask backend!"
        })

    # List uploaded meeting files
    @app.route("/api/meetings", methods=["GET"])
    @app.route("/api/meetings/", methods=["GET"])
    def list_meetings():
        folder = os.path.abspath(Config.UPLOAD_FOLDER)

        # Create upload folder if it does not exist
        os.makedirs(folder, exist_ok=True)

        files = []

        for name in os.listdir(folder):
            path = os.path.join(folder, name)

            if os.path.isfile(path):
                files.append({
                    "filename": name,
                    "size": os.path.getsize(path)
                })

        return jsonify({
            "success": True,
            "folder": folder,
            "files": files
        })

    # Print all registered routes
    print("ALL ROUTES:")
    print(app.url_map)

    return app


# Start Flask application
if __name__ == "__main__":
    app = create_app()

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )

