/* ============================================================
   Admin Login
   Signs in with Firebase Auth, then checks the /admins/{uid}
   allowlist doc (per rules_database.md) before redirecting to
   the dashboard. If sign-in succeeds but the account isn't on
   the allowlist, it's signed back out immediately — a valid
   Firebase Auth account alone isn't enough to get in.
   ============================================================ */
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

var form = document.getElementById("loginForm");
var emailInput = document.getElementById("loginEmail");
var passwordInput = document.getElementById("loginPassword");
var errorEl = document.getElementById("loginError");
var loginBtn = document.getElementById("loginBtn");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("is-visible");
}
function clearError() {
  errorEl.textContent = "";
  errorEl.classList.remove("is-visible");
}

function friendlyAuthError(err) {
  var code = err && err.code;
  var map = {
    "auth/invalid-email": "Format e-mel tidak sah.",
    "auth/user-not-found": "Akaun tidak ditemui.",
    "auth/wrong-password": "Kata laluan salah.",
    "auth/invalid-credential": "E-mel atau kata laluan salah.",
    "auth/too-many-requests": "Terlalu banyak percubaan. Sila cuba lagi sebentar.",
  };
  return (code && map[code]) || (err && err.message) || "Log masuk gagal. Sila cuba lagi.";
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearError();
  loginBtn.disabled = true;
  loginBtn.textContent = "Sedang log masuk...";

  try {
    var cred = await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);

    // Sign-in alone isn't enough — check the admin allowlist.
    var adminSnap = await getDoc(doc(db, "admins", cred.user.uid));
    if (!adminSnap.exists()) {
      await signOut(auth);
      showError("Akaun ini bukan admin yang disahkan. Hubungi pentadbir sistem.");
      return;
    }

    window.location.href = "admin-dashboard.html";
  } catch (err) {
    showError(friendlyAuthError(err));
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log Masuk";
  }
});
