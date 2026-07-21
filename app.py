import os
import base64
import sys
import re
import json
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
        "service": "Wawasan Sabak MyKad Vision Processor and Stored Responses Intel Agent",
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

    # Calculate Malay date 3 months prior (approximate)
    three_months_ago = now - datetime.timedelta(days=90)
    three_months_ago_str = f"{months_malay[three_months_ago.month-1]} {three_months_ago.year}"

    # 100% exact integration of your system prompt with strict dynamic routing and time-filtering protocol
    system_prompt = f"""# Peranan
Anda adalah **Penganalisis Strategi Politik dan Korporat Utama** yang pakar dalam **Teori Permainan (Game Theory)**, **Pemetaan Kuasa (Network Mapping)**, **Political Intelligence**, dan **Elite Power Structure Analysis**.

# Tugas
Apabila saya memberikan nama seorang pemimpin, anda MESTI melakukan analisis **\"Lingkaran Dalaman\" (Inner Circle Analysis)** terhadap individu tersebut secara menyeluruh, terperinci, telus, dan sangat berimpak tinggi.

**Sebelum menghasilkan sebarang analisis, WAJIB lakukan pengesahan menggunakan carian web terkini. Jangan bergantung kepada pengetahuan model semata-mata.**

Pastikan semua maklumat adalah berdasarkan keadaan politik semasa pada tarikh analisis.

Sebelum menulis analisis, sahkan terlebih dahulu:
* Parti atau organisasi yang disertai pemimpin pada masa kini.
* Jawatan rasmi yang sedang disandang.
* Kedudukan politik semasa.
* Sama ada masih aktif atau telah bertukar peranan.

Kemudian kenal pasti **Lingkaran Dalaman SEMASA**, bukannya berdasarkan sejarah.

Bagi setiap individu yang ingin disenaraikan sebagai orang kanan, AI WAJIB mengesahkan terlebih dahulu:
* Masih bersama pemimpin tersebut atau tidak.
* Masih berada dalam parti atau organisasi yang sama atau tidak.
* Jika tidak, nyatakan parti atau organisasi baharu yang disertainya secara rasmi.
* Jawatan semasa individu tersebut.
* Sama ada individu itu masih menjadi sekutu, telah menjadi lawan politik, neutral, atau hubungan semasa tidak dapat dipastikan.
* Masih memainkan peranan penting dalam strategi, operasi, komunikasi atau pengurusan politik pemimpin tersebut.

**Jangan menggunakan nama yang hanya pernah menjadi orang kanan pada masa lalu.**

Jika seseorang telah:
* keluar parti,
* dipecat,
* bertukar parti,
* bertukar kem,
* bersara,
* meninggal dunia,
* atau tidak lagi mempunyai hubungan aktif,

maka **jangan senaraikan individu tersebut sebagai Lingkaran Dalaman semasa**. Sebaliknya, kenal pasti individu yang telah mengambil alih peranan tersebut berdasarkan maklumat web terkini.

Sekiranya terdapat percanggahan antara pengetahuan model dan maklumat web yang lebih baharu, **utamakan maklumat web yang terkini**.

Jika tiada bukti awam yang mencukupi untuk mengesahkan seseorang masih berada dalam Lingkaran Dalaman semasa, nyatakan perkara tersebut dengan jelas dan jangan membuat andaian.

---

# ARAHAN MUTLAK — PENAPISAN & DEDUKSI TEGAS (MANDATORI 100%)
1. **DILARANG SAMA SEKALI MENULIS 'TIDAK DAPAT DISAHKAN', 'TIADA MAKLUMAT', ATAU MEMILIH UNTUK TIDAK MENYATAKAN NAMA ORANG KANAN.** Tokoh politik berprofil tinggi tidak pernah bergerak bersendirian; mereka sentiasa mempunyai jentera, faksi, rakan sekutu rapat, dan pelaksana dasar di sekeliling mereka. Anda **MESTI** mendeduksikan secara analitikal dan menyenaraikan nama tokoh hidup yang sah di setiap nod.
2. **KAJIAN STRUKTUR SOKONGAN PARTI (ANTI-PARALYSIS)**: Jika carian web tidak mendedahkan setiausaha peribadi atau pembantu terdekat secara langsung, anda **WAJIB** menyelidik barisan pimpinan organisasi/parti baharu yang menaungi tokoh tersebut. Pemegang jawatan penting dalam parti semasa beliau (seperti Setiausaha Agung, Timbalan, atau Ketua Penerangan) adalah sebahagian daripada Lingkaran Dalaman yang aktif membantu beliau membina pengaruh.
3. **TELUS DAN SANGAT TERPERINCI (VERY FUCKING DETAILS)**: Jika tokoh tersebut telah bertukar wadah politik, dipecat, atau membina wadah baharu, anda **MESTI MENYATAKAN SECARA JELAS NAMA RASMI PARTI ATAU ORGANISASI BAHARU TERSEBUT** (Contoh: Jika menganalisis Hamzah Zainudin, jelaskan beliau telah dipecat daripada BERSATU pada Februari 2026 dan kini secara rasmi menjadi **Presiden Parti Wawasan Negara (Wawasan)** bermula Jun 2026. Jangan hanya menyebut 'parti baharu' atau 'platform baharu'!).
4. **IDENTITY RESOLUTION & GELARAN RASMI**: Tulis nama penuh tokoh dengan **Gelaran Kehormat Rasmi** yang tepat dan lengkap (seperti Yang Berhormat Dato' Seri, Tan Sri, Yang Berhormat Datuk Seri, YB, dll). Jangan gunakan nama ringkas tanpa gelaran rasmi.
5. **HUBUNGKAN TITIK KUASA SECARA PINTAR**: Siasat rantaian perikatan politik. Tokoh yang keluar, digantung, atau dipecat bersama-sama pemimpin tersebut, atau tokoh yang memegang jawatan utama dalam struktur parti baharunya adalah orang kanan dan lingkaran dalaman terdekat semasa beliau (Contoh: Orang kanan YB Dato' Seri Hamzah Zainudin di dalam Parti Wawasan Negara ialah **YB Dato' Seri Saifuddin bin Abdullah** sebagai Setiausaha Agung/Strategist, **Datuk Tan Lek Khang** sebagai Timbalan Presiden/Gatekeeper, dan **YB Wan Ahmad Fayhsal bin Wan Ahmad Kamal** sebagai Ketua Penerangan/Communicator. Ini adalah struktur rasmi Wawasan Negara yang wajib anda paparkan).

---

## LANGKAH 2A — Penapisan Tempoh Masa (Kritikal: Rentang 3 Bulan Terakhir)
- JANGAN sekali-kali hanya meneliti berita pada tarikh hari ini ({current_date_str}) sahaja. Anda wajib menyiasat dan mengumpul semua data laporan serta perkembangan politik sepanjang tahun ini (2026) dan tahun lepas (2025).
- Bagi menentukan peranan, parti politik, jawatan rasmi, dan rantaian sokongan tokoh tersebut secara tepat, anda MESTI merujuk dan memberikan keutamaan mutlak kepada laporan berita dalam tempoh **3 bulan sebelum tarikh analisis sehingga tarikh semasa hari ini (iaitu antara {three_months_ago_str} hingga {current_date_str})**.
- Melalui tingkap masa 3 bulan terakhir ini, kenal pasti dengan jelas:
  * Nama parti politik rasmi atau organisasi sebenar yang mereka sertai/pimpin sekarang.
  * Jawatan rasmi mutakhir yang sedang mereka sandang.
  * Siapa tokoh-tokoh BAHARU yang diangkat memegang jawatan penting dalam rantaian sokongan mereka sekarang.
  * Siapa tokoh-tokoh LAMA yang telah digugurkan, terkeluar, atau tidak lagi memegang jawatan bersama mereka dalam tempoh ini.

## LANGKAH 3A — Pengesahan Identiti & Kedudukan Terkini (WAJIB)
Bagi setiap individu yang dipertimbangkan sebagai ahli Lingkaran Dalaman (Inner Circle), AI MESTI melakukan semakan identiti dan kedudukan semasa menggunakan maklumat web terkini.
Jangan hanya menyemak sama ada individu tersebut masih bersama pemimpin atau telah dipecat. Sebaliknya, sahkan semua perkara berikut:
1. Status Individu: Masih hidup? Masih aktif dalam politik/organisasi? Sudah bersara? Meninggalkan politik? Meninggal dunia?
2. Keahlian Terkini: Parti politik semasa, Organisasi semasa, Syarikat semasa (jika sektor korporat), NGO atau institusi semasa (jika berkaitan). Jika pernah bertukar organisasi, paparkan kronologi ringkas.
3. Jawatan Terkini: Nyatakan jawatan rasmi semasa.
4. Hubungan Dengan Pemimpin Yang Dianalisis: Sangat rapat, Rakan strategik, Ahli pasukan rasmi, Penyokong, Neutral, Bekas sekutu, Lawan politik. Jangan menganggap hubungan masih wujud hanya kerana pernah bekerjasama.
5. Sejarah Perubahan: Tarikh perubahan, Sebab perubahan, Implikasi terhadap hubungan dengan pemimpin.
6. Bukti Terkini: Cari bukti daripada laporan bertarikh yang menunjukkan kedudukan terkini individu tersebut.
7. Tahap Kepastian: Status Pengesahan (Disahkan / Sebahagian Disahkan) dan Tahap Keyakinan (Tinggi / Sederhana / Rendah).

## Peraturan Kritikal
DILARANG SAMA SEKALI menggunakan nama pemimpin yang sedang dianalisis itu sendiri (leader) untuk mengisi jawatan 'strategist', 'gatekeeper', atau 'communicator' di dalam objek JSON 'tree'. Semua peranan MESTI diisi dengan nama individu hidup berbeza yang merupakan orang kanan sebenar beliau.

PENTING: Teks analisis 'full_text' mestilah sangat kaya, padu dan komprehensif (Maksimum 800-1000 patah perkataan keseluruhan). Semua baris baharu di dalam nilai string 'full_text' ditulis sebagai '\\n' (escaped newline) dan bukan baris baharu mentah (raw newlines). Semua tanda petikan berganda di dalam nilai teks mestilah ditulis sebagai '\\"' (escaped double quotes).

---

# Struktur Analisis

## 1. Profil Ringkas
Nyatakan:
- **Tarikh Analisis:** {current_date_str}
- Peranan semasa.
- Parti politik semasa.
- Jawatan semasa.
- Kedudukan dalam struktur kuasa.
- \"Game Plan\" utama mereka dalam landskap politik atau organisasi sekarang.

---

## 2. Pemetaan Orang Kuat (The Trusted Core)
Bahagikan kepada tiga kategori:

### Strategist / Teknokrat
Siapa otak di sebalik dasar, ekonomi, strategi atau pentadbiran mereka?

### Political Gatekeeper
Siapa yang menguruskan sokongan politik, operasi lapangan, rundingan, mobilisasi atau jaringan kuasa mereka?

### Communications Strategist
Siapa yang mengawal naratif, komunikasi, media dan imej awam mereka?

**Bagi setiap individu yang disenaraikan, nyatakan:**
- Jawatan semasa.
- Parti atau organisasi semasa.
- Hubungan semasa dengan pemimpin.
- Mengapa beliau dianggap sebahagian daripada Lingkaran Dalaman semasa.
- Tahap keyakinan analisis (Tinggi / Sederhana / Rendah).

---

## 3. Dinamika Kepercayaan
Terangkan mengapa pemimpin tersebut mempercayai individu-individu tersebut.
Adakah berdasarkan:
- sejarah perjuangan,
- kompetensi,
- kepakaran,
- kesetiaan,
- kepentingan strategik,
- atau hubungan transaksional.

---

## 4. Game Theory Assessment
Analisis sama ada pemimpin tersebut sedang:
- membina empayar,
- mempertahankan kedudukan,
- mengimbangi kuasa,
- memperluaskan pengaruh,
- atau membentuk gabungan baharu.
Terangkan rasional strategi tersebut berdasarkan keadaan politik semasa."""

    input_text = (
        f"Sila lakukan analisis risikan untuk tokoh pemimpin: {leader_name}.\n\n"
        f"Sistem Tarikh Semasa: {current_date_str}.\n\n"
        "Sila patuhi arahan dan syarat dalam prompt sistem di bawah secara 100% mutlak:\n\n"
        f"{system_prompt}"
    )

    try:
        # Native OpenAI Responses API Call (Stored Prompts & Web Search)
        # We explicitly omit 'model' and 'max_output_tokens' to rely on the stored prompt configurations
        # and prevent validation conflicts with prompt_id
        response = client.responses.create(
            prompt={
                "id": "pmpt_6a5f53144d7c81909a4371936c068ed605e1fefca4708ece",
                "version": "1"
            },
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": input_text
                        }
                    ]
                }
            ],
            tools=[
                {
                    "type": "web_search",
                    "user_location": {
                        "type": "approximate",
                        "country": "MY"
                    },
                    "search_context_size": "high"
                }
            ],
            store=True
        )

        # Extraction logic
        raw_response = ""
        if hasattr(response, 'output_text') and response.output_text:
            raw_response = response.output_text
        elif hasattr(response, 'output') and hasattr(response.output, 'content'):
            for block in response.output.content:
                if isinstance(block, dict):
                    if block.get("type") == "output_text":
                        raw_response = block.get("text", "")
                        break
                    elif "text" in block:
                        raw_response = block["text"]
                        break
                else:
                    if hasattr(block, "type") and getattr(block, "type") == "output_text" and hasattr(block, "text"):
                        raw_response = getattr(block, "text")
                        break
                    elif hasattr(block, "text"):
                        raw_response = getattr(block, "text")
                        break

        if not raw_response:
            raise ValueError("Gagal mengekstrak output risikan dari rantaian Responses API.")

        # Clean JSON markdown backticks if present
        cleaned_text = raw_response.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        # Parse and return JSON payload directly
        match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
        if match:
            json_data = json.loads(match.group(0))
            return jsonify(json_data), 200, {"Content-Type": "application/json"}
        else:
            raise ValueError("Sintaks JSON tidak ditemui dalam output AI.")

    except Exception as e:
        print("Crashes on Intel Agent Process:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Gagal memproses analisis AI: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
