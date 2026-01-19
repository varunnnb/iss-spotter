// functions/issVisibility.js

const satellite = require("satellite.js");

/**
 * CONSTANTS (LOCKED)
 */
const SCAN_HOURS = 72;
const STEP_SECONDS = 30;
const SUN_ALTITUDE_THRESHOLD_DEG = -6; // civil twilight

/**
 * Compute Sun position in ECI coordinates
 * (standard low-precision astronomy formula)
 */
function getSunVectorEci(date) {
  const rad = Math.PI / 180;

  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;

  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;

  const lambda =
    L +
    1.915 * Math.sin(g * rad) +
    0.020 * Math.sin(2 * g * rad);

  const epsilon = 23.439 - 0.0000004 * n;

  return {
    x: Math.cos(lambda * rad),
    y: Math.cos(epsilon * rad) * Math.sin(lambda * rad),
    z: Math.sin(epsilon * rad) * Math.sin(lambda * rad)
  };
}

/**
 * Main entry:
 * Computes next visible ISS pass for a given observer.
 */
async function computeNextVisiblePass({
  tleLine1,
  tleLine2,
  observerLat,
  observerLon,
  startTime = new Date()
}) {
  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

  const observerGd = {
    latitude: satellite.degreesToRadians(observerLat),
    longitude: satellite.degreesToRadians(observerLon),
    height: 0
  };

  const endTime = new Date(
    startTime.getTime() + SCAN_HOURS * 3600 * 1000
  );

  let currentPass = null;
  const passes = [];

  for (
    let t = new Date(startTime);
    t <= endTime;
    t = new Date(t.getTime() + STEP_SECONDS * 1000)
  ) {
    const visibility = checkVisibilityAtTime(
      satrec,
      observerGd,
      t
    );

    if (visibility.visible) {
      if (!currentPass) {
        currentPass = {
          startTime: new Date(t),
          endTime: new Date(t),
          maxElevationDeg: visibility.elevationDeg
        };
      } else {
        currentPass.endTime = new Date(t);
        currentPass.maxElevationDeg = Math.max(
          currentPass.maxElevationDeg,
          visibility.elevationDeg
        );
      }
    } else if (currentPass) {
      finalizePass(currentPass);
      passes.push(currentPass);
      currentPass = null;
    }
  }

  if (currentPass) {
    finalizePass(currentPass);
    passes.push(currentPass);
  }

  return passes.length > 0 ? passes[0] : null;
}

/**
 * Checks ISS visibility at a specific time.
 */
function checkVisibilityAtTime(satrec, observerGd, time) {
  const pv = satellite.propagate(satrec, time);
  if (!pv.position) return { visible: false };

  const gmst = satellite.gstime(time);
  const positionEcf = satellite.eciToEcf(pv.position, gmst);

  const lookAngles = satellite.ecfToLookAngles(
    observerGd,
    positionEcf
  );

  const elevationDeg = satellite.radiansToDegrees(
    lookAngles.elevation
  );

  if (elevationDeg <= 9) return { visible: false };

  const observerDark = isObserverInDarkness(time, observerGd);
  const issSunlit = isIssSunlit(pv.position, time);

  return {
    visible: observerDark && issSunlit,
    elevationDeg
  };
}

/**
 * Determines if observer is in darkness
 * (Sun below civil twilight)
 */
function isObserverInDarkness(date, observerGd) {
  const sunEci = getSunVectorEci(date);
  const gmst = satellite.gstime(date);
  const sunEcf = satellite.eciToEcf(sunEci, gmst);

  const lookAngles = satellite.ecfToLookAngles(
    observerGd,
    sunEcf
  );

  const sunElevationDeg = satellite.radiansToDegrees(
    lookAngles.elevation
  );

  return sunElevationDeg < SUN_ALTITUDE_THRESHOLD_DEG;
}

/**
 * Determines if ISS is illuminated by the Sun
 * (not inside Earth's shadow)
 */
function isIssSunlit(issEci, date) {
  const sunEci = getSunVectorEci(date);

  const dot =
    issEci.x * sunEci.x +
    issEci.y * sunEci.y +
    issEci.z * sunEci.z;

  const issDist = Math.sqrt(
    issEci.x ** 2 +
    issEci.y ** 2 +
    issEci.z ** 2
  );

  const earthRadiusKm = 6378.137;
  const angle = Math.acos(dot / issDist);

  return issDist * Math.sin(angle) > earthRadiusKm;
}

/**
 * Finalize pass metadata.
 */
function finalizePass(pass) {
  pass.durationSec =
    (pass.endTime - pass.startTime) / 1000;
}

/**
 * EXPORT
 */
module.exports = {
  computeNextVisiblePass
};
