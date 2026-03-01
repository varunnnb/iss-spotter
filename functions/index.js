const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

const { getIssTle } = require("./tleCache");
const { computeNextVisiblePass } = require("./issVisibility");


// Gen 2 imports
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");


const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

console.log("Brevo key exists:", !!process.env.BREVO_API_KEY);

admin.initializeApp();
const db = admin.firestore();

const CACHE_TTL = 5000; // 5 seconds

async function computeAndStoreNextPassForUser(uid) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return;

  const user = userSnap.data();

  if (!user.location || typeof user.location.lat !== "number" || typeof user.location.lon !== "number") {
    // No location → nothing to compute
    return;
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

  // 💾 Store result (pass can be null)
  if (!pass) {
    await userRef.set(
      {
        nextPass: null,
        nextPassComputedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return;
  }

  await userRef.set(
    {
      nextPass: {
        startTime: pass.startTime,
        endTime: pass.endTime,
        durationSec: pass.durationSec,
        maxElevationDeg: pass.maxElevationDeg
      },
      nextPassComputedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}




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


exports.refreshNextPassAllUsers = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "UTC",
  },
  async (event) => {
    console.log("Running refreshNextPassAllUsers (6h schedule)...");

    const snapshot = await db.collection("users").get();

    for (const doc of snapshot.docs) {
      try {
        await computeAndStoreNextPassForUser(doc.id);
        console.log(`Updated nextPass for ${doc.id}`);
      } catch (err) {
        console.error(`Failed for ${doc.id}`, err.message);
      }
    }

    console.log("refreshNextPassAllUsers completed");
  }
);
  
exports.onUserLocationUpdateRecomputePass = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;

    if (!event.data.after.exists) {
      return;
    }

    const after = event.data.after.data();
    const before = event.data.before.exists
      ? event.data.before.data()
      : null;

    if (
      !after.location ||
      typeof after.location.lat !== "number" ||
      typeof after.location.lon !== "number"
    ) {
      return;
    }

    let locationChanged = false;
    let locationUpdatedAtChanged = false;

    if (!before || !before.location) {
      locationChanged = true;
    } else {
      locationChanged =
        before.location.lat !== after.location.lat ||
        before.location.lon !== after.location.lon;
    }

    if (!before || !before.locationUpdatedAt) {
      locationUpdatedAtChanged = true;
    } else if (after.locationUpdatedAt) {
      locationUpdatedAtChanged =
        before.locationUpdatedAt.toMillis() !==
        after.locationUpdatedAt.toMillis();
    }

    if (!locationChanged && !locationUpdatedAtChanged) {
      return;
    }

    console.log(
      `Location updated for ${uid}, recomputing nextPass...`
    );

    try {
      await computeAndStoreNextPassForUser(uid);
      console.log(`nextPass recomputed for ${uid}`);
    } catch (err) {
      console.error(`Failed recompute for ${uid}`, err.message);
    }
  }
);


exports.sendIssPassEmails = onSchedule(
  {
    schedule: "every 12 hours",
    timeZone: "UTC",
    secrets: ["BREVO_API_KEY"],
  },
  async () => {
    console.log("Running ISS email job");

    const snapshot = await db
      .collection("users")
      // .where("notifyByEmail", "==", true)
      .get();

    const now = Date.now();
    let sent = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.email || !data.nextPass) continue;

      const start = data.nextPass.startTime?.toDate?.();
      if (!start) continue;

      const diffHours = (start.getTime() - now) / 3600000;
      if (diffHours < 0 || diffHours > 12) continue;

      const BODY = `Yo Alien!,

The ISS will be visible from your location soon.

Start: ${start.toLocaleString()}
Duration: ${Math.round(data.nextPass.durationSec)} seconds
Max elevation: ${data.nextPass.maxElevationDeg.toFixed(1)}°

Open ISS Spotter to view details:
https://iss-spot.netlify.app/dashboard.html


ISS Spotter
`;

      try {
        await brevo.transactionalEmails.sendTransacEmail({
          subject: "ISS visible soon from your location",
          textContent: BODY,
          sender: { name: "ISS Spotter", email: "pinky96nb@gmail.com" },
          to: [{ email: data.email }],
        });

        sent++;
        console.log("Sent to", data.email);
      } catch (err) {
        console.error("Email failed", data.email, err);
      }
    }

    console.log("Done. Sent", sent);
  }
);