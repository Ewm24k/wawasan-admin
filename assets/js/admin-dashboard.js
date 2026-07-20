/* ============================================================
   Admin Dashboard — main logic with T1ERA Integration
   ============================================================ */
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Render Python API URL ---------- */
// Update this value with your live backend service URL on Render
const T1ERA_BACKEND_URL = "https://wawasan-sabak-pdm-ocr.onrender.com";

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
    window.location.href = "index.html";
    return;
  }

  loadingTextEl.textContent = "Menyegerakkan data...";
  initDashboard();
});

document
  .getElementById("signOutBtn")
  .addEventListener("click", async function () {
    await signOut(auth);
    window.location.href = "index.html";
  });

/* ---------- Sidebar collapse + nav switching ---------- */
var sidebar = document.getElementById("dashSidebar");
document
  .getElementById("sidebarCollapseBtn")
  .addEventListener("click", function () {
    sidebar.classList.toggle("is-collapsed");
  });

var navItems = document.querySelectorAll(".dash__nav-item");
var panels = document.querySelectorAll(".dash__panel");
var topbarTitle = document.getElementById("topbarTitle");
var PANEL_TITLES = {
  panelMembers: "Ahli & Keahlian",
  panelPunch: "Pendaftaran Kehadiran",
  panelStats: "Statistik",
};
navItems.forEach(function (item) {
  item.addEventListener("click", function () {
    navItems.forEach(function (i) {
      i.classList.remove("is-active");
    });
    item.classList.add("is-active");
    var targetId = item.getAttribute("data-panel");
    panels.forEach(function (p) {
      p.classList.toggle("is-active", p.id === targetId);
    });
    topbarTitle.textContent = PANEL_TITLES[targetId] || "";
  });
});

/* ============================================================
   Shared in-memory state
   ============================================================ */
var allRegistrations = []; 
var currentTier = "ahli";
var currentSearch = "";

