/* ============================================================
   Admin Dashboard — main logic
   ============================================================ */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, where, serverTimestamp, Timestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Auth guard ---------- */
var loadingEl = document.getElementById("dashLoading");
var loadingTextEl = document.getElementById("dashLoadingText");
var rootEl = document.getElementById("dashRoot");
var liveDot = document.getElementById("liveDot");
var liveDotLabel = document.getElementById("liveDotLabel");

function setLive(isLive) {
  liveDot.classList.toggle("is-offline", !isLive);
  liveDotLabel.textContent = isLive ? "Live" : "Terputus";
}

onAuthStateChanged(auth, async function (user) {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  try {
    var adminSnap = await getDoc(doc(db, "admins", user.uid));
    if (!adminSnap.exists()) {
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
  } catch (e) {
    // Rules will block a non-admin from reading anything anyway —
    // if this check itself fails, safest is to bounce to login.
    window.location.href = "index.html";
    return;
  }

  loadingTextEl.textContent = "Menyegerakkan data...";
  initDashboard();
});

document.getElementById("signOutBtn").addEventListener("click", async function () {
  await signOut(auth);
  window.location.href = "index.html";
});

/* ---------- Sidebar collapse + nav switching ---------- */
var sidebar = document.getElementById("dashSidebar");
document.getElementById("sidebarCollapseBtn").addEventListener("click", function () {
  sidebar.classList.toggle("is-collapsed");
});

var navItems = document.querySelectorAll(".dash__nav-item");
var panels = document.querySelectorAll(".dash__panel");
var topbarTitle = document.getElementById("topbarTitle");
var PANEL_TITLES = {
  panelMembers: "Ahli & Keahlian",
  panelPunch: "Pendaftaran Kehadiran",
  panelStats: "Statistik"
};
navItems.forEach(function (item) {
  item.addEventListener("click", function () {
    navItems.forEach(function (i) { i.classList.remove("is-active"); });
    item.classList.add("is-active");
    var targetId = item.getAttribute("data-panel");
    panels.forEach(function (p) { p.classList.toggle("is-active", p.id === targetId); });
    topbarTitle.textContent = PANEL_TITLES[targetId] || "";
  });
});

/* ============================================================
   Shared in-memory state, populated by the live registrations
   listener below and read by every panel.
   ============================================================ */
var allRegistrations = []; // [{ id, fullName, icNumber, phone, email, mukim, joinAs, tier, memberId, submittedAt, ... }]
var currentTier = "ahli";
var currentSearch = "";

function normalizeTier(reg) {
  return reg.tier === "ajk" || reg.tier === "vip" ? reg.tier : "ahli";
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  var d = ts instanceof Timestamp ? ts.toDate() : (ts.toDate ? ts.toDate() : null);
  if (!d) return "—";
  var months = ["Jan","Feb","Mac","Apr","Mei","Jun","Jul","Ogo","Sep","Okt","Nov","Dis"];
  var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* ---------- Member list rendering ---------- */
var memberListEl = document.getElementById("memberList");
var countEls = { ahli: document.getElementById("countAhli"), ajk: document.getElementById("countAjk"), vip: document.getElementById("countVip") };

function renderMemberCounts() {
  var counts = { ahli: 0, ajk: 0, vip: 0 };
  allRegistrations.forEach(function (r) { counts[normalizeTier(r)]++; });
  countEls.ahli.textContent = counts.ahli;
  countEls.ajk.textContent = counts.ajk;
  countEls.vip.textContent = counts.vip;
}

function matchesSearch(reg, term) {
  if (!term) return true;
  term = term.toLowerCase();
  return (
    (reg.memberId || "").toLowerCase().indexOf(term) > -1 ||
    (reg.icNumber || "").toLowerCase().indexOf(term) > -1 ||
    (reg.fullName || "").toLowerCase().indexOf(term) > -1 ||
    (reg.email || "").toLowerCase().indexOf(term) > -1
  );
}

var TIER_LABEL = { ahli: "Ahli", ajk: "AJK", vip: "VIP" };

function renderMemberList() {
  var filtered = allRegistrations.filter(function (r) {
    return normalizeTier(r) === currentTier && matchesSearch(r, currentSearch);
  });

  if (filtered.length === 0) {
    memberListEl.innerHTML = '<p class="empty-state">Tiada rekod ditemui.</p>';
    return;
  }

  memberListEl.innerHTML = filtered.map(function (r) {
    var tier = normalizeTier(r);
    return (
      '<div class="member-row" data-id="' + r.id + '">' +
        '<div class="member-row__head">' +
          '<span class="badge badge--' + tier + '">' + TIER_LABEL[tier] + '</span>' +
          '<span class="member-row__name">' + escapeHtml(r.fullName || "—") + '</span>' +
          '<span class="member-row__id">' + escapeHtml(r.memberId || "—") + '</span>' +
          '<span class="member-row__meta">' + formatTimestamp(r.submittedAt) + '</span>' +
          '<svg class="member-row__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</div>' +
        '<div class="member-row__body">' +
          '<div class="detail-grid">' +
            detailItem("No. Kad Pengenalan", r.icNumber) +
            detailItem("Jantina", formatGender(r.gender)) +
            detailItem("Tarikh Lahir", formatDob(r.dob)) +
            detailItem("Tempat Lahir", r.birthplace) +
            detailItem("Pekerjaan", r.occupation) +
            detailItem("Nama dan Alamat Majikan", r.employer) +
            detailItem("No. Telefon", r.phone) +
            detailItem("No. Telefon Kedua", r.phone2) +
            detailItem("E-mel", r.email) +
            detailItem("Alamat Kediaman", r.address) +
            detailItem("Mukim / Kawasan (Borang Awam)", r.mukim) +
            detailItem("Cawangan Dipohon (PDM)", r.cawangan) +
            detailItem("Daftar Sebagai", r.joinAs) +
            detailItem("Mesej", r.message) +
          '</div>' +
          '<div class="tier-actions" data-doc-id="' + r.id + '">' +
            tierButton(r.id, "ahli", tier) +
            tierButton(r.id, "ajk", tier) +
            tierButton(r.id, "vip", tier) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join("");

  memberListEl.querySelectorAll(".member-row__head").forEach(function (head) {
    head.addEventListener("click", function () {
      head.parentElement.classList.toggle("is-open");
    });
  });

  memberListEl.querySelectorAll(".tier-btn:not(.is-current)").forEach(function (btn) {
    btn.addEventListener("click", async function (e) {
      e.stopPropagation();
      var docId = btn.getAttribute("data-doc-id");
      var newTier = btn.getAttribute("data-tier");
      try {
        await updateDoc(doc(db, "registrations", docId), { tier: newTier });
      } catch (err) {
        alert("Gagal mengemas kini tier: " + (err && err.message ? err.message : err));
      }
    });
  });
}

function detailItem(label, value) {
  return '<div class="detail-item"><span class="k">' + escapeHtml(label) + '</span><span class="v">' + escapeHtml(value || "—") + '</span></div>';
}
function formatGender(g) {
  if (g === "lelaki") return "Lelaki";
  if (g === "perempuan") return "Perempuan";
  return "";
}
function formatDob(dobStr) {
  // dobStr is stored as "YYYY-MM-DD" (from the admin add-member form's
  // day/month/year dropdowns). Older registrations from the public
  // form don't have this field at all — returns "" so detailItem()
  // falls back to its own "—" display.
  if (!dobStr || typeof dobStr !== "string") return "";
  var parts = dobStr.split("-");
  if (parts.length !== 3) return dobStr;
  var year = parseInt(parts[0], 10), month = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
  if (!year || !month || !day) return dobStr;
  return day + " " + MALAY_MONTHS_FULL[month - 1] + " " + year;
}
function tierButton(docId, tier, currentTierValue) {
  var isCurrent = tier === currentTierValue;
  return '<button class="tier-btn' + (isCurrent ? ' is-current' : '') + '" data-doc-id="' + docId + '" data-tier="' + tier + '" ' + (isCurrent ? 'disabled' : '') + '>' +
    (isCurrent ? '✓ ' : 'Jadikan ') + TIER_LABEL[tier] +
  '</button>';
}
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

document.querySelectorAll(".member-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".member-tab").forEach(function (t) { t.classList.remove("is-active"); });
    tab.classList.add("is-active");
    currentTier = tab.getAttribute("data-tier");
    renderMemberList();
  });
});
document.getElementById("memberSearch").addEventListener("input", function (e) {
  currentSearch = e.target.value.trim();
  renderMemberList();
});

/* ============================================================
   Statistics
   ============================================================ */
function renderStats() {
  var total = allRegistrations.length;
  var counts = { ahli: 0, ajk: 0, vip: 0 };
  allRegistrations.forEach(function (r) { counts[normalizeTier(r)]++; });

  document.getElementById("statTotal").textContent = total;
  ["ahli", "ajk", "vip"].forEach(function (tier) {
    var pct = total > 0 ? Math.round((counts[tier] / total) * 100) : 0;
    document.getElementById("stat" + capitalize(tier) + "Pct").textContent = pct + "%";
    document.getElementById("stat" + capitalize(tier) + "Count").textContent = counts[tier] + " orang";
  });

  var now = new Date();
  var thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var lastMonthEnd = thisMonthStart;

  var thisMonthCount = 0, lastMonthCount = 0;
  allRegistrations.forEach(function (r) {
    var d = r.submittedAt && r.submittedAt.toDate ? r.submittedAt.toDate() : null;
    if (!d) return;
    if (d >= thisMonthStart) thisMonthCount++;
    else if (d >= lastMonthStart && d < lastMonthEnd) lastMonthCount++;
  });

  document.getElementById("statMonthCount").textContent = thisMonthCount;
  var changeEl = document.getElementById("statMonthChange");
  if (lastMonthCount === 0) {
    changeEl.textContent = thisMonthCount > 0 ? "Tiada data bulan lepas untuk dibandingkan" : "—";
    changeEl.className = "sub";
  } else {
    var change = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    changeEl.textContent = (change >= 0 ? "▲ " : "▼ ") + Math.abs(change) + "% berbanding bulan lepas (" + lastMonthCount + ")";
    changeEl.className = "sub " + (change >= 0 ? "up" : "down");
  }
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ============================================================
   Punch card / attendance
   ============================================================ */
var eventSelect = document.getElementById("eventSelect");
var allEvents = [];
var selectedEventId = "";
var attendeesForEvent = [];
var unsubscribeAttendance = null;

onSnapshotSafe(query(collection(db, "events"), orderBy("createdAt", "desc")), function (snap) {
  allEvents = [];
  snap.forEach(function (d) { allEvents.push(Object.assign({ id: d.id }, d.data())); });
  var prevValue = eventSelect.value;
  eventSelect.innerHTML = '<option value="">— Pilih acara —</option>' + allEvents.map(function (ev) {
    return '<option value="' + ev.id + '">' + escapeHtml(ev.title || ev.topic || "Acara") + ' — ' + escapeHtml(ev.dateTime || "") + '</option>';
  }).join("");
  if (prevValue && allEvents.some(function (ev) { return ev.id === prevValue; })) {
    eventSelect.value = prevValue;
  }
});

eventSelect.addEventListener("change", function () {
  selectedEventId = eventSelect.value;
  var ev = allEvents.find(function (e) { return e.id === selectedEventId; });
  if (ev) {
    document.getElementById("reportTopic").value = ev.topic || "";
    document.getElementById("reportTitle").value = ev.title || "";
    document.getElementById("reportLocation").value = ev.location || "";
    document.getElementById("reportDateTime").value = ev.dateTime || "";
    document.getElementById("reportHandledBy").value = ev.handledBy || "";
  }
  subscribeAttendance();
});

document.getElementById("newEventBtn").addEventListener("click", function () {
  eventSelect.value = "";
  selectedEventId = "";
  ["reportTopic", "reportTitle", "reportLocation", "reportDateTime", "reportHandledBy"].forEach(function (id) {
    document.getElementById(id).value = "";
  });
  document.getElementById("reportTopic").focus();
  subscribeAttendance();
});

document.getElementById("createEventBtn").addEventListener("click", async function () {
  var topic = document.getElementById("reportTopic").value.trim();
  var title = document.getElementById("reportTitle").value.trim();
  var location = document.getElementById("reportLocation").value.trim();
  var dateTime = document.getElementById("reportDateTime").value.trim();
  var handledBy = document.getElementById("reportHandledBy").value.trim();

  if (!title) {
    alert("Sila isikan sekurang-kurangnya Tajuk acara.");
    return;
  }

  try {
    var ref = await addDoc(collection(db, "events"), {
      topic: topic, title: title, location: location, dateTime: dateTime, handledBy: handledBy,
      createdAt: serverTimestamp()
    });
    selectedEventId = ref.id;
    // onSnapshot above will repopulate the <select>; set value once it does.
    setTimeout(function () { eventSelect.value = ref.id; subscribeAttendance(); }, 400);
  } catch (err) {
    alert("Gagal mencipta acara: " + (err && err.message ? err.message : err));
  }
});

function subscribeAttendance() {
  if (unsubscribeAttendance) { unsubscribeAttendance(); unsubscribeAttendance = null; }
  var tbody = document.getElementById("attendeeTableBody");
  var emptyEl = document.getElementById("attendeeEmpty");
  var countEl = document.getElementById("attendeeCount");

  if (!selectedEventId) {
    attendeesForEvent = [];
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    countEl.textContent = "";
    return;
  }

  unsubscribeAttendance = onSnapshotSafe(
    query(collection(db, "attendance"), where("eventId", "==", selectedEventId), orderBy("timestamp", "desc")),
    function (snap) {
      attendeesForEvent = [];
      snap.forEach(function (d) { attendeesForEvent.push(Object.assign({ id: d.id }, d.data())); });
      countEl.textContent = "(" + attendeesForEvent.length + ")";
      if (attendeesForEvent.length === 0) {
        tbody.innerHTML = "";
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";
      tbody.innerHTML = attendeesForEvent.map(function (a) {
        return "<tr><td>" + escapeHtml(a.fullName) + "</td><td>" + escapeHtml(a.memberId) + "</td><td>" + formatTimestamp(a.timestamp) + "</td></tr>";
      }).join("");
    }
  );
}

document.getElementById("checkinBtn").addEventListener("click", async function () {
  var resultEl = document.getElementById("checkinResult");
  resultEl.className = "checkin-result";
  var term = document.getElementById("checkinInput").value.trim();

  if (!selectedEventId) {
    resultEl.textContent = "Sila pilih acara dahulu.";
    resultEl.classList.add("is-error");
    return;
  }
  if (!term) return;

  var match = allRegistrations.find(function (r) {
    return (r.memberId && r.memberId.toLowerCase() === term.toLowerCase()) ||
           (r.email && r.email.toLowerCase() === term.toLowerCase());
  });

  if (!match) {
    resultEl.textContent = "Tiada ahli ditemui dengan ID/e-mel tersebut.";
    resultEl.classList.add("is-error");
    return;
  }

  var alreadyIn = attendeesForEvent.some(function (a) { return a.registrationId === match.id; });
  if (alreadyIn) {
    resultEl.textContent = match.fullName + " (" + match.memberId + ") sudah didaftarkan hadir untuk acara ini.";
    resultEl.classList.add("is-error");
    return;
  }

  try {
    await addDoc(collection(db, "attendance"), {
      eventId: selectedEventId,
      registrationId: match.id,
      memberId: match.memberId || "",
      fullName: match.fullName || "",
      email: match.email || "",
      timestamp: serverTimestamp()
    });
    resultEl.textContent = "✓ Berjaya daftar hadir: " + match.fullName + " (" + match.memberId + ")";
    resultEl.classList.add("is-success");
    document.getElementById("checkinInput").value = "";
  } catch (err) {
    resultEl.textContent = "Gagal merekod kehadiran: " + (err && err.message ? err.message : err);
    resultEl.classList.add("is-error");
  }
});
document.getElementById("checkinInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("checkinBtn").click(); }
});

/* ---------- PDF report download (client-side, via pdf-lib CDN) ---------- */
document.getElementById("downloadReportBtn").addEventListener("click", async function () {
  var PDFLib = window.PDFLib;
  if (!PDFLib) { alert("Pustaka PDF belum dimuatkan. Cuba muat semula halaman."); return; }

  var topic = document.getElementById("reportTopic").value.trim();
  var title = document.getElementById("reportTitle").value.trim() || "Laporan Kehadiran";
  var location = document.getElementById("reportLocation").value.trim();
  var dateTime = document.getElementById("reportDateTime").value.trim();
  var handledBy = document.getElementById("reportHandledBy").value.trim();

  var pdfDoc = await PDFLib.PDFDocument.create();
  var page = pdfDoc.addPage([595, 842]); // A4 portrait
  var { width, height } = page.getSize();
  var fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  var fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  var NAVY = PDFLib.rgb(0.039, 0.165, 0.369);
  var INK = PDFLib.rgb(0.086, 0.094, 0.110);
  var GRAY = PDFLib.rgb(0.55, 0.55, 0.55);

  var y = height - 50;
  page.drawText("PARTI WAWASAN NEGARA — CAWANGAN SABAK BERNAM", { x: 50, y: y, size: 10, font: fontBold, color: NAVY });
  y -= 26;
  page.drawText(title, { x: 50, y: y, size: 20, font: fontBold, color: INK });
  y -= 26;

  [
    ["Topik", topic], ["Lokasi", location], ["Tarikh & Masa", dateTime], ["Dikendalikan Oleh", handledBy],
    ["Jumlah Hadir", String(attendeesForEvent.length)]
  ].forEach(function (row) {
    if (!row[1]) return;
    page.drawText(row[0] + ": " + row[1], { x: 50, y: y, size: 10.5, font: fontRegular, color: INK });
    y -= 16;
  });

  y -= 10;
  page.drawLine({ start: { x: 50, y: y }, end: { x: width - 50, y: y }, thickness: 1, color: GRAY });
  y -= 20;

  page.drawText("Nama", { x: 50, y: y, size: 9.5, font: fontBold, color: INK });
  page.drawText("No. Keahlian", { x: 280, y: y, size: 9.5, font: fontBold, color: INK });
  page.drawText("Masa Daftar", { x: 420, y: y, size: 9.5, font: fontBold, color: INK });
  y -= 16;

  for (var i = 0; i < attendeesForEvent.length; i++) {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 50;
    }
    var a = attendeesForEvent[i];
    page.drawText(String(a.fullName || "—").slice(0, 34), { x: 50, y: y, size: 9.5, font: fontRegular, color: INK });
    page.drawText(String(a.memberId || "—"), { x: 280, y: y, size: 9.5, font: fontRegular, color: INK });
    page.drawText(formatTimestamp(a.timestamp), { x: 420, y: y, size: 9.5, font: fontRegular, color: INK });
    y -= 15;
  }

  var bytes = await pdfDoc.save();
  var blob = new Blob([bytes], { type: "application/pdf" });
  var url = URL.createObjectURL(blob);
  var a2 = document.createElement("a");
  a2.href = url;
  a2.download = (title.replace(/[^a-z0-9]+/gi, "-") || "laporan") + ".pdf";
  a2.click();
  URL.revokeObjectURL(url);
});

/* ============================================================
   Live registrations listener — the single source of truth
   feeding members list + statistics.
   ============================================================ */
function onSnapshotSafe(q, cb) {
  return onSnapshot(q, function (snap) { cb(snap); setLive(true); }, function (err) {
    setLive(false);
    console.error("Sync error:", err);
  });
}

function initDashboard() {
  onSnapshotSafe(query(collection(db, "registrations"), orderBy("submittedAt", "desc")), function (snap) {
    allRegistrations = [];
    snap.forEach(function (d) { allRegistrations.push(Object.assign({ id: d.id }, d.data())); });
    renderMemberCounts();
    renderMemberList();
    renderStats();

    loadingEl.classList.add("is-hidden");
    rootEl.style.display = "flex";
  });
}

/* ============================================================
   Cawangan (PDM) dropdown — real list, grouped by DUN
   ============================================================ */
var CAWANGAN_ZONES = [
  { dun: "DUN Sungai Air Tawar (N.01)", items: [
    "Parit Baharu Baruh", "Sungai Tengar Utara", "Sungai Air Tawar", "Sungai Bernam",
    "Sungai Air Tawar Selatan", "Sungai Tengar Selatan", "Kampung Parit Baharu",
    "Kampung Teluk Belanga", "Beting Kepah", "Kampung Teluk Rhu", "Simpang Empat",
    "Kampung Sekendi", "Kampung Banting", "Kampung Batu 38 Baruh", "Kampung Baharu"
  ]},
  { dun: "DUN Sabak (N.02)", items: [
    "Sabak Bernam Barat", "Kampung Air Manis", "Kampung Seri Aman", "Tebuk Pulai",
    "Torkington", "Sabak Bernam Timur", "Bagan Nira", "Kampung Sapintas",
    "Kampung Bagan Terap", "Bagan Terap Parit Sembilan", "Tebuk Kenchong", "Parit Enam",
    "Parit Dua Timur", "Parit Tiga & Empat", "Parit Satu Barat", "Sungai Lias", "Batu 4 Sapintas"
  ]}
];

var cawanganDd = document.getElementById("cawanganDd");
var cawanganTrigger = document.getElementById("cawanganTrigger");
var cawanganTriggerLabel = document.getElementById("cawanganTriggerLabel");
var cawanganPanel = document.getElementById("cawanganPanel");
var cawanganSearch = document.getElementById("cawanganSearch");
var cawanganList = document.getElementById("cawanganList");
var cawanganHiddenInput = document.getElementById("mfCawangan");

function renderCawanganList(filterTerm) {
  var term = (filterTerm || "").trim().toLowerCase();
  var html = "";
  var anyMatch = false;

  CAWANGAN_ZONES.forEach(function (group) {
    var matches = group.items.filter(function (name) { return !term || name.toLowerCase().indexOf(term) > -1; });
    if (matches.length === 0) return;
    anyMatch = true;
    html += '<div class="cawangan-dd__group-label">' + escapeHtml(group.dun) + '</div>';
    matches.forEach(function (name) {
      var globalIndex = group.items.indexOf(name) + 1;
      var isSelected = cawanganHiddenInput.value === name;
      html += '<div class="cawangan-dd__option' + (isSelected ? ' is-selected' : '') + '" data-name="' + escapeHtml(name) + '">' +
                '<span class="idx">' + String(globalIndex).padStart(2, "0") + '</span>' + escapeHtml(name) +
              '</div>';
    });
  });

  cawanganList.innerHTML = anyMatch ? html : '<div class="cawangan-dd__empty">Tiada PDM sepadan.</div>';

  cawanganList.querySelectorAll(".cawangan-dd__option").forEach(function (opt) {
    opt.addEventListener("click", function () {
      selectCawangan(opt.getAttribute("data-name"));
    });
  });
}

function selectCawangan(name) {
  cawanganHiddenInput.value = name;
  cawanganTriggerLabel.textContent = name;
  cawanganTrigger.classList.add("has-value");
  closeCawanganPanel();
  validateField(FIELDS.find(function (f) { return f.id === "mfCawangan"; }));
  updateSubmitState();
}

function openCawanganPanel() {
  cawanganDd.classList.add("is-open");
  cawanganPanel.hidden = false;
  cawanganTrigger.setAttribute("aria-expanded", "true");
  cawanganSearch.value = "";
  renderCawanganList("");
  cawanganSearch.focus();
}
function closeCawanganPanel() {
  cawanganDd.classList.remove("is-open");
  cawanganPanel.hidden = true;
  cawanganTrigger.setAttribute("aria-expanded", "false");
}

cawanganTrigger.addEventListener("click", function () {
  if (cawanganPanel.hidden) openCawanganPanel(); else closeCawanganPanel();
});
cawanganSearch.addEventListener("input", function () { renderCawanganList(cawanganSearch.value); });
document.addEventListener("click", function (e) {
  if (!cawanganDd.contains(e.target)) closeCawanganPanel();
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeCawanganPanel();
});

/* ============================================================
   Add Member modal
   ============================================================ */
var addMemberOverlay = document.getElementById("addMemberOverlay");
var addMemberForm = document.getElementById("addMemberForm");
var submitAddMemberBtn = document.getElementById("submitAddMemberBtn");
var duplicateNoticeEl = document.getElementById("mfDuplicateNotice");
var submitErrorEl = document.getElementById("mfSubmitError");

/* ---------- Day / Month / Year dropdowns ---------- */
var dobDay = document.getElementById("mfDobDay");
var dobMonth = document.getElementById("mfDobMonth");
var dobYear = document.getElementById("mfDobYear");
var MALAY_MONTHS_FULL = ["Januari","Februari","Mac","April","Mei","Jun","Julai","Ogos","September","Oktober","November","Disember"];

(function populateDobDropdowns() {
  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d);
    dobDay.appendChild(opt);
  }
  MALAY_MONTHS_FULL.forEach(function (m, i) {
    var opt = document.createElement("option");
    opt.value = String(i + 1);
    opt.textContent = m;
    dobMonth.appendChild(opt);
  });
  var thisYear = new Date().getFullYear();
  for (var y = thisYear; y >= thisYear - 100; y--) {
    var opt2 = document.createElement("option");
    opt2.value = String(y);
    opt2.textContent = String(y);
    dobYear.appendChild(opt2);
  }
})();

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/* ---------- Field definitions: id, required?, validator(value) -> error string|null ---------- */
function isValidIc(v) { return /^\d{12}$/.test(v.replace(/[\s-]/g, "")); }
function isValidPhone(v) { var d = v.replace(/[\s-]/g, "").replace(/^\+?60/, "0"); return /^0\d{8,10}$/.test(d); }
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

