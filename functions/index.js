const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const CACHE_TTL = 5000; // 5 seconds

exports.getISSLocation = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const cacheRef = db.collection("cache").doc("iss");
      const cacheSnap = await cacheRef.get();
      const now = Date.now();

      // Serve cached data if valid
      if (cacheSnap.exists) {
        const cached = cacheSnap.data();
        if (now - cached.timestamp < CACHE_TTL) {
          return res.json(cached.data);
        }
      }

      // Fetch fresh ISS data
      const response = await fetch(
        "https://api.wheretheiss.at/v1/satellites/25544"
      );

      if (!response.ok) {
        return res.status(500).json({ error: "ISS API failed" });
      }

      const data = await response.json();

      await cacheRef.set({
        data,
        timestamp: now,
      });

      return res.json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});