function normalizeTier(reg) {
  return reg.tier === "ajk" || reg.tier === "vip" ? reg.tier : "ahli";
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  var d =
    ts instanceof Timestamp ? ts.toDate() : ts.toDate ? ts.toDate() : null;
  if (!d) return "—";
  var months = [
    "Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"
  ];
  var pad = function (n) {
    return n < 10 ? "0" + n : "" + n;
  };
  return (
    d.getDate() +
    " " +
    months[d.getMonth()] +
    " " +
    d.getFullYear() +
    ", " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

/* ---------- Member list rendering ---------- */
var memberListEl = document.getElementById("memberList");
var countEls = {
  ahli: document.getElementById("countAhli"),
  ajk: document.getElementById("countAjk"),
  vip: document.getElementById("countVip"),
};

function renderMemberCounts() {
  var counts = { ahli: 0, ajk: 0, vip: 0 };
  allRegistrations.forEach(function (r) {
    counts[normalizeTier(r)]++;
  });
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

  memberListEl.innerHTML = filtered
    .map(function (r) {
      var tier = normalizeTier(r);
      return (
        '<div class="member-row" data-id="' +
        r.id +
        '">' +
        '<div class="member-row__head">' +
        '<span class="badge badge--' +
        tier +
        '">' +
        TIER_LABEL[tier] +
        "</span>" +
        '<span class="member-row__name">' +
        escapeHtml(r.fullName || "—") +
        "</span>" +
        '<span class="member-row__id">' +
        escapeHtml(r.memberId || "—") +
        "</span>" +
        '<span class="member-row__meta">' +
        formatTimestamp(r.submittedAt) +
        "</span>" +
        '<svg class="member-row__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        "</div>" +
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
        "</div>" +
        '<div class="tier-actions" data-doc-id="' +
        r.id +
        '">' +
        '<button class="tier-btn edit-member-btn" data-id="' + r.id + '">Ubah Maklumat</button>' +
        tierButton(r.id, "ahli", tier) +
        tierButton(r.id, "ajk", tier) +
        tierButton(r.id, "vip", tier) +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  memberListEl.querySelectorAll(".member-row__head").forEach(function (head) {
    head.addEventListener("click", function () {
      head.parentElement.classList.toggle("is-open");
    });
  });

  // Edit Action Listener [admin-dashboard.js]
  memberListEl.querySelectorAll(".edit-member-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var mId = btn.getAttribute("data-id");
      var member = allRegistrations.find(r => r.id === mId);
      if (member) openEditMemberModal(member);
    });
  });

  memberListEl
    .querySelectorAll(".tier-btn:not(.is-current):not(.edit-member-btn)")
    .forEach(function (btn) {
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
  return (
    '<div class="detail-item"><span class="k">' +
    escapeHtml(label) +
    '</span><span class="v">' +
    escapeHtml(value || "—") +
    "</span></div>"
  );
}
function formatGender(g) {
  if (g === "lelaki") return "Lelaki";
  if (g === "perempuan") return "Perempuan";
  return "";
}
function formatDob(dobStr) {
  if (!dobStr || typeof dobStr !== "string") return "";
  var parts = dobStr.split("-");
  if (parts.length !== 3) return dobStr;
  var year = parseInt(parts[0], 10),
    month = parseInt(parts[1], 10),
    day = parseInt(parts[2], 10);
  if (!year || !month || !day) return dobStr;
  return day + " " + MALAY_MONTHS_FULL[month - 1] + " " + year;
}
function tierButton(docId, tier, currentTierValue) {
  var isCurrent = tier === currentTierValue;
  return (
    '<button class="tier-btn' +
    (isCurrent ? " is-current" : "") +
    '" data-doc-id="' +
    docId +
    '" data-tier="' +
    tier +
    '" ' +
    (isCurrent ? "disabled" : "") +
    ">" +
    (isCurrent ? "✓ " : "Jadikan ") +
    TIER_LABEL[tier] +
    "</button>"
  );
}
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

document.querySelectorAll(".member-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".member-tab").forEach(function (t) {
      t.classList.remove("is-active");
    });
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
   Statistics Dashboard Panel
   ============================================================ */
function renderStats() {
  var total = allRegistrations.length;
  var counts = { ahli: 0, ajk: 0, vip: 0 };
  allRegistrations.forEach(function (r) {
    counts[normalizeTier(r)]++;
  });

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

  var thisMonthCount = 0,
    lastMonthCount = 0;
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
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ============================================================
   Punch Card and Attendance Registry
   ============================================================ */
var eventSelect = document.getElementById("eventSelect");
var allEvents = [];
var selectedEventId = "";
var attendeesForEvent = [];
var unsubscribeAttendance = null;

onSnapshotSafe(
  query(collection(db, "events"), orderBy("createdAt", "desc")),
  function (snap) {
    allEvents = [];
    snap.forEach(function (d) {
      allEvents.push(Object.assign({ id: d.id }, d.data()));
    });
    var prevValue = eventSelect.value;
    eventSelect.innerHTML =
      '<option value="">— Pilih acara —</option>' +
      allEvents
        .map(function (ev) {
          return (
            '<option value="' +
            ev.id +
            '">' +
            escapeHtml(ev.title || ev.topic || "Acara") +
            " — " +
            escapeHtml(ev.dateTime || "") +
            "</option>"
          );
        })
        .join("");
    if (
      prevValue &&
      allEvents.some(function (ev) {
        return ev.id === prevValue;
      })
    ) {
      eventSelect.value = prevValue;
    }
  },
);

eventSelect.addEventListener("change", function () {
  selectedEventId = eventSelect.value;
  var ev = allEvents.find(function (e) {
    return e.id === selectedEventId;
  });
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
  [
    "reportTopic",
    "reportTitle",
    "reportLocation",
    "reportDateTime",
    "reportHandledBy",
  ].forEach(function (id) {
    document.getElementById(id).value = "";
  });
  document.getElementById("reportTopic").focus();
  subscribeAttendance();
});

document
  .getElementById("createEventBtn")
  .addEventListener("click", async function () {
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
        topic: topic,
        title: title,
        location: location,
        dateTime: dateTime,
        handledBy: handledBy,
        createdAt: serverTimestamp(),
      });
      selectedEventId = ref.id;
      setTimeout(function () {
        eventSelect.value = ref.id;
        subscribeAttendance();
      }, 400);
    } catch (err) {
      alert("Gagal mencipta acara: " + (err && err.message ? err.message : err));
    }
  });

function subscribeAttendance() {
  if (unsubscribeAttendance) {
    unsubscribeAttendance();
    unsubscribeAttendance = null;
  }
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
    query(
      collection(db, "attendance"),
      where("eventId", "==", selectedEventId),
      orderBy("timestamp", "desc"),
    ),
    function (snap) {
      attendeesForEvent = [];
      snap.forEach(function (d) {
        attendeesForEvent.push(Object.assign({ id: d.id }, d.data()));
      });
      countEl.textContent = "(" + attendeesForEvent.length + ")";
      if (attendeesForEvent.length === 0) {
        tbody.innerHTML = "";
        emptyEl.style.display = "block";
        return;
      }
      emptyEl.style.display = "none";
      tbody.innerHTML = attendeesForEvent
        .map(function (a) {
          return (
            "<tr><td>" +
            escapeHtml(a.fullName) +
            "</td><td>" +
            escapeHtml(a.memberId) +
            "</td><td>" +
            formatTimestamp(a.timestamp) +
            "</td></tr>"
          );
        })
        .join("");
    },
  );
}

