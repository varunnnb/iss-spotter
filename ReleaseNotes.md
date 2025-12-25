# ISS Spotter – Version v1.0 Release Notes

Release Date: 2025-12-25
Version: v1.0  
Status: Stable Public Release

---

## Overview

Version v1.0 marks the first stable public release of **ISS Spotter**.  
This release focuses on delivering a complete, deployable, and user-friendly experience for tracking the real-time position of the International Space Station, managing user profiles, and ensuring transparency in data usage and privacy.

All core systems including authentication, location handling, map visualization, and user controls are fully functional and production-ready.

---

## Key Features Included in v1.0

### Authentication & User Management
- Google Sign-In using Firebase Authentication
- Persistent login sessions across page reloads
- Secure logout functionality
- Full account deletion support
- Independent user data deletion without removing the account

---

### Real-Time ISS Tracking
- Live ISS position displayed on an interactive world map
- Smooth, continuous movement updates
- Backend-cached ISS location data to reduce API load
- Automatic refresh without page reloads

---

### Location Management
- Location setup enforced for new users via a guided modal
- Multiple location input options:
  - City or place search using OpenStreetMap Nominatim
  - Browser-based geolocation
  - Manual latitude and longitude entry (advanced users)
- Location updates available at any time via the profile page
- Safe handling of missing or unset location data

---

### User Profile
- Display of authenticated user information (name, email, profile photo)
- Location visibility and update controls
- Notification preference toggle
- Privacy and data usage transparency
- Account and data management controls

---

### UI / UX
- Fully responsive layout
- Space-themed animated background
- Floating glass-style panels
- Dynamic star field background
- Clean separation of HTML, CSS, and JavaScript
- Consistent design language across all pages

---

### Privacy & Security
- Minimal data collection by design
- Explicit user consent for location usage
- No continuous tracking of user location
- No third-party data sharing
- Strict Firestore security rules:
  - Users can only access their own data
  - Backend-only cache collections
- Clear and detailed privacy disclosures in-app

---

### Deployment & Infrastructure
- Frontend deployed on Netlify (static hosting, CDN-backed)
- Backend powered by Firebase Cloud Functions
- Firestore used for secure, per-user data storage
- Scalable architecture with clear separation of concerns

---

## Known Limitations (Expected in v1.0)

The following features are intentionally not included in this release and are planned for future versions:

- ISS visibility time calculation
- Email notifications for ISS sightings
- Scheduled background jobs for predictions
- Email subscription previews and management
- Historical ISS pass tracking

All such features are clearly marked as “under development” within the application UI.

---

## Stability & Testing

- All major user flows tested:
  - Login and logout
  - First-time user onboarding
  - Location setup and updates
  - Dashboard rendering
  - Profile management
  - Data and account deletion
- No critical console errors in production
- Safe handling of asynchronous data loading
- Graceful fallbacks for missing or delayed data

---

## Upgrade Notes

This is the initial public release.  
No migration steps are required.

Future versions will maintain backward compatibility with existing user data stored in Firestore.

---

## What’s Next

Planned for upcoming releases:
- ISS visibility prediction logic
- Scheduled email notifications
- Orbit path enhancements
- Improved onboarding animations
- Performance and UX refinements

---

## Acknowledgements

ISS Spotter v1.0 was developed with a focus on clean architecture, user trust, and long-term scalability.

---

End of v1.0 Release Notes



# ISS Spotter – Version v1.1 Release Notes

Release Date: 2025-12-25 
Version: v1.1  
Status: Incremental Feature Update

---

## Overview

Version v1.1 builds on the stable v1.0 release by improving user onboarding, location handling flexibility, and data transparency. This update focuses on giving users more control over how their location is provided and clearly communicating data usage across the application.

No breaking changes were introduced in this release.

---

## What’s New in v1.1

### Location Setup Improvements
- Added a guided **location setup modal** for new users
- Location is now mandatory to configure before using the dashboard, preventing invalid states
- Users can choose how to provide location via:
  - City or place search
  - Browser-based geolocation
  - Manual latitude and longitude entry
- Location setup is reusable and consistent across:
  - Initial onboarding
  - Profile page location updates

---

### Manual Location Entry
- Users can now fully use the application **without granting browser location access**
- Advanced users can manually enter precise latitude and longitude values
- Only the most recent location is stored; no history is retained

---

### Profile Page Enhancements
- Integrated the same location setup modal into the profile page
- Improved clarity around location updates and stored values
- Enhanced user control over location data without leaving the profile page

---

### Privacy & Consent Updates
- Updated onboarding consent text to reflect:
  - Optional browser location access
  - Manual and city-based location entry
- Expanded privacy disclosure on the profile page to include:
  - Clear explanation of email usage
  - Notification of future version and update emails
  - Explicit confirmation that all emails are plain text only
  - No sponsored, promotional, or marketing content
- Improved transparency around data storage, usage, and user rights

---

### UI & Structure Improvements
- Refactored dashboard layout by separating HTML and CSS for better maintainability
- Improved consistency between dashboard and profile UI components
- Maintained existing space-themed design and animations

---

## Notes

- All new features are optional and user-controlled
- Existing users are not required to reconfigure location unless they choose to
- Backend architecture remains unchanged and fully compatible

---

## What’s Next

Planned for future releases:
- ISS visibility prediction calculations
- Scheduled email notifications for ISS sightings
- Orbit path visualization enhancements

---

End of v1.1 Release Notes
