import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# Defensive Initialization: Prevent Gunicorn from crashing if key is missing
api_key = os.environ.get("OPENAI_API_KEY")
if api_key:
    client = OpenAI(api_key=api_key)
else:
    client = None
    print("WARNING: OPENAI_API_KEY is not set in the environment variables.")

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "running", 
        "service": "Wawasan Sabak MyKad Vision Processor",
        "api_configured": client is not None
    })

@app.route("/extract-ic", methods=["POST"])
def extract_ic():
    # Return a clean API error if OpenAI client was not initialized
    if not client:
        return jsonify({
            "error": "OpenAI API Key is not configured on the server. Please add OPENAI_API_KEY to Render environment variables."
        }), 500

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        image_bytes = file.read()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        ext = os.path.splitext(file.filename.lower())[1]
        mime_type = "image/jpeg"
        if ext == ".png":
            mime_type = "image/png"
        elif ext == ".webp":
            mime_type = "image/webp"

        prompt_instructions = (
            "Analyze the provided image of a Malaysian Identification Card (MyKad).\n"
            "Extract details exactly as they appear on the card and return ONLY a valid JSON object without markdown formatting backticks.\n"
            "Format the JSON with keys:\n"
            "- 'fullName': Extract the full name.\n"
            "- 'icNumber': Extract the 12-digit ID without dashes (e.g. 911210105837).\n"
            "- 'address': Extract the residential address, spacing lines properly with commas.\n"
            "- 'birthplace': Identify the State of birth (e.g., SELANGOR, PERAK, KUALA LUMPUR) based on standard MyKad birth codes if available, else leave as blank string."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_instructions},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )

        raw_response = response.choices[0].message.content
        return raw_response, 200, {"Content-Type": "application/json"}

    except Exception as e:
        print("Backend Error: ", str(e))
        return jsonify({"error": "Internal processor error: " + str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