document
  .getElementById("checkinBtn")
  .addEventListener("click", async function () {
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
      return (
        (r.memberId && r.memberId.toLowerCase() === term.toLowerCase()) ||
        (r.email && r.email.toLowerCase() === term.toLowerCase())
      );
    });

    if (!match) {
      resultEl.textContent = "Tiada ahli ditemui dengan ID/e-mel tersebut.";
      resultEl.classList.add("is-error");
      return;
    }

    var alreadyIn = attendeesForEvent.some(function (a) {
      return a.registrationId === match.id;
    });
    if (alreadyIn) {
      resultEl.textContent = match.fullName + " (" + match.memberId + ") sudah didaftarkan hadir.";
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
        timestamp: serverTimestamp(),
      });
      resultEl.textContent = "✓ Berjaya daftar hadir: " + match.fullName + " (" + match.memberId + ")";
      resultEl.classList.add("is-success");
      document.getElementById("checkinInput").value = "";
    } catch (err) {
      resultEl.textContent = "Gagal merekod kehadiran: " + (err && err.message ? err.message : err);
      resultEl.classList.add("is-error");
    }
  });

document
  .getElementById("checkinInput")
  .addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("checkinBtn").click();
    }
  });

/* ---------- PDF report download client-side ---------- */
document
  .getElementById("downloadReportBtn")
  .addEventListener("click", async function () {
    var PDFLib = window.PDFLib;
    if (!PDFLib) {
      alert("Pustaka PDF belum dimuatkan. Cuba muat semula halaman.");
      return;
    }

    var topic = document.getElementById("reportTopic").value.trim();
    var title = document.getElementById("reportTitle").value.trim() || "Laporan Kehadiran";
    var location = document.getElementById("reportLocation").value.trim();
    var dateTime = document.getElementById("reportDateTime").value.trim();
    var handledBy = document.getElementById("reportHandledBy").value.trim();

    var pdfDoc = await PDFLib.PDFDocument.create();
    var page = pdfDoc.addPage([595, 842]); 
    var { width, height } = page.getSize();
    var fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    var NAVY = PDFLib.rgb(0.039, 0.165, 0.369);
    var INK = PDFLib.rgb(0.086, 0.094, 0.11);
    var GRAY = PDFLib.rgb(0.55, 0.55, 0.55);

    var y = height - 50;
    page.drawText("PARTI WAWASAN NEGARA — CAWANGAN SABAK BERNAM", {
      x: 50,
      y: y,
      size: 10,
      font: fontBold,
      color: NAVY,
    });
    y -= 26;
    page.drawText(title, { x: 50, y: y, size: 20, font: fontBold, color: INK });
    y -= 26;

    [
      ["Topik", topic],
      ["Lokasi", location],
      ["Tarikh & Masa", dateTime],
      ["Dikendalikan Oleh", handledBy],
      ["Jumlah Hadir", String(attendeesForEvent.length)],
    ].forEach(function (row) {
      if (!row[1]) return;
      page.drawText(row[0] + ": " + row[1], {
        x: 50,
        y: y,
        size: 10.5,
        font: fontRegular,
        color: INK,
      });
      y -= 16;
    });

    y -= 10;
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: width - 50, y: y },
      thickness: 1,
      color: GRAY,
    });
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
      page.drawText(String(a.fullName || "—").slice(0, 34), {
        x: 50,
        y: y,
        size: 9.5,
        font: fontRegular,
        color: INK,
      });
      page.drawText(String(a.memberId || "—"), {
        x: 280,
        y: y,
        size: 9.5,
        font: fontRegular,
        color: INK,
      });
      page.drawText(formatTimestamp(a.timestamp), {
        x: 420,
        y: y,
        size: 9.5,
        font: fontRegular,
        color: INK,
      });
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
   Live synchronization snapshot wrapper
   ============================================================ */
function onSnapshotSafe(q, cb) {
  return onSnapshot(
    q,
    function (snap) {
      cb(snap);
      setLive(true);
    },
    function (err) {
      setLive(false);
      console.error("Sync error:", err);
    },
  );
}

function initDashboard() {
  onSnapshotSafe(
    query(collection(db, "registrations"), orderBy("submittedAt", "desc")),
    function (snap) {
      allRegistrations = [];
      snap.forEach(function (d) {
        allRegistrations.push(Object.assign({ id: d.id }, d.data()));
      });
      renderMemberCounts();
      renderMemberList();
      renderStats();

      loadingEl.classList.add("is-hidden");
      rootEl.style.display = "flex";
    },
  );
}

/* ============================================================
   Cawangan (PDM) searchable grouped dropdown data
   ============================================================ */
