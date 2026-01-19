// functions/tleCache.js

const admin = require("firebase-admin");
const fetch = require("node-fetch");

const TLE_CACHE_DOC = "iss_tle";
const TLE_CACHE_HOURS = 6;

async function getIssTle() {
  const db = admin.firestore();
  const ref = db.collection("cache").doc(TLE_CACHE_DOC);
  const snap = await ref.get();

  const now = Date.now();

  if (snap.exists) {
    const data = snap.data();
    const ageHours = (now - data.fetchedAt) / (1000 * 60 * 60);

    if (ageHours < TLE_CACHE_HOURS) {
      return {
        line1: data.line1,
        line2: data.line2
      };
    }
  }

  // Fetch fresh TLE
  const res = await fetch(
    "https://api.wheretheiss.at/v1/satellites/25544/tles"
  );

  if (!res.ok) {
    throw new Error("Failed to fetch ISS TLE");
  }

  const tle = await res.json();

  await ref.set({
    line1: tle.line1,
    line2: tle.line2,
    fetchedAt: now
  });

  return {
    line1: tle.line1,
    line2: tle.line2
  };
}

module.exports = {
  getIssTle
};
