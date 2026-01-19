import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* 🔗 Cloud Function */
const ISS_API =
  "https://us-central1-iss-spotter-6c8ba.cloudfunctions.net/getISSLocation";

let map;
let issMarker;
let userMarker;
let mapInitialized = false;


// 🔗 TLE public endpoint (Cloud Function)
const TLE_API =
  "https://us-central1-iss-spotter-6c8ba.cloudfunctions.net/getIssTlePublic";

// Orbit track settings
const ORBIT_MINUTES = 90;
const ORBIT_STEP_SECONDS = 60;
const ORBIT_REFRESH_MS = 30000;

let orbitLines = [];
let orbitTimer = null;



/* ---------- AUTH ---------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  // ✅ SAFELY read location
  const location = snap.exists() ? snap.data().location : null;

  // Fallback if location not yet set
  const lat =
    location && typeof location.lat === "number"
      ? location.lat
      : 0;

  const lon =
    location && typeof location.lon === "number"
      ? location.lon
      : 0;

  initMap(lat, lon, !!location);
  startISSUpdates();

  // ➰ Orbit track
updateOrbitTrack();

if (orbitTimer) clearInterval(orbitTimer);
orbitTimer = setInterval(updateOrbitTrack, ORBIT_REFRESH_MS);

});

/* ---------- MAP INIT ---------- */
function initMap(lat, lon, hasUserLocation) {
  // Safe default view
  map = L.map("map").setView([lat, lon], hasUserLocation ? 4 : 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // User marker only if location exists
  if (hasUserLocation) {
    userMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup("📍 Your Location");
  }

issMarker = L.marker([0, 0], {
  icon: L.divIcon({
    className: "iss-emoji",
    html: "🛰️",
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}).addTo(map)
  .bindPopup("🛰 ISS");

  mapInitialized = true;
}

/* ---------- ISS UPDATES ---------- */
function startISSUpdates() {
  fetchISS();
  setInterval(fetchISS, 5000);
}

async function fetchISS() {
  try {
    const res = await fetch(ISS_API);
    const data = await res.json();

    const { latitude, longitude } = data;

    // ✅ Guard against bad API data
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return;
    }

    issMarker.setLatLng([latitude, longitude]);

    // Smooth pan (only after map exists)
    if (mapInitialized) {
      map.panTo([latitude, longitude], {
        animate: true,
        duration: 1,
      });
    }
  } catch (err) {
    console.error("ISS fetch failed", err);
  }
}

function clearOrbitLines() {
  orbitLines.forEach((line) => {
    try {
      map.removeLayer(line);
    } catch (e) {}
  });
  orbitLines = [];
}

function drawOrbitSegments(segments) {
  clearOrbitLines();

  segments.forEach((seg) => {
    if (seg.length < 2) return;

    const line = L.polyline(seg, {
      color: "#2ecbff",
      weight: 2,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(map);

    // add glow class to the SVG path (after it exists)
    setTimeout(() => {
      const el = line.getElement();
      if (el) el.classList.add("iss-orbit-glow");
    }, 50);

    orbitLines.push(line);
  });
}


async function updateOrbitTrack() {
  try {
    if (!map) return;

    // 1) Fetch TLE
    const tleRes = await fetch(TLE_API);
    const tleData = await tleRes.json();

    if (!tleData.line1 || !tleData.line2) {
      console.warn("TLE missing from response", tleData);
      return;
    }

    // 2) Convert TLE → satrec
    const satrec = satellite.twoline2satrec(tleData.line1, tleData.line2);

    // 3) Generate points for next 90 minutes
    const now = new Date();
    const points = [];

    for (let t = 0; t <= ORBIT_MINUTES * 60; t += ORBIT_STEP_SECONDS) {
      const time = new Date(now.getTime() + t * 1000);

      const pv = satellite.propagate(satrec, time);
      if (!pv.position) continue;

      const gmst = satellite.gstime(time);
      const geo = satellite.eciToGeodetic(pv.position, gmst);

      const lat = satellite.radiansToDegrees(geo.latitude);
      const lon = satellite.radiansToDegrees(geo.longitude);

      points.push([lat, lon]);
    }

// 4) Draw (split at dateline)
const segments = [];
let currentSeg = [];

for (let i = 0; i < points.length; i++) {
  const [lat, lon] = points[i];

  if (currentSeg.length === 0) {
    currentSeg.push([lat, lon]);
    continue;
  }

  const prevLon = currentSeg[currentSeg.length - 1][1];

  // If jump > 180 degrees, we crossed the dateline → split the polyline
  if (Math.abs(lon - prevLon) > 180) {
    segments.push(currentSeg);
    currentSeg = [];
  }

  currentSeg.push([lat, lon]);
}

if (currentSeg.length > 0) segments.push(currentSeg);

drawOrbitSegments(segments);

  } catch (err) {
    console.error("Orbit track update failed:", err);
  }
}

