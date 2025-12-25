// frontend/js/firebase-init.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtgZcrziqc2UNX8QBSM-C7NB0C-vdrw6w",
  authDomain: "iss-spotter-6c8ba.firebaseapp.com",
  projectId: "iss-spotter-6c8ba",
  storageBucket: "iss-spotter-6c8ba.firebasestorage.app",
  messagingSenderId: "28426982472",
  appId: "1:28426982472:web:1740e2fc3b9d579dc2347d",
  measurementId: "G-BPEXY268W5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
