# ISS Spotter

ISS Spotter is a web application that allows users to track the real-time position of the International Space Station (ISS) and receive notifications when the ISS is visible from their location. The project focuses on accuracy, transparency in data usage, and a clean user experience.

The application is designed to be lightweight, scalable, and privacy-respecting, using modern web technologies and a serverless backend.

---

## Features

### Current Features

- Google authentication using Firebase Authentication  
- Real-time ISS position tracking on an interactive map  
- Smooth ISS movement updates with backend caching  
- Secure user profile management  
- Location management with multiple input methods:
  - City or place search
  - Browser-based geolocation
  - Manual latitude and longitude entry
- User-controlled notification preference toggle  
- Detailed privacy and data usage transparency  
- Account deletion and user data deletion support  
- Fully responsive, space-themed UI  

### Upcoming Features

- ISS visibility prediction for user location  
- Email notifications on days when the ISS is visible  
- Improved orbital path visualization  
- Email subscription management and previews  

---

## Tech Stack

### Frontend
- HTML5  
- CSS3  
- Vanilla JavaScript  
- Leaflet.js for map rendering  

### Backend
- Firebase Authentication  
- Cloud Firestore  
- Firebase Cloud Functions  

### APIs and Data Sources
- OpenStreetMap (Leaflet tiles)  
- OpenStreetMap Nominatim for geocoding  
- WhereTheISS.at API (proxied and cached via Cloud Functions)  

### Hosting
- Netlify for frontend deployment  
- Firebase for backend services  

---

## Project Structure

```
└── 📁iss-spotter
    └── 📁frontend
        └── 📁assets
            └── 📁fonts
            └── 📁images
        └── 📁css
            ├── dashboard.css
            ├── index.css
            ├── login.css
            ├── profile.css
        └── 📁js
            ├── api.js
            ├── auth.js
            ├── firebase-init.js
            ├── iss-map.js
            ├── location.js
            ├── ui.js
        ├── dashboard.html
        ├── index.html
        ├── login.html
        ├── profile.html
    └── 📁functions
        ├── .gitignore
        ├── index.js
        ├── package-lock.json
        ├── package.json
    ├── .firebaserc
    ├── .gitignore
    ├── firebase.json
    ├── firestore.indexes.json
    ├── firestore.rules
    └── README.md
```


---

## Authentication Flow

- Users authenticate using Google Sign-In via Firebase Authentication  
- Authentication state is persisted securely across sessions  
- Unauthorized users are redirected to the login page  
- User profile data is stored per authenticated user in Firestore  

---

## Location Handling

ISS Spotter requires a user location to calculate visibility.

Location is collected only when:
- A user explicitly allows browser location access  
- A user selects a city or place  
- A user manually enters coordinates  

The application does not track users continuously and does not store historical movement data.

---

## Privacy and Data Usage

The application stores only the minimum data required for functionality.

Stored data includes:
- Google display name  
- Email address  
- Last provided geographic coordinates  
- Notification preference  

The application does not:
- Track real-time user movement  
- Collect browsing or device data  
- Share data with third parties  
- Send marketing or promotional emails  

Users can delete their stored data or their entire account at any time.

---

## Firestore Security Rules

All database access is protected by strict Firestore rules:

- Users can only read and write their own data  
- Backend cache collections are inaccessible from the frontend  
- All access requires valid authentication  

---

### Frontend

The frontend is deployed using Netlify.

- Static hosting  
- Global CDN  
- HTTPS by default  
- No server-side rendering required  

### Backend

Firebase Cloud Functions handle:
- ISS API requests  
- Response caching  
- Future scheduled tasks for email notifications  

---


## Security Notes

Firebase Web API keys used in this project are public by design and protected by:
- Firebase Authentication  
- Firestore Security Rules  

API keys can be restricted by domain through Google Cloud Console for additional safety.

---

## Roadmap

- Implement ISS visibility prediction logic  
- Add scheduled email notifications  
- Improve orbit visualization  
- Add unsubscribe and email preference management  
- Performance optimizations and caching improvements  

---



## Author

Developed by Varun Bhargava.