var CAWANGAN_ZONES = [
  {
    dun: "DUN Sungai Air Tawar (N.01)",
    items: [
      "Parit Baharu Baruh", "Sungai Tengar Utara", "Sungai Air Tawar", "Sungai Bernam",
      "Sungai Air Tawar Selatan", "Sungai Tengar Selatan", "Kampung Parit Baharu",
      "Kampung Teluk Belanga", "Beting Kepah", "Kampung Teluk Rhu", "Simpang Empat",
      "Kampung Sekendi", "Kampung Banting", "Kampung Batu 38 Baruh", "Kampung Baharu",
    ],
  },
  {
    dun: "DUN Sabak (N.02)",
    items: [
      "Sabak Bernam Barat", "Kampung Air Manis", "Kampung Seri Aman", "Tebuk Pulai",
      "Torkington", "Sabak Bernam Timur", "Bagan Nira", "Kampung Sapintas",
      "Kampung Bagan Terap", "Bagan Terap Parit Sembilan", "Tebuk Kenchong", "Parit Enam",
      "Parit Dua Timur", "Parit Tiga & Empat", "Parit Satu Barat", "Sungai Lias", "Batu 4 Sapintas",
    ],
  },
];

/* ============================================================
   Malaysian IC Parser Helper
   Extracts Date of Birth (Day, Month, Year) and Gender.
   ============================================================ */
function parseMyKadInfo(icStr) {
  var clean = icStr.replace(/[\s-]/g, "");
  if (clean.length !== 12) return null;

  var yy = clean.substring(0, 2);
  var mm = clean.substring(2, 4);
  var dd = clean.substring(4, 6);
  var lastChar = clean.charAt(11);

  var yearSuffix = parseInt(yy, 10);
  // Dynamically assumes dates under 27 refer to 2000s, and >= 27 refer to 1900s
  var currentYearLastTwo = new Date().getFullYear() % 100;
  var fullYear = (yearSuffix <= currentYearLastTwo ? 2000 : 1900) + yearSuffix;

  var day = parseInt(dd, 10);
  var month = parseInt(mm, 10);

  var genderNum = parseInt(lastChar, 10);
  var gender = genderNum % 2 === 0 ? "perempuan" : "lelaki";

  return {
    day: day,
    month: month,
    year: fullYear,
    gender: gender
  };
}

// Global hook to auto-parse IC inputs for both forms
function setupIcAutoParser(inputElementId, dayElementId, monthElementId, yearElementId, genderElementId) {
  var icInput = document.getElementById(inputElementId);
  icInput.addEventListener("input", function () {
    var details = parseMyKadInfo(icInput.value);
    if (details) {
      document.getElementById(dayElementId).value = details.day;
      document.getElementById(monthElementId).value = details.month;
      document.getElementById(yearElementId).value = details.year;
      document.getElementById(genderElementId).value = details.gender;
      updateSubmitState();
    }
  });
}

setupIcAutoParser("mfIcNumber", "mfDobDay", "mfDobMonth", "mfDobYear", "mfGender");
setupIcAutoParser("efIcNumber", "efDobDay", "efDobMonth", "efDobYear", "efGender");

/* ============================================================
   Cawangan Dropdown Controllers
   ============================================================ */
function buildCawanganDropdown(containerId, triggerId, labelId, panelId, searchId, listId, hiddenInputId, onSelectCallback) {
  var trigger = document.getElementById(triggerId);
  var triggerLabel = document.getElementById(labelId);
  var panel = document.getElementById(panelId);
  var searchInput = document.getElementById(searchId);
  var list = document.getElementById(listId);
  var hiddenInput = document.getElementById(hiddenInputId);
  var container = document.getElementById(containerId);

  function renderList(term) {
    term = (term || "").trim().toLowerCase();
    var html = "";
    var anyMatch = false;

    CAWANGAN_ZONES.forEach(function (group) {
      var matches = group.items.filter(function (name) {
        return !term || name.toLowerCase().indexOf(term) > -1;
      });
      if (matches.length === 0) return;
      anyMatch = true;
      html += '<div class="cawangan-dd__group-label">' + escapeHtml(group.dun) + "</div>";
      matches.forEach(function (name) {
        var globalIndex = group.items.indexOf(name) + 1;
        var isSelected = hiddenInput.value === name;
        html +=
          '<div class="cawangan-dd__option' + (isSelected ? " is-selected" : "") + '" data-name="' + escapeHtml(name) + '">' +
          '<span class="idx">' + String(globalIndex).padStart(2, "0") + '</span>' +
          escapeHtml(name) +
          "</div>";
      });
    });

    list.innerHTML = anyMatch ? html : '<div class="cawangan-dd__empty">Tiada PDM sepadan.</div>';
    list.querySelectorAll(".cawangan-dd__option").forEach(function (opt) {
      opt.addEventListener("click", function () {
        var name = opt.getAttribute("data-name");
        hiddenInput.value = name;
        triggerLabel.textContent = name;
        trigger.classList.add("has-value");
        closePanel();
        if (onSelectCallback) onSelectCallback();
      });
    });
  }

  function openPanel() {
    container.classList.add("is-open");
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    searchInput.value = "";
    renderList("");
    searchInput.focus();
  }

  function closePanel() {
    container.classList.remove("is-open");
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    if (panel.hidden) openPanel();
    else closePanel();
  });

  searchInput.addEventListener("input", function () {
    renderList(searchInput.value);
  });

  document.addEventListener("click", function (e) {
    if (!container.contains(e.target)) closePanel();
  });
}

