const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

const { getIssTle } = require("./tleCache");
const { computeNextVisiblePass } = require("./issVisibility");


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


exports.computeNextVisiblePass = functions
  .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
    try {
      // 🔐 Check Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing auth token" });
      }

      const idToken = authHeader.split("Bearer ")[1];

      // 🔑 Verify Firebase ID token
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;

      const db = admin.firestore();

      // 📍 Fetch user location
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userSnap.data();
      if (!user.location || !user.location.lat || !user.location.lon) {
        return res.json({ status: "no_location" });
      }

      // 🛰 Fetch cached TLE
      const tle = await getIssTle();

      // 🧮 Compute next visible pass
      const pass = await computeNextVisiblePass({
        tleLine1: tle.line1,
        tleLine2: tle.line2,
        observerLat: user.location.lat,
        observerLon: user.location.lon
      });

      if (!pass) {
        await db.collection("users").doc(uid).update({
          nextPass: null,
          nextPassComputedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.json({ status: "none" });
      }

      // 💾 Store result
      await db.collection("users").doc(uid).update({
        nextPass: {
          startTime: pass.startTime,
          endTime: pass.endTime,
          durationSec: pass.durationSec,
          maxElevationDeg: pass.maxElevationDeg
        },
        nextPassComputedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.json({
        status: "ok",
        nextPass: {
          startTime: pass.startTime,
          endTime: pass.endTime,
          durationSec: pass.durationSec,
          maxElevationDeg: pass.maxElevationDeg
        }
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
    })
  });

exports.getIssTlePublic = functions.https.onRequest(async (req, res) => {
  try {
    // ✅ CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const tle = await getIssTle();

    return res.json({
      status: "ok",
      line1: tle.line1,
      line2: tle.line2,
    });
  } catch (err) {
    console.error("getIssTlePublic error:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
});



exports.getIssLivePublic = functions
  .https.onRequest(async (req, res) => {
    try {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      const snap = await admin.firestore().collection("cache").doc("iss").get();

      if (!snap.exists) {
        return res.status(404).json({
          status: "error",
          message: "ISS cache not found"
        });
      }

      const data = snap.data();

      // Return only what you need for widget
      return res.json({
        status: "ok",
        latitude: data.data.latitude,
        longitude: data.data.longitude,
        altitude: data.data.altitude,
        velocity: data.data.velocity,
        timestamp: data.timestamp
      });
    } catch (err) {
      console.error("getIssLivePublic error:", err);
      return res.status(500).json({
        status: "error",
        message: "Internal server error"
      });
    }
  });