var FIELDS = [
  { id: "mfFullName", required: true, validate: function (v) { return v.length >= 2 ? null : "Nama terlalu pendek."; } },
  { id: "mfGender", required: true, validate: function () { return null; } },
  { id: "mfIcNumber", required: true, validate: function (v) { return isValidIc(v) ? null : "Format tidak sah (12 digit, cth: 900101-10-1234)."; } },
  { id: "mfBirthplace", required: true, validate: function () { return null; } },
  { id: "mfOccupation", required: true, validate: function () { return null; } },
  { id: "mfEmployer", required: true, validate: function () { return null; } },
  { id: "mfAddress", required: true, validate: function () { return null; } },
  { id: "mfPhone", required: true, validate: function (v) { return isValidPhone(v) ? null : "Format tidak sah (cth: 012-345 6789)."; } },
  { id: "mfPhone2", required: false, validate: function (v) { return (!v || isValidPhone(v)) ? null : "Format tidak sah (cth: 012-345 6789)."; } },
  { id: "mfEmail", required: true, validate: function (v) { return isValidEmail(v) ? null : "Format e-mel tidak sah."; } },
  { id: "mfCawangan", required: true, validate: function () { return null; } },
];

function validateField(f) {
  var el = document.getElementById(f.id);
  var errEl = document.getElementById("err-" + f.id);
  var value = el.value.trim();
  var error = null;

  if (f.required && !value) {
    error = "Ruangan ini wajib diisi.";
  } else if (value || f.required) {
    error = f.validate(value);
  } else if (!f.required && value) {
    error = f.validate(value);
  }

  el.closest(".mf-field").classList.toggle("is-invalid", !!error);
  errEl.textContent = error || "";
  return !error;
}