// Initialize Cawangan dropdown for standard registration form
buildCawanganDropdown("cawanganDd", "cawanganTrigger", "cawanganTriggerLabel", "cawanganPanel", "cawanganSearch", "cawanganList", "mfCawangan", function() {
  validateField(FIELDS.find(f => f.id === "mfCawangan"));
  updateSubmitState();
});

// Initialize Cawangan dropdown for member edit form
buildCawanganDropdown("editCawanganDd", "editCawanganTrigger", "editCawanganTriggerLabel", "editCawanganPanel", "editCawanganSearch", "editCawanganList", "efCawangan", function() {
  validateField(EDIT_FIELDS.find(f => f.id === "efCawangan"));
  updateEditSubmitState();
});


/* ============================================================
   Add Member Modal with Choice Step & T1ERA AI OCR Pipeline
   ============================================================ */
var choiceOverlay = document.getElementById("choiceOverlay");
var addMemberOverlay = document.getElementById("addMemberOverlay");
var addMemberForm = document.getElementById("addMemberForm");
var submitAddMemberBtn = document.getElementById("submitAddMemberBtn");
var duplicateNoticeEl = document.getElementById("mfDuplicateNotice");
var submitErrorEl = document.getElementById("mfSubmitError");

var dobDay = document.getElementById("mfDobDay");
var dobMonth = document.getElementById("mfDobMonth");
var dobYear = document.getElementById("mfDobYear");
var MALAY_MONTHS_FULL = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"
];

// Populate date selector options
function populateDobDropdowns(dayEl, monthEl, yearEl) {
  dayEl.innerHTML = '<option value="">Hari</option>';
  monthEl.innerHTML = '<option value="">Bulan</option>';
  yearEl.innerHTML = '<option value="">Tahun</option>';

  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement("option");
    opt.value = String(d); opt.textContent = String(d);
    dayEl.appendChild(opt);
  }
  MALAY_MONTHS_FULL.forEach(function (m, i) {
    var opt = document.createElement("option");
    opt.value = String(i + 1); opt.textContent = m;
    monthEl.appendChild(opt);
  });
  var thisYear = new Date().getFullYear();
  for (var y = thisYear; y >= thisYear - 100; y--) {
    var opt2 = document.createElement("option");
    opt2.value = String(y); opt2.textContent = String(y);
    yearEl.appendChild(opt2);
  }
}
populateDobDropdowns(dobDay, dobMonth, dobYear);

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/* ---------- Form Validation Matrix ---------- */
function isValidIc(v) {
  return /^\d{12}$/.test(v.replace(/[\s-]/g, ""));
}
function isValidPhone(v) {
  var d = v.replace(/[\s-]/g, "").replace(/^\+?60/, "0");
  return /^0\d{8,11}$/.test(d);
}
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Updated standard registration constraints (Employer, Email, Phone2 are explicitly optional)
var FIELDS = [
  { id: "mfFullName", required: true, validate: v => v.length >= 2 ? null : "Nama terlalu pendek." },
  { id: "mfGender", required: true, validate: () => null },
  { id: "mfIcNumber", required: true, validate: v => isValidIc(v) ? null : "Format tidak sah (12 digit, cth: 900101101234)." },
  { id: "mfBirthplace", required: true, validate: () => null },
  { id: "mfOccupation", required: true, validate: () => null },
  { id: "mfEmployer", required: false, validate: () => null },
  { id: "mfAddress", required: true, validate: () => null },
  { id: "mfPhone", required: true, validate: v => isValidPhone(v) ? null : "Format tidak sah (cth: 012-345 6789)." },
  { id: "mfPhone2", required: false, validate: v => !v || isValidPhone(v) ? null : "Format tidak sah (cth: 012-345 6789)." },
  { id: "mfEmail", required: false, validate: v => !v || isValidEmail(v) ? null : "Format e-mel tidak sah." },
  { id: "mfCawangan", required: true, validate: () => null },
];

function validateField(f, isEdit = false) {
  var prefix = isEdit ? "ef" : "mf";
  var el = document.getElementById(isEdit ? f.id.replace("mf", "ef") : f.id);
  var errEl = document.getElementById("err-" + (isEdit ? f.id.replace("mf", "ef") : f.id));
  if (!el) return true;
  var value = el.value.trim();
  var error = null;

  if (f.required && !value) {
    error = "Ruangan ini wajib diisi.";
  } else if (value && f.validate) {
    error = f.validate(value);
  }

  el.closest(".mf-field").classList.toggle("is-invalid", !!error);
  if (errEl) errEl.textContent = error || "";
  return !error;
}

