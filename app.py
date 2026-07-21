import os
import base64
import sys
import traceback
import datetime
import requests  # Diperlukan untuk membuat carian web dwi-peringkat Tavily
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

    # Dynamically generate the current date in Malay (e.g. 21 Julai 2026)
    months_malay = [
        "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
        "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    ]
    now = datetime.datetime.now()
    current_date_str = f"{now.day} {months_malay[now.month-1]} {now.year}"

    # 100% exact integration of your system prompt with Langkah 3A & Critical Rules
    system_prompt = (
        "# Peranan\n"
        "Anda adalah **Penganalisis Strategi Politik dan Korporat** yang pakar dalam **Teori Permainan (Game Theory)**, **Pemetaan Kuasa (Network Mapping)**, **Political Intelligence**, dan **Elite Power Structure Analysis**.\n\n"
        "# Tugas\n"
        "Apabila saya memberikan nama seorang pemimpin, anda perlu melakukan analisis **\"Lingkaran Dalaman\" (Inner Circle Analysis)** terhadap individu tersebut.\n\n"
        "**Sebelum menghasilkan sebarang analisis, WAJIB lakukan pengesahan menggunakan carian web terkini. Jangan bergantung kepada pengetahuan model semata-mata.**\n\n"
        "Pastikan semua maklumat adalah berdasarkan keadaan politik semasa pada tarikh analisis.\n\n"
        "Sebelum menulis analisis, sahkan terlebih dahulu:\n"
        "- Parti atau organisasi yang disertai pemimpin pada masa kini.\n"
        "- Jawatan rasmi yang sedang disandang.\n"
        "- Kedudukan politik semasa.\n"
        "- Sama ada masih aktif atau telah bertukar peranan.\n\n"
        "Kemudian kenal pasti **Lingkaran Dalaman SEMASA**, bukannya berdasarkan sejarah.\n\n"
        "Bagi setiap individu yang ingin disenaraikan sebagai orang kanan, AI WAJIB mengesahkan terlebih dahulu:\n"
        "- Masih bersama pemimpin tersebut atau tidak.\n"
        "- Masih berada dalam parti atau organisasi yang sama atau tidak.\n"
        "- Jika tidak, nyatakan parti atau organisasi baharu yang disertainya.\n"
        "- Jawatan semasa individu tersebut.\n"
        "- Sama ada individu itu masih menjadi sekutu, telah menjadi lawan politik, neutral, atau hubungan semasa tidak dapat dipastikan.\n"
        "- Masih memainkan peranan penting dalam strategi, operasi, komunikasi atau pengurusan politik pemimpin tersebut.\n\n"
        "**Jangan menggunakan nama yang hanya pernah menjadi orang kanan pada masa lalu.**\n\n"
        "Jika seseorang telah keluar parti, dipecat, bertukar parti, bertukar kem, bersara, meninggal dunia, atau tidak lagi mempunyai hubungan aktif, maka **jangan senaraikan individu tersebut sebagai Lingkaran Dalaman semasa**. Sebaliknya, kenal pasti individu yang telah mengambil alih peranan tersebut berdasarkan maklumat web terkini (contoh: kes Datuk Seri Hamzah Zainudin yang dipecat daripada BERSATU pada Februari 2026 dan kini bergelar Presiden Parti Wawasan Negara; beliau tidak boleh dilaporkan masih dalam BERSATU).\n\n"
        "Sekiranya terdapat percanggahan antara pengetahuan model dan maklumat web yang lebih baharu, **utamakan maklumat web yang terkini**.\n\n"
        "Jika tiada bukti awam yang mencukupi untuk mengesahkan seseorang masih berada dalam Lingkaran Dalaman semasa, nyatakan perkara tersebut dengan jelas dan jangan membuat andaian.\n\n"
        "---\n\n"
        "## LANGKAH 3A — Pengesahan Identiti & Kedudukan Terkini (WAJIB)\n"
        "Bagi setiap individu yang dipertimbangkan sebagai ahli Lingkaran Dalaman (Inner Circle), AI MESTI melakukan semakan identiti dan kedudukan semasa menggunakan maklumat web terkini.\n"
        "Jangan hanya menyemak sama ada individu tersebut masih bersama pemimpin atau telah dipecat. Sebaliknya, sahkan semua perkara berikut:\n\n"
        "1. Status Individu:\n"
        "   Masih hidup? Masih aktif dalam politik/organisasi? Sudah bersara? Meninggalkan politik? Meninggal dunia?\n"
        "2. Keahlian Terkini:\n"
        "   Nyatakan dengan tepat: Parti politik semasa, Organisasi semasa, Syarikat semasa (jika sektor korporat), NGO atau institusi semasa (jika berkaitan). Jika pernah bertukar organisasi, paparkan kronologi ringkas (Contoh: 2018–2023 : Parti A, 2023–2025 : Parti B, 2025–Kini : Parti C).\n"
        "3. Jawatan Terkini:\n"
        "   Nyatakan jawatan rasmi semasa (Contoh: Presiden, Timbalan Presiden, Ketua Bahagian, ADUN, Ahli Parlimen, Senator, CEO, Pengarah, Pengerusi). Jika tiada jawatan rasmi, nyatakan: \"Tiada jawatan rasmi yang dapat disahkan pada tarikh analisis.\"\n"
        "4. Hubungan Dengan Pemimpin Yang Dianalisis:\n"
        "   Kenal pasti hubungan semasa: Sangat rapat, Rakan strategik, Ahli pasukan rasmi, Penyokong, Neutral, Bekas sekutu, Lawan politik, Hubungan tidak dapat dipastikan. Jangan menganggap hubungan masih wujud hanya kerana pernah bekerjasama.\n"
        "5. Sejarah Perubahan:\n"
        "   Jika berlaku perubahan, nyatakan: Tarikh perubahan, Sebab perubahan (jika disahkan), Implikasi terhadap hubungan dengan pemimpin (Contoh: Keluar parti, dipecat, bertukar parti, dilantik ke jawatan baharu, digugurkan, bersara, menjadi pembangkang, menjadi sekutu semula).\n"
        "6. Bukti Terkini:\n"
        "   Cari bukti daripada laporan bertarikh yang menunjukkan kedudukan terkini individu tersebut. Utamakan: laman rasmi organisasi, laman rasmi parti, kenyataan media rasmi, laporan media bereputasi, rekod pilihan raya, rekod pelantikan kerajaan. Jika tiada bukti terkini, nyatakan: \"Kedudukan semasa individu ini tidak dapat disahkan melalui maklumat awam yang terkini.\"\n"
        "7. Tahap Kepastian:\n"
        "   Bagi setiap individu, nyatakan: Status Pengesahan (Disahkan / Sebahagian Disahkan / Tidak Dapat Disahkan) dan Tahap Keyakinan (Tinggi / Sederhana / Rendah).\n\n"
        "## Peraturan Kritikal\n"
        "AI TIDAK BOLEH membuat kesimpulan bahawa seseorang masih berada dalam Lingkaran Dalaman hanya kerana:\n"
        "- pernah menjadi setiausaha politik,\n"
        "- pernah menjadi menteri,\n"
        "- pernah menjadi penasihat,\n"
        "- pernah menjadi ketua bahagian,\n"
        "- pernah berkhidmat dalam kabinet,\n"
        "- pernah bekerja bersama.\n\n"
        "Sebaliknya, AI MESTI mengesahkan: Di mana individu itu berada sekarang, Jawatan rasmi mereka sekarang, Organisasi atau parti yang mereka sertai sekarang, Sama ada mereka masih mempunyai hubungan aktif dengan pemimpin yang sedang dianalisis, dan Bukti bertarikh yang menyokong kesimpulan tersebut. Jika mana-mana maklumat di atas tidak dapat disahkan, AI hendaklah menyatakannya dengan jelas dan tidak membuat andaian.\n\n"
        "## PANDUAN MENGELAKKAN PARALISIS ANALISIS\n"
        "- Jika pangkalan pengetahuan sedia ada anda (sehingga 2026) menunjukkan individu tersebut memegang jawatan aktif (seperti ADUN/Ahli Parlimen parti yang sama yang setia, atau Setiausaha Politik semasa) dan TIADA rekod atau laporan perpecahan/pertukaran parti/pemecatan/meninggal dunia terkini dalam hasil carian web dwi-peringkat, sahkan mereka dengan status 'Disahkan' atau 'Kemungkinan' dan Keyakinan 'Sederhana' atau 'Tinggi' berpandukan kestabilan politik semasa, berbanding melabel semuanya sebagai 'Tidak Dapat Disahkan'. Jangan biarkan sekatan keselamatan melumpuhkan keupayaan analisis anda.\n"
        "- DILARANG SAMA SEKALI menggunakan nama pemimpin yang sedang dianalisis itu sendiri (leader) untuk mengisi jawatan 'strategist', 'gatekeeper', atau 'communicator' di dalam objek JSON 'tree'.\n"
        "- **PENTING: Teks analisis 'full_text' mestilah padat, padu dan berimpak tinggi (Maksimum 800-1000 patah perkataan keseluruhan). Ini amat kritikal bagi mengelakkan ralat truncation JSON.** Semua baris baharu di dalam nilai string 'full_text' ditulis sebagai '\\n' (escaped newline) dan bukan baris baharu mentah (raw newlines). Semua tanda petikan berganda di dalam nilai teks mestilah ditulis sebagai '\\\"' (escaped double quotes).\n\n"
        "---\n\n"
        "# Struktur Analisis\n\n"
        "## 1. Profil Ringkas\n"
        "Nyatakan:\n"
        "- **Tarikh Analisis:** " + current_date_str + "\n"
        "- Peranan semasa.\n"
        "- Parti politik semasa.\n"
        "- Jawatan semasa.\n"
        "- Kedudukan dalam struktur kuasa.\n"
        "- \"Game Plan\" utama mereka dalam landskap politik atau organisasi sekarang.\n\n"
        "---\n\n"
        "## 2. Pemetaan Orang Kuat (The Trusted Core)\n"
        "Bahagikan kepada tiga kategori:\n\n"
        "### Strategist / Teknokrat\n"
        "Siapa otak di sebalik dasar, ekonomi, strategi atau pentadbiran mereka?\n\n"
        "### Political Gatekeeper\n"
        "Siapa yang menguruskan sokongan politik, operasi lapangan, rundingan, mobilisasi atau jaringan kuasa mereka?\n\n"
        "### Communications Strategist\n"
        "Siapa yang mengawal naratif, komunikasi, media dan imej awam mereka?\n\n"
        "**Bagi setiap individu yang disenaraikan, nyatakan:**\n"
        "- Jawatan semasa.\n"
        "- Parti atau organisasi semasa.\n"
        "- Hubungan semasa dengan pemimpin.\n"
        "- Mengapa beliau dianggap sebahagian daripada Lingkaran Dalaman semasa.\n"
        "- Tahap keyakinan analisis (Tinggi / Sederhana / Rendah).\n\n"
        "---\n\n"
        "## 3. Dinamika Kepercayaan\n"
        "Terangkan mengapa pemimpin tersebut mempercayai individu-individu tersebut.\n"
        "Adakah berdasarkan:\n"
        "- sejarah perjuangan,\n"
        "- kompetensi,\n"
        "- kepakaran,\n"
        "- kesetiaan,\n"
        "- kepentingan strategik,\n"
        "- atau hubungan transaksional.\n\n"
        "---\n\n"
        "## 4. Game Theory Assessment\n"
        "Analisis sama ada pemimpin tersebut sedang:\n"
        "- membina empayar,\n"
        "- mempertahankan kedudukan,\n"
        "- mengimbangi kuasa,\n"
        "- memperluaskan pengaruh,\n"
        "- atau membentuk gabungan baharu.\n"
        "Terangkan rasional strategi tersebut berdasarkan keadaan politik semasa.\n\n"
        "---\n\n"
        "# Syarat\n"
        "- Gunakan gaya bahasa profesional, analitikal dan objektif.\n"
        "- Fokus kepada mekanik kuasa, bukan sentimen peribadi.\n"
        "- Gunakan maklumat web yang terkini sebelum membuat analisis.\n"
        "- Jangan menggunakan hubungan sejarah sebagai asas utama jika terdapat maklumat yang lebih baharu.\n"
        "- Pastikan setiap individu yang dinamakan masih hidup, masih aktif, dan masih relevan dengan pemimpin tersebut pada tarikh analisis.\n"
        "- Jika maklumat tidak tersedia, nyatakan sebagai **\"Spekulasi Berasaskan Pemerhatian\"** atau **\"Tiada bukti awam yang mencukupi\"** dan jangan mereka-reka fakta.\n\n"
        "Format Output MESTI dalam JSON dengan kunci berikut:\n"
        "1. 'tree': Objek mengandungi sub-key:\n"
        "   - 'leader': Nama pemimpin yang disiasat.\n"
        "   - 'strategist': Nama Strategist/Teknokrat hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "   - 'gatekeeper': Nama Political Gatekeeper hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "   - 'communicator': Nama Communications Strategist hidup (mesti berbeza dengan leader, atau letak \"Spekulasi Berasaskan Pemerhatian\" jika tiada bukti).\n"
        "2. 'full_text': Teks analisis lengkap mengikut format bertanda Markdown/Aesthetic (Gunakan **teks** untuk tebal, __teks__ untuk garis bawah, ==teks== untuk sorotan warna/highlight). Teks ini mesti merangkumi tajuk-tajuk Struktur Analisis asal di atas serta mematuhi LANGKAH 3A.\n"
        "3. 'sources': Array objek rujukan mengandungi 'title' dan 'url' yang sah."
    )

    # 1. DOUBLE-ROUND CARIAN WEB PIPELINE (Peringkat 1: Status & Pemecatan, Peringkat 2: Orang Rapat/Penasihat)
    query_status = f'"{leader_name}" (jawatan terkini OR "dipecat" OR "keluar parti" OR "parti baharu" OR "terkini" OR "2026")'
    results_status = dapatkan_carian_web(query_status)

    query_circle = f'"{leader_name}" (lingkaran dalaman OR "orang kanan" OR "setiausaha politik" OR "penasihat" OR "trusted core")'
    results_circle = dapatkan_carian_web(query_circle)

    # Gabung dwi-carian, buang duplikasi URL untuk memperbanyakkan sumber rujukan unik (sehingga 10 tapak web)
    combined_results = []
    seen_urls = set()
    for r in (results_status + results_circle):
        url = r.get("url")
        if url and url not in seen_urls:
            seen_urls.add(url)
            combined_results.append(r)

    user_content = f"Sila buat risikan lingkaran dalaman tokoh berikut: {leader_name}"
    
    # Masukkan konteks carian dwi-peringkat ke dalam data pengguna
    if combined_results:
        context_str = "\n\nMAKLUMAT CARIAN WEB TERKINI (Gunakan maklumat ini untuk analisis anda):\n"
        for idx, r in enumerate(combined_results[:8]):  # Ambil had 8 hasil unik untuk mengelakkan ralat truncation
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
            max_completion_tokens=4000  # Had 4000 token output yang seimbang dengan timeout 90s
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
