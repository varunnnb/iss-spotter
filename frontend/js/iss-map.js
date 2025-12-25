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

  issMarker = L.marker([0, 0])
    .addTo(map)
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
