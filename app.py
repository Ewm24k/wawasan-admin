import os
import base64
import sys
import traceback
import datetime
import requests  # Diperlukan untuk membuat carian web Tavily
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

# Ambil Tavily API Key dari persekitaran Render
tavily_key = os.environ.get("TAVILY_API_KEY")


def dapatkan_carian_web(query_text):
    """
    Membuat carian web masa nyata menggunakan Tavily Search API.
    Memberikan 1,000 carian percuma setiap bulan.
    """
    if not tavily_key:
        print("Tavily API Key tiada. Carian internet dilangkau.", file=sys.stderr)
        return []
    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": tavily_key,
            "query": query_text,
            "search_depth": "basic",  # Menggunakan mod basic (1 kredit) untuk penjimatan maksimum
            "max_results": 5
        }
        res = requests.post(url, json=payload, timeout=8)
        if res.ok:
            return res.json().get("results", [])
    except Exception as e:
        print(f"Carian Tavily Gagal: {str(e)}", file=sys.stderr)
    return []


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "running", 
        "service": "Wawasan Sabak MyKad Vision Processor and Intel Agent",
        "api_configured": client is not None,
        "tavily_configured": tavily_key is not None
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
            "- 'birthplace': Identify the State of birth (e.g., SELANGOR, PERAK, KUALA LUMPUR) based on MyKad birth codes if available, else leave as blank string."
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

    # 100% exact integration of your strict 6-step prompt protocol with absolute controls against hallucination
    system_prompt = (
        "Peranan: Anda adalah Penganalisis Strategi Politik dan Korporat yang pakar dalam Teori Permainan (Game Theory) dan Pemetaan Kuasa (Network Mapping).\n"
        "Tugas: Apabila saya memberikan nama seorang pemimpin, anda perlu melakukan analisis \"Lingkaran Dalaman\" (Inner Circle Analysis) terhadap individu tersebut.\n\n"
        "# PROTOKOL WAJIB SEBELUM MEMULAKAN ANALISIS\n"
        "JANGAN terus menjawab menggunakan pengetahuan dalaman model sahaja tanpa penapisan ketat.\n"
        "Sebelum menghasilkan sebarang analisis, AI MESTI melalui proses pengesahan berikut.\n\n"
        "## Langkah 1 — Semak Tarikh Semasa\n"
        f"Tarikh semasa sistem adalah {current_date_str}. Anda wajib meletakkan tarikh ini di bahagian paling atas teks analisis Anda:\n"
        f"**Tarikh Analisis:** {current_date_str}\n"
        "Semua analisis hendaklah berpandukan keadaan politik pada tarikh tersebut.\n\n"
        "## Langkah 2 — Carian Web Terkini (WAJIB)\n"
        "Lakukan carian web atau pengesahan maklumat terkini terlebih dahulu. Utamakan sumber rasmi atau sumber media yang bereputasi seperti laman rasmi parti, laman rasmi kerajaan, kenyataan media rasmi, Bernama, The Star, New Straits Times, Malaysiakini, Free Malaysia Today, Sinar Harian, Astro Awani, Harian Metro, Utusan, atau The Edge.\n"
        "JANGAN bergantung kepada data latihan model sahaja.\n\n"
        "## Langkah 3 — Pengesahan Individu (TRIPLE CHECK)\n"
        "Sebelum menyenaraikan mana-mana individu sebagai orang kanan pemimpin dalam objek 'tree' mahupun dalam teks 'full_text', SEMAK perkara berikut secara teliti:\n"
        "✓ Adakah individu tersebut masih hidup?\n"
        "✓ Adakah beliau masih berada dalam parti yang sama dengan pemimpin tersebut?\n"
        "✓ Adakah beliau masih memegang jawatan tersebut dan menyokong pemimpin tersebut?\n"
        "✓ Adakah beliau telah berpindah parti / dipecat / meletakkan jawatan?\n"
        "✓ Adakah hubungan mereka masih aktif dan relevan berdasarkan laporan terkini pada tahun 2026?\n"
        "Jika jawapan kepada mana-mana semakan di atas ialah \"tidak\" ATAU tiada bukti kukuh, JANGAN senaraikan individu tersebut.\n\n"
        "## Langkah 4 — Pengesahan Hubungan\n"
        "Jangan menganggap seseorang masih menjadi orang kanan hanya kerana mereka pernah bekerja bersama atau rapat di masa lalu. Pastikan terdapat bukti terkini (mesyuarat, kenyataan media, pelantikan, kempen, sidang media, atau laporan media dalam tempoh munasabah).\n"
        "Jika tiada bukti terkini untuk menyokong nama orang kanan semasa, nyatakan:\n"
        "\"Tiada bukti awam yang mencukupi untuk mengesahkan bahawa individu ini masih berada dalam lingkaran dalaman.\"\n"
        "dan isikan nama jawatan tersebut dalam JSON 'tree' dengan nilai \"Spekulasi Berasaskan Pemerhatian\" atau \"Tiada Bukti Awam\".\n\n"
        "## Langkah 5 — Tahap Keyakinan\n"
        "Bagi setiap individu yang disenaraikan, nyatakan secara spesifik:\n"
        "Status: Disahkan / Kemungkinan / Spekulasi Berasaskan Pemerhatian\n"
        "Keyakinan: Tinggi / Sederhana / Rendah\n\n"
        "## Langkah 6 — Sumber\n"
        "Selepas setiap nama individu, nyatakan sumber yang menyokong penilaian tersebut serta tarikh penerbitan laporan.\n\n"
        "## Polisi Ketepatan Tegas (JANGAN HALUSINASI)\n"
        "- DILARANG SAMA SEKALI menggunakan nama pemimpin yang sedang dianalisis itu sendiri (leader) untuk mengisi jawatan 'strategist', 'gatekeeper', atau 'communicator' di dalam objek JSON 'tree'.\n"
        "- Elakkan menyenaraikan bekas setiausaha politik, bekas menteri, bekas penasihat, individu yang telah meninggal dunia, individu yang telah keluar parti, atau individu yang tidak lagi rapat dengan pemimpin.\n"
        "- Jika carian web tidak menemui mana-mana individu hidup yang memegang jawatan tersebut secara aktif di bawah pemimpin ini sekarang, anda MESTI meletakkan nilai \"Spekulasi Berasaskan Pemerhatian\" atau \"Tiada Bukti Awam\" di dalam key 'tree' tersebut. JANGAN reka nama atau menggunakan nama sejarah lama.\n"
        "- Keutamaan diberikan kepada keadaan semasa berdasarkan maklumat web yang terkini.\n\n"
        "PENTING: Teks analisis hendaklah padat, ringkas, dan berkualiti tinggi. Output mesti berupa JSON yang sah. Sila pastikan semua baris baharu di dalam nilai string 'full_text' ditulis sebagai '\\n' (escaped newline) dan bukan baris baharu mentah (raw newlines). Semua tanda petikan berganda di dalam nilai teks mestilah ditulis sebagai '\\\"' (escaped double quotes) bagi mengelakkan kegagalan parsing JSON.\n\n"
        "Format Output MESTI dalam JSON dengan kunci berikut:\n"
        "1. 'tree': Objek mengandungi sub-key:\n"
        "   - 'leader': Nama pemimpin yang disiasat.\n"
        "   - 'strategist': Nama Strategist/Teknokrat hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "   - 'gatekeeper': Nama Political Gatekeeper hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "   - 'communicator': Nama Communications Strategist hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "2. 'full_text': Teks analisis lengkap mengikut format bertanda Markdown/Aesthetic (Gunakan **teks** untuk tebal, __teks__ untuk garis bawah, ==teks== untuk sorotan warna/highlight). Teks ini mesti merangkumi tajuk-tajuk Struktur Analisis asal serta mematuhi semua langkah protokol ini.\n"
        "3. 'sources': Array objek rujukan mengandungi 'title' dan 'url' yang sah."
    )

    # Kueri Boolean terarah untuk mengumpul rujukan jawatan orang kanan pemimpin secara spesifik
    search_query = f'"{leader_name}" (lingkaran dalaman OR "orang kanan" OR "setiausaha politik" OR "penasihat" OR "trusted core")'
    results = dapatkan_carian_web(search_query)

    user_content = f"Sila buat risikan lingkaran dalaman tokoh berikut: {leader_name}"
    
    # Jika carian web berjaya, bersihkan dan masukkan hasil carian sebagai konteks
    if results:
        context_str = "\n\nMAKLUMAT CARIAN WEB TERKINI (Gunakan maklumat ini untuk analisis anda):\n"
        for idx, r in enumerate(results):
            snippet = r.get('content', '')
            if len(snippet) > 300:
                snippet = snippet[:300] + "..."
            
            clean_title = r.get('title', '').replace('"', "'").replace('\n', ' ')
            clean_snippet = snippet.replace('"', "'").replace('\n', ' ')
            
            context_str += f"Sumber [{idx+1}]: {clean_title}\nURL: {r.get('url')}\nKandungan: {clean_snippet}\n\n"
        user_content += context_str

    try:
        response = client.chat.completions.create(
            model="gpt-5.4-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            max_completion_tokens=2000  # Had 2000 token output yang seimbang
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