function validateDobFields(dayId, monthId, yearId, errId) {
  var dEl = document.getElementById(dayId);
  var mEl = document.getElementById(monthId);
  var yEl = document.getElementById(yearId);
  var errEl = document.getElementById(errId);
  var wrap = dEl.closest(".mf-field");

  var d = dEl.value, m = mEl.value, y = yEl.value;
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
  var results = FIELDS.map(f => validateField(f, false));
  results.push(validateDobFields("mfDobDay", "mfDobMonth", "mfDobYear", "err-mfDob"));
  return results.every(Boolean);
}

function updateSubmitState() {
  submitAddMemberBtn.disabled = !validateAll();
}

FIELDS.forEach(function (f) {
  var el = document.getElementById(f.id);
  if (el) {
    el.addEventListener("input", updateSubmitState);
    el.addEventListener("blur", updateSubmitState);
  }
});
[dobDay, dobMonth, dobYear].forEach(el => el.addEventListener("change", updateSubmitState));

/* ---------- Method Choice Overlay Navigation ---------- */
document.getElementById("openAddChoiceBtn").addEventListener("click", function() {
  choiceOverlay.classList.add("is-open");
  choiceOverlay.setAttribute("aria-hidden", "false");
});

document.getElementById("closeChoiceBtn").addEventListener("click", function() {
  choiceOverlay.classList.remove("is-open");
  choiceOverlay.setAttribute("aria-hidden", "true");
});

document.getElementById("chooseManualBtn").addEventListener("click", function() {
  choiceOverlay.classList.remove("is-open");
  openAddMemberModal(false);
});

document.getElementById("chooseAiBtn").addEventListener("click", function() {
  choiceOverlay.classList.remove("is-open");
  openAddMemberModal(true);
});

/* ---------- Open / close modal handlers ---------- */
function openAddMemberModal(enableAi) {
  addMemberForm.reset();
  FIELDS.forEach(function (f) {
    var el = document.getElementById(f.id);
    if (el) {
      el.closest(".mf-field").classList.remove("is-invalid");
      var errEl = document.getElementById("err-" + f.id);
      if (errEl) errEl.textContent = "";
    }
  });
  document.getElementById("err-mfDob").textContent = "";
  dobDay.closest(".mf-field").classList.remove("is-invalid");
  
  // Set cawangan trigger defaults
  document.getElementById("cawanganTriggerLabel").textContent = "Pilih cawangan (PDM)";
  document.getElementById("cawanganTrigger").classList.remove("has-value");
  
  duplicateNoticeEl.hidden = true;
  submitErrorEl.hidden = true;
  submitAddMemberBtn.disabled = true;

  // Toggle OCR upload wrapper
  var ocrContainer = document.getElementById("t1eraUploadContainer");
  if (enableAi) {
    ocrContainer.style.display = "block";
    document.getElementById("t1eraProgress").style.display = "none";
  } else {
    ocrContainer.style.display = "none";
  }

  addMemberOverlay.classList.add("is-open");
  addMemberOverlay.setAttribute("aria-hidden", "false");
}

function closeAddMemberModal() {
  addMemberOverlay.classList.remove("is-open");
  addMemberOverlay.setAttribute("aria-hidden", "true");
}

document.getElementById("closeAddMemberBtn").addEventListener("click", closeAddMemberModal);
document.getElementById("cancelAddMemberBtn").addEventListener("click", closeAddMemberModal);

/* ============================================================
   T1ERA AI Integration Pipeline (MyKad Vision Engine)
   ============================================================ */
var t1eraFileInput = document.getElementById("t1eraFileInput");
var t1eraDropzone = document.getElementById("t1eraDropzone");
var t1eraProgress = document.getElementById("t1eraProgress");
var t1eraProgressText = document.getElementById("t1eraProgressText");

t1eraDropzone.addEventListener("click", () => t1eraFileInput.click());

t1eraDropzone.addEventListener("dragover", function (e) {
  e.preventDefault();
  t1eraDropzone.style.borderColor = "var(--blue)";
});
t1eraDropzone.addEventListener("dragleave", function () {
  t1eraDropzone.style.borderColor = "var(--line)";
});
t1eraDropzone.addEventListener("drop", function (e) {
  e.preventDefault();
  t1eraDropzone.style.borderColor = "var(--line)";
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleMyKadOcr(e.dataTransfer.files[0]);
  }
});

t1eraFileInput.addEventListener("change", function () {
  if (t1eraFileInput.files && t1eraFileInput.files[0]) {
    handleMyKadOcr(t1eraFileInput.files[0]);
  }
});

