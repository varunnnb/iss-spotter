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
    // Fresh user
    await setDoc(userRef, {
    email: user.email,
    locationSet: snap.exists() ? snap.data().locationSet ?? false : false,
    notifyByEmail: snap.exists() ? snap.data().notifyByEmail ?? false : false,
    createdAt: snap.exists() ? snap.data().createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp()
    }, { merge: true });

  } else {
    // 🔥 Repair missing fields if doc already exists
    const data = snap.data();
    const updates = {};

    if (!data.email) updates.email = user.email;
    if (data.locationSet === undefined) updates.locationSet = !!data.location;
    if (data.notifyByEmail === undefined) updates.notifyByEmail = false;
    if (!data.createdAt) updates.createdAt = serverTimestamp();

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(userRef, updates);
    }
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
