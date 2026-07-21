import os
import base64
import sys
import traceback
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
    print("WARNING: OPENAI_API_KEY is not set in the environment variables.", file=sys.stderr)

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "running", 
        "service": "Wawasan Sabak MyKad Vision Processor and Intel Agent",
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
            model="gpt-5.4-mini",
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
        print("Crashes on MyKad Extract Process:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Internal processor error: {str(e)}"}), 500


@app.route("/risik-tokoh", methods=["POST"])
def risik_tokoh():
    # Return a clean API error if OpenAI client was not initialized
    if not client:
        return jsonify({
            "error": "OpenAI API Key is not configured on the server. Please add OPENAI_API_KEY to Render environment variables."
        }), 500

    request_data = request.get_json(silent=True) or {}
    leader_name = request_data.get("leaderName", "").strip()

    if not leader_name:
        return jsonify({"error": "Nama pemimpin tidak dibekalkan."}), 400

    # 100% exact insertion of system prompt as specified in promptv1.md
    system_prompt = (
        "Peranan: Anda adalah Penganalisis Strategi Politik dan Korporat yang pakar dalam Teori Permainan (Game Theory) dan Pemetaan Kuasa (Network Mapping).\n"
        "Tugas: Apabila saya memberikan nama seorang pemimpin, anda perlu melakukan analisis \"Lingkaran Dalaman\" (Inner Circle Analysis) terhadap individu tersebut.\n"
        "Struktur Analisis:\n"
        "Profil Ringkas: Nyatakan peranan semasa dan \"Game Plan\" utama mereka dalam landskap politik/organisasi sekarang.\n"
        "Pemetaan Orang Kuat (The Trusted Core): Pecahkan kepada 3 kategori wajib:\n"
        "Strategist/Teknokrat: Siapa otak di sebalik dasar/ekonomi mereka?\n"
        "Political Gatekeeper: Siapa yang menguruskan sokongan, 'dirty work', atau operasi lapangan?\n"
        "Communications Strategist: Siapa yang mengawal naratif dan imej mereka di media?\n"
        "Dinamika Kepercayaan: Terangkan mengapa mereka percaya kepada individu-individu ini (Adakah berdasarkan sejarah, kompetensi, atau kepentingan transaksional?).\n"
        "Game Theory Assessment: Adakah mereka sedang membina empayar, bertahan, atau cuba mengimbangi kuasa?\n\n"
        "Syarat:\n"
        "- Gunakan gaya bahasa yang profesional, analitikal, dan objektif.\n"
        "- Jika maklumat tidak tersedia, nyatakan ia sebagai \"Spekulasi Berasaskan Pemerhatian\" dan jangan mereka-reka fakta.\n"
        "- Fokus kepada mekanik kuasa, bukan sentimen peribadi.\n\n"
        "Format Output MESTI dalam JSON dengan kunci berikut:\n"
        "1. 'tree': Objek mengandungi sub-key 'leader' (Nama pemimpin itu), 'strategist' (Satu nama Strategist/Teknokrat utama), 'gatekeeper' (Satu nama Political Gatekeeper utama), dan 'communicator' (Satu nama Communications Strategist utama).\n"
        "2. 'full_text': Teks analisis lengkap yang diformat dengan baik mengikut format bertanda Markdown/Aesthetic (Gunakan **teks** untuk tebal, __teks__ untuk garis bawah, ==teks== untuk sorotan warna/highlight). Teks ini mesti merangkumi tajuk-tajuk utama di atas.\n"
        "3. 'sources': Array objek rujukan mengandungi 'title' dan 'url' yang sah."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-5.4-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Sila buat risikan lingkaran dalaman tokoh berikut: {leader_name}"}
            ],
            max_tokens=1800
        )

        raw_response = response.choices[0].message.content
        return raw_response, 200, {"Content-Type": "application/json"}

    except Exception as e:
        print("Crashes on Intel Agent Process:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Gagal memproses analisis AI: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
