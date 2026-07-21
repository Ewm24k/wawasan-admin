import os
import base64
import sys
import traceback
import datetime
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
            max_completion_tokens=300  # Upgraded parameter for gpt-5.4-mini
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

    # Dynamically generate the current date in Malay
    months_malay = [
        "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
        "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    ]
    now = datetime.datetime.now()
    current_date_str = f"{now.day} {months_malay[now.month-1]} {now.year}"

    # 100% exact integration of your 6-step prompt protocol
    system_prompt = (
        "Peranan: Anda adalah Penganalisis Strategi Politik dan Korporat yang pakar dalam Teori Permainan (Game Theory) dan Pemetaan Kuasa (Network Mapping).\n"
        "Tugas: Apabila saya memberikan nama seorang pemimpin, anda perlu melakukan analisis \"Lingkaran Dalaman\" (Inner Circle Analysis) terhadap individu tersebut.\n\n"
        "# PROTOKOL WAJIB SEBELUM MEMULAKAN ANALISIS\n"
        "JANGAN terus menjawab menggunakan pengetahuan dalaman model sahaja.\n"
        "Sebelum menghasilkan sebarang analisis, AI MESTI melalui proses pengesahan berikut.\n\n"
        "## Langkah 1 — Semak Tarikh Semasa\n"
        f"Tarikh semasa sistem adalah {current_date_str}. Anda wajib meletakkan tarikh ini di bahagian paling atas teks analisis Anda:\n"
        f"**Tarikh Analisis:** {current_date_str}\n"
        "Semua analisis hendaklah berpandukan keadaan politik pada tarikh tersebut.\n\n"
        "## Langkah 2 — Carian Web Terkini (WAJIB)\n"
        "Lakukan carian web atau pengesahan maklumat terkini terlebih dahulu. Utamakan sumber rasmi atau sumber media yang bereputasi seperti laman rasmi parti, laman rasmi kerajaan, kenyataan media rasmi, Bernama, The Star, New Straits Times, Malaysiakini, Free Malaysia Today, Sinar Harian, Astro Awani, Harian Metro, Utusan, atau The Edge.\n"
        "JANGAN bergantung kepada data latihan model sahaja.\n\n"
        "## Langkah 3 — Pengesahan Individu\n"
        "Sebelum menyenaraikan mana-mana individu sebagai orang kanan pemimpin, SEMAK perkara berikut:\n"
        "✓ Adakah individu tersebut masih hidup?\n"
        "✓ Adakah beliau masih berada dalam parti yang sama?\n"
        "✓ Adakah beliau masih memegang jawatan tersebut?\n"
        "✓ Adakah beliau masih merupakan penyokong kepada pemimpin tersebut?\n"
        "✓ Adakah beliau telah berpindah parti?\n"
        "✓ Adakah beliau telah dipecat?\n"
        "✓ Adakah beliau telah meletakkan jawatan?\n"
        "✓ Adakah hubungan mereka masih relevan berdasarkan laporan terkini?\n"
        "Jika jawapan kepada mana-mana semakan di atas ialah \"tidak\", jangan senaraikan individu tersebut sebagai anggota Lingkaran Dalaman semasa.\n\n"
        "## Langkah 4 — Pengesahan Hubungan\n"
        "Jangan menganggap seseorang masih menjadi orang kanan hanya kerana mereka pernah bekerja bersama.\n"
        "Pastikan terdapat bukti terkini seperti mesyuarat, kenyataan media, pelantikan, kempen, sidang media, atau laporan media dalam tempoh munasabah.\n"
        "Jika tiada bukti terkini, nyatakan:\n"
        "\"Tiada bukti awam yang mencukupi untuk mengesahkan bahawa individu ini masih berada dalam lingkaran dalaman.\"\n\n"
        "## Langkah 5 — Tahap Keyakinan\n"
        "Bagi setiap individu yang disenaraikan, nyatakan secara spesifik:\n"
        "Status: Disahkan / Kemungkinan / Spekulasi Berasaskan Pemerhatian\n"
        "Keyakinan: Tinggi / Sederhana / Rendah\n\n"
        "## Langkah 6 — Sumber\n"
        "Selepas setiap nama individu, nyatakan sumber yang menyokong penilaian tersebut serta tarikh penerbitan laporan.\n\n"
        "Polisi Ketepatan:\n"
        "- Jangan menggunakan contoh sejarah yang sudah tidak relevan.\n"
        "- Elakkan menyenaraikan bekas setiausaha politik, bekas menteri, bekas penasihat, individu yang telah meninggal dunia, individu yang telah keluar parti, atau individu yang tidak lagi rapat dengan pemimpin.\n"
        "- Keutamaan diberikan kepada keadaan semasa berdasarkan maklumat web yang terkini.\n"
        "- Sekiranya terdapat percanggahan antara pengetahuan model dan maklumat web yang lebih baharu, utamakan maklumat web yang boleh disahkan.\n\n"
        "Format Output MESTI dalam JSON dengan kunci berikut:\n"
        "1. 'tree': Objek mengandungi sub-key 'leader' (Nama pemimpin itu), 'strategist' (Satu nama Strategist/Teknokrat utama), 'gatekeeper' (Satu nama Political Gatekeeper utama), dan 'communicator' (Satu nama Communications Strategist utama).\n"
        "2. 'full_text': Teks analisis lengkap mengikut format bertanda Markdown/Aesthetic (Gunakan **teks** untuk tebal, __teks__ untuk garis bawah, ==teks== untuk sorotan warna/highlight). Teks ini mesti merangkumi tajuk-tajuk Struktur Analisis asal serta mematuhi semua langkah protokol ini.\n"
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
            max_completion_tokens=1800  # Upgraded parameter for gpt-5.4-mini
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
