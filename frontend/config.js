// Local development uses your Express server. Before publishing, replace the
// value below with the HTTPS URL shown by Render, without a trailing slash.
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://little-nest-api.onrender.com";