function validateDob() {
  var errEl = document.getElementById("err-mfDob");
  var d = dobDay.value, m = dobMonth.value, y = dobYear.value;
  var wrap = dobDay.closest(".mf-field");
  if (!d || !m || !y) {
    wrap.classList.add("is-invalid");
    errEl.textContent = "Sila lengkapkan tarikh lahir.";
    return false;
  }
  if (parseInt(d, 10) > daysInMonth(parseInt(m, 10), parseInt(y, 10))) {
    wrap.classList.add("is-invalid");
    errEl.textContent = "Tarikh tidak sah untuk bulan tersebut.";
    return false;
  }
  wrap.classList.remove("is-invalid");
  errEl.textContent = "";
  return true;
}

function validateAll() {
  var results = FIELDS.map(validateField);
  results.push(validateDob());
  return results.every(Boolean);
}

function updateSubmitState() {
  submitAddMemberBtn.disabled = !validateAll();
}

FIELDS.forEach(function (f) {
  document.getElementById(f.id).addEventListener("input", updateSubmitState);
  document.getElementById(f.id).addEventListener("blur", updateSubmitState);
});
[dobDay, dobMonth, dobYear].forEach(function (el) {
  el.addEventListener("change", updateSubmitState);
});

/* ---------- Open / close modal ---------- */
function openAddMemberModal() {
  addMemberForm.reset();
  FIELDS.forEach(function (f) {
    document.getElementById(f.id).closest(".mf-field").classList.remove("is-invalid");
    document.getElementById("err-" + f.id).textContent = "";
  });
  document.getElementById("err-mfDob").textContent = "";
  dobDay.closest(".mf-field").classList.remove("is-invalid");
  cawanganTriggerLabel.textContent = "Pilih cawangan (PDM)";
  cawanganTrigger.classList.remove("has-value");
  closeCawanganPanel();
  duplicateNoticeEl.hidden = true;
  submitErrorEl.hidden = true;
  submitAddMemberBtn.disabled = true;
  addMemberOverlay.classList.add("is-open");
  addMemberOverlay.setAttribute("aria-hidden", "false");
}
function closeAddMemberModal() {
  addMemberOverlay.classList.remove("is-open");
  addMemberOverlay.setAttribute("aria-hidden", "true");
}