async function handleMyKadOcr(file) {
  t1eraProgress.style.display = "flex";
  t1eraProgressText.textContent = "Mengimbas imej Kad Pengenalan...";
  t1eraProgressText.style.color = "var(--blue)";

  var formData = new FormData();
  formData.append("file", file);

  try {
    var response = await fetch(T1ERA_BACKEND_URL + "/extract-ic", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Tindak balas ralat daripada server: " + response.status);
    }

    var data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Auto fill form with extracted vision variables
    if (data.fullName) document.getElementById("mfFullName").value = data.fullName;
    if (data.icNumber) {
      var parsedIc = data.icNumber.replace(/[\s-]/g, "");
      document.getElementById("mfIcNumber").value = parsedIc;
      // Auto-trigger MyKad parser to auto populate gender and birthdates
      var details = parseMyKadInfo(parsedIc);
      if (details) {
        document.getElementById("mfDobDay").value = details.day;
        document.getElementById("mfDobMonth").value = details.month;
        document.getElementById("mfDobYear").value = details.year;
        document.getElementById("mfGender").value = details.gender;
      }
    }
    if (data.address) document.getElementById("mfAddress").value = data.address;
    if (data.birthplace) document.getElementById("mfBirthplace").value = data.birthplace;

    t1eraProgressText.textContent = "✓ Selesai mengekstrak data MyKad!";
    t1eraProgressText.style.color = "var(--green)";
    setTimeout(function() {
      t1eraProgress.style.display = "none";
    }, 2000);

    updateSubmitState();

  } catch (err) {
    console.error("OCR Pipeline Failed: ", err);
    t1eraProgressText.textContent = "Gagal memproses fail: " + (err.message || err);
    t1eraProgressText.style.color = "var(--red)";
  }
}

