/* ============================================================
   Firebase configuration
   ============================================================
   1. Go to https://console.firebase.google.com
   2. Create a project (or open your existing one).
   3. Build → Firestore Database → Create database
      - Pick a region close to Malaysia (e.g. asia-southeast1)
      - Start in Production mode
   4. Project settings (gear icon) → General → "Your apps"
      → click the </> (Web) icon → register an app
      → Firebase shows you a firebaseConfig object.
   5. Copy those exact values into FIREBASE_CONFIG below.
   6. Firestore Database → Rules tab → paste the rules shown in
      FIRESTORE_RULES.md (see the project root) → Publish.

   This file intentionally has no secrets to "hide" — the
   Firebase Web API key is not a security boundary by itself.
   Real protection comes from the Firestore security rules
   (step 6), which control who can read/write what.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your project's config (from Firebase Console → Project settings → General).
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyByJ0nV6JBflxmGWNdYRJniPjhZuM0SU2Q",
  authDomain: "wawasandatabase.firebaseapp.com",
  projectId: "wawasandatabase",
  storageBucket: "wawasandatabase.firebasestorage.app",
  messagingSenderId: "396621564207",
  appId: "1:396621564207:web:81d534d5a72ff82dee39da",
  measurementId: "G-9KBE0FYVGJ",
};

export const isFirebaseConfigured = FIREBASE_CONFIG.apiKey !== "REPLACE_ME";

export const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Analytics is optional and unrelated to the form's save/ID-generation
// flow — wrapped in try/catch so an ad-blocker or unsupported browser
// environment can never break form submission.
export var analytics = null;
try {
  var { getAnalytics, isSupported } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js");
  if (await isSupported()) {
    analytics = getAnalytics(firebaseApp);
  }
} catch (e) {
  // Analytics unavailable — safe to ignore, the form still works.
}