document.getElementById("openAddMemberBtn").addEventListener("click", openAddMemberModal);
document.getElementById("closeAddMemberBtn").addEventListener("click", closeAddMemberModal);
document.getElementById("cancelAddMemberBtn").addEventListener("click", closeAddMemberModal);
addMemberOverlay.addEventListener("click", function (e) {
  if (e.target === addMemberOverlay) closeAddMemberModal();
});

/* ---------- Member ID generation (mirrors form-submit.js's logic) ---------- */
var ID_DIGIT_LENGTH = 6;
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var MAX_ID_ATTEMPTS = 25;
function randomDigits(len) { var s = ""; for (var i = 0; i < len; i++) s += Math.floor(Math.random() * 10); return s; }
function randomLetter() { return LETTERS.charAt(Math.floor(Math.random() * LETTERS.length)); }
function generateCandidateId() { return "N" + randomDigits(ID_DIGIT_LENGTH) + randomLetter(); }

async function generateUniqueMemberId() {
  for (var attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    var candidate = generateCandidateId();
    var ref = doc(db, "member_ids", candidate);
    try {
      var reserved = await runTransaction(db, async function (tx) {
        var snap = await tx.get(ref);
        if (snap.exists()) return false;
        tx.set(ref, { createdAt: serverTimestamp() });
        return true;
      });
      if (reserved) return candidate;
    } catch (err) {
      if (attempt === MAX_ID_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Gagal menjana ID unik selepas beberapa percubaan.");
}

/* ---------- Submit: create new, or merge onto an existing match by IC ---------- */
addMemberForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!validateAll()) return;

  submitErrorEl.hidden = true;
  duplicateNoticeEl.hidden = true;
  submitAddMemberBtn.disabled = true;
  submitAddMemberBtn.textContent = "Memproses...";

  var icNumber = document.getElementById("mfIcNumber").value.trim();
  var newFields = {
    fullName: document.getElementById("mfFullName").value.trim(),
    gender: document.getElementById("mfGender").value,
    icNumber: icNumber,
    dob: dobYear.value + "-" + String(dobMonth.value).padStart(2, "0") + "-" + String(dobDay.value).padStart(2, "0"),
    birthplace: document.getElementById("mfBirthplace").value.trim(),
    occupation: document.getElementById("mfOccupation").value.trim(),
    employer: document.getElementById("mfEmployer").value.trim(),
    address: document.getElementById("mfAddress").value.trim(),
    phone: document.getElementById("mfPhone").value.trim(),
    phone2: document.getElementById("mfPhone2").value.trim(),
    email: document.getElementById("mfEmail").value.trim(),
    cawangan: document.getElementById("mfCawangan").value,
  };

  // Duplicate check: an existing registration with the same IC number
  // means this person already came through the public form — merge
  // these additional fields onto that record instead of creating a
  // second, duplicate one. Their existing memberId/tier are untouched.
  var existing = allRegistrations.find(function (r) {
    return r.icNumber && r.icNumber.replace(/[\s-]/g, "") === icNumber.replace(/[\s-]/g, "");
  });

  try {
    if (existing) {
      await updateDoc(doc(db, "registrations", existing.id), newFields);
      duplicateNoticeEl.textContent = "Ahli sedia ada (No. Keahlian: " + (existing.memberId || "—") + ") dikemas kini dengan maklumat tambahan.";
      duplicateNoticeEl.hidden = false;
      setTimeout(closeAddMemberModal, 1800);
    } else {
      var memberId = await generateUniqueMemberId();
      await addDoc(collection(db, "registrations"), Object.assign({}, newFields, {
        memberId: memberId,
        tier: currentTier, // whichever Ahli/AJK/VIP tab was open when "+" was clicked
        joinAs: "ahli",
        consent: true, // admin-entered on the member's behalf; consent assumed obtained offline
        submittedAt: serverTimestamp()
      }));
      duplicateNoticeEl.textContent = "Ahli baharu berjaya dicipta — No. Keahlian: " + memberId;
      duplicateNoticeEl.hidden = false;
      setTimeout(closeAddMemberModal, 1800);
    }
  } catch (err) {
    submitErrorEl.textContent = "Gagal menyimpan: " + (err && err.message ? err.message : err);
    submitErrorEl.hidden = false;
  } finally {
    submitAddMemberBtn.disabled = false;
    submitAddMemberBtn.textContent = "Cipta Ahli";
  }
});