/* ---------- Unique Member ID Generation Engine ---------- */
var ID_DIGIT_LENGTH = 6;
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var MAX_ID_ATTEMPTS = 25;
function randomDigits(len) {
  var s = "";
  for (var i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function randomLetter() {
  return LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
}
function generateCandidateId() {
  return "N" + randomDigits(ID_DIGIT_LENGTH) + randomLetter();
}

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

/* ---------- Form Submit Handler ---------- */
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
    dob:
      document.getElementById("mfDobYear").value +
      "-" +
      String(document.getElementById("mfDobMonth").value).padStart(2, "0") +
      "-" +
      String(document.getElementById("mfDobDay").value).padStart(2, "0"),
    birthplace: document.getElementById("mfBirthplace").value.trim(),
    occupation: document.getElementById("mfOccupation").value.trim(),
    employer: document.getElementById("mfEmployer").value.trim(),
    address: document.getElementById("mfAddress").value.trim(),
    phone: document.getElementById("mfPhone").value.trim(),
    phone2: document.getElementById("mfPhone2").value.trim(),
    email: document.getElementById("mfEmail").value.trim(),
    cawangan: document.getElementById("mfCawangan").value,
  };

  // Check for existing records via matching identity card values
  var existing = allRegistrations.find(function (r) {
    return (
      r.icNumber &&
      r.icNumber.replace(/[\s-]/g, "") === icNumber.replace(/[\s-]/g, "")
    );
  });

  try {
    if (existing) {
      await updateDoc(doc(db, "registrations", existing.id), newFields);
      duplicateNoticeEl.textContent = "Ahli sedia ada (" + (existing.memberId || "—") + ") dikemas kini dengan maklumat baharu.";
      duplicateNoticeEl.hidden = false;
      setTimeout(closeAddMemberModal, 1800);
    } else {
      var memberId = await generateUniqueMemberId();
      await addDoc(
        collection(db, "registrations"),
        Object.assign({}, newFields, {
          memberId: memberId,
          tier: currentTier, 
          joinAs: "ahli",
          consent: true, 
          submittedAt: serverTimestamp(),
        }),
      );
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


/* ============================================================
   Member Editing Overlay Subsystem [admin-dashboard.js]
   ============================================================ */
var editMemberOverlay = document.getElementById("editMemberOverlay");
var editMemberForm = document.getElementById("editMemberForm");
var submitEditMemberBtn = document.getElementById("submitEditMemberBtn");
var editSubmitErrorEl = document.getElementById("efSubmitError");

var efDobDay = document.getElementById("efDobDay");
var efDobMonth = document.getElementById("efDobMonth");
var efDobYear = document.getElementById("efDobYear");
populateDobDropdowns(efDobDay, efDobMonth, efDobYear);

var EDIT_FIELDS = [
  { id: "efFullName", required: true, validate: v => v.length >= 2 ? null : "Nama terlalu pendek." },
  { id: "efGender", required: true, validate: () => null },
  { id: "efIcNumber", required: true, validate: v => isValidIc(v) ? null : "Format tidak sah (12 digit)." },
  { id: "efBirthplace", required: true, validate: () => null },
  { id: "efOccupation", required: true, validate: () => null },
  { id: "efEmployer", required: false, validate: () => null },
  { id: "efAddress", required: true, validate: () => null },
  { id: "efPhone", required: true, validate: v => isValidPhone(v) ? null : "Format tidak sah." },
  { id: "efPhone2", required: false, validate: v => !v || isValidPhone(v) ? null : "Format tidak sah." },
  { id: "efEmail", required: false, validate: v => !v || isValidEmail(v) ? null : "E-mel tidak sah." },
  { id: "efCawangan", required: true, validate: () => null },
];

function validateAllEdit() {
  var results = EDIT_FIELDS.map(f => validateField(f, true));
  results.push(validateDobFields("efDobDay", "efDobMonth", "efDobYear", "err-efDob"));
  return results.every(Boolean);
}

function updateEditSubmitState() {
  submitEditMemberBtn.disabled = !validateAllEdit();
}

EDIT_FIELDS.forEach(function (f) {
  var el = document.getElementById(f.id);
  if (el) {
    el.addEventListener("input", updateEditSubmitState);
    el.addEventListener("blur", updateEditSubmitState);
  }
});
[efDobDay, efDobMonth, efDobYear].forEach(el => el.addEventListener("change", updateEditSubmitState));

function openEditMemberModal(m) {
  editMemberForm.reset();
  EDIT_FIELDS.forEach(f => {
    var el = document.getElementById(f.id);
    if (el) el.closest(".mf-field").classList.remove("is-invalid");
    var errEl = document.getElementById("err-" + f.id);
    if (errEl) errEl.textContent = "";
  });
  document.getElementById("err-efDob").textContent = "";
  efDobDay.closest(".mf-field").classList.remove("is-invalid");

  // Populate data
  document.getElementById("efId").value = m.id;
  document.getElementById("efFullName").value = m.fullName || "";
  document.getElementById("efGender").value = m.gender || "";
  document.getElementById("efIcNumber").value = m.icNumber || "";
  document.getElementById("efBirthplace").value = m.birthplace || "";
  document.getElementById("efOccupation").value = m.occupation || "";
  document.getElementById("efEmployer").value = m.employer || "";
  document.getElementById("efAddress").value = m.address || "";
  document.getElementById("efPhone").value = m.phone || "";
  document.getElementById("efPhone2").value = m.phone2 || "";
  document.getElementById("efEmail").value = m.email || "";
  document.getElementById("efCawangan").value = m.cawangan || "";

  // Set cawangan trigger defaults
  var editCawLabel = document.getElementById("editCawanganTriggerLabel");
  var editCawTrigger = document.getElementById("editCawanganTrigger");
  if (m.cawangan) {
    editCawLabel.textContent = m.cawangan;
    editCawTrigger.classList.add("has-value");
  } else {
    editCawLabel.textContent = "Pilih cawangan (PDM)";
    editCawTrigger.classList.remove("has-value");
  }

  // Prepopulate Dob select options
  if (m.dob && typeof m.dob === "string") {
    var parts = m.dob.split("-");
    if (parts.length === 3) {
      efDobYear.value = String(parseInt(parts[0], 10));
      efDobMonth.value = String(parseInt(parts[1], 10));
      efDobDay.value = String(parseInt(parts[2], 10));
    }
  }

  editSubmitErrorEl.hidden = true;
  updateEditSubmitState();

  editMemberOverlay.classList.add("is-open");
  editMemberOverlay.setAttribute("aria-hidden", "false");
}

function closeEditMemberModal() {
  editMemberOverlay.classList.remove("is-open");
  editMemberOverlay.setAttribute("aria-hidden", "true");
}

document.getElementById("closeEditMemberBtn").addEventListener("click", closeEditMemberModal);
document.getElementById("cancelEditMemberBtn").addEventListener("click", closeEditMemberModal);

editMemberForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!validateAllEdit()) return;

  submitEditMemberBtn.disabled = true;
  submitEditMemberBtn.textContent = "Menyimpan...";

  var mId = document.getElementById("efId").value;
  var updatedData = {
    fullName: document.getElementById("efFullName").value.trim(),
    gender: document.getElementById("efGender").value,
    icNumber: document.getElementById("efIcNumber").value.trim(),
    dob:
      document.getElementById("efDobYear").value +
      "-" +
      String(document.getElementById("efDobMonth").value).padStart(2, "0") +
      "-" +
      String(document.getElementById("efDobDay").value).padStart(2, "0"),
    birthplace: document.getElementById("efBirthplace").value.trim(),
    occupation: document.getElementById("efOccupation").value.trim(),
    employer: document.getElementById("efEmployer").value.trim(),
    address: document.getElementById("efAddress").value.trim(),
    phone: document.getElementById("efPhone").value.trim(),
    phone2: document.getElementById("efPhone2").value.trim(),
    email: document.getElementById("efEmail").value.trim(),
    cawangan: document.getElementById("efCawangan").value,
  };

  try {
    await updateDoc(doc(db, "registrations", mId), updatedData);
    closeEditMemberModal();
  } catch (err) {
    editSubmitErrorEl.textContent = "Gagal mengemas kini: " + (err && err.message ? err.message : err);
    editSubmitErrorEl.hidden = false;
  } finally {
    submitEditMemberBtn.disabled = false;
    submitEditMemberBtn.textContent = "Simpan Kemas Kini";
  }
});
