/* ============================================================
   Admin Dashboard — main logic
   ============================================================ */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, where, serverTimestamp, Timestamp
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
            detailItem("No. Telefon", r.phone) +
            detailItem("E-mel", r.email) +
            detailItem("Alamat", r.address) +
            detailItem("Mukim / Kawasan", r.mukim) +
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
