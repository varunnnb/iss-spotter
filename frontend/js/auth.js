// frontend/js/auth.js

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Ensure a user document exists.
 * Called after login (safe to call multiple times).
 */
export async function createUserIfMissing(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      locationSet: false,
      notifyByEmail: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * Save user location (called ONLY after user consent).
 */
export async function saveUserLocation(user, lat, lon) {
  const userRef = doc(db, "users", user.uid);

  await updateDoc(userRef, {
    location: {
      lat,
      lon
    },
    locationSet: true,
    updatedAt: serverTimestamp()
  });
}

/**
 * Fetch user profile data.
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
