import { getJSON, postJSON, escapeHTML, postFormData } from './api.js';
import { initTheme, cycleTheme } from './theme.js';
import { detectLocation } from './geolocation.js';
import { checkAuth, getCurrentUser, isLoggedIn } from './auth.js';
import { announce, populateSelect } from './utils.js';

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */
const reportForm      = document.getElementById('reportForm');
const feedback        = document.getElementById('formFeedback');
const charCounter     = document.getElementById('charCounter');
const description     = document.getElementById('description');
const latInput        = document.getElementById('latitude');
const lngInput        = document.getElementById('longitude');
const locationDisplay = document.getElementById('locationDisplay');
const useMyLocBtn     = document.getElementById('useMyLocation');
const photoPreviews   = document.getElementById('photoPreviews');
const videoPreview    = document.getElementById('videoPreview');
const navAuth         = document.getElementById('nav-auth');
const themeToggle     = document.getElementById('themeToggle');
const loginNudge      = document.getElementById('loginNudge');
const anonymousFields = document.getElementById('anonymousFields');
const photoUpload     = document.getElementById('photoUpload');
const videoUpload     = document.getElementById('videoUpload');
const photoZone       = document.getElementById('photoZone');
const videoZone       = document.getElementById('videoZone');

let locationMap, locationMarker;
let uploadedPhotos = []; // { url, upload_token }
let uploadedVideo = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function showFeedback(msg, type) {
  feedback.textContent = msg;
  feedback.className = `alert alert-${type}`;
  feedback.hidden = false;
}

function hideFeedback() {
  feedback.hidden = true;
}

/* ------------------------------------------------------------------ */
/*  Lookups                                                            */
/* ------------------------------------------------------------------ */
async function populateLookups() {
  try {
    const lookups = await getJSON('/api/lookups.php');
    populateSelect('reporterMode', lookups.reporter_modes || [], 'id', 'name');
    populateSelect('incidentType', lookups.incident_types || [], 'id', 'name');
    populateOtherParties(lookups.other_parties || []);
  } catch {
    /* fallback: selects stay with placeholder */
  }
}

function populateOtherParties(items) {
  const group = document.getElementById('otherPartiesGroup');
  if (!group) return;
  items.forEach(item => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.name = 'other_parties[]';
    cb.value = item.id;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + item.name));
    group.appendChild(label);
  });
}

/* ------------------------------------------------------------------ */
/*  Location map                                                       */
/* ------------------------------------------------------------------ */
function initLocationMap(center) {
  locationMap = L.map('locationMap').setView([center.lat, center.lng], center.zoom || 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(locationMap);

  locationMap.on('click', (e) => {
    setLocationMarker(e.latlng.lat, e.latlng.lng);
  });
}

function setLocationMarker(lat, lng) {
  latInput.value = lat.toFixed(6);
  lngInput.value = lng.toFixed(6);
  locationDisplay.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  if (locationMarker) {
    locationMarker.setLatLng([lat, lng]);
  } else {
    locationMarker = L.marker([lat, lng], { keyboard: true, title: 'Report location' }).addTo(locationMap);
  }
  locationMap.setView([lat, lng], locationMap.getZoom());
}

/* ------------------------------------------------------------------ */
/*  Char counter                                                       */
/* ------------------------------------------------------------------ */
function updateCharCounter() {
  const len = description.value.length;
  charCounter.textContent = `${len} / 2000`;
  charCounter.classList.toggle('over', len > 2000);
}

/* ------------------------------------------------------------------ */
/*  File uploads                                                       */
/* ------------------------------------------------------------------ */
async function handlePhotoSelect(files) {
  const remaining = 10 - uploadedPhotos.length;
  const toUpload = Array.from(files).slice(0, remaining);

  for (const file of toUpload) {
    try {
      announce(`Uploading ${file.name}...`);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'photo');

      const data = await postFormData('/api/reports/upload.php', fd);
      if (data) {
        uploadedPhotos.push({ url: data.url, upload_token: data.upload_token });
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = 'Uploaded photo preview';
        photoPreviews.appendChild(img);
      }
    } catch (err) {
      console.error('Photo upload failed', err);
    }
  }
  announce(`${uploadedPhotos.length} photo(s) uploaded`);
}

async function handleVideoSelect(file) {
  if (!file) return;
  try {
    announce(`Uploading video ${file.name}...`);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'video');

    const data = await postFormData('/api/reports/upload.php', fd);
    if (data) {
      uploadedVideo = { url: data.url, upload_token: data.upload_token };
      videoPreview.textContent = `Video uploaded: ${escapeHTML(file.name)}`;
    }
  } catch (err) {
    console.error('Video upload failed', err);
  }
}

function setupDragDrop(zone, handler) {
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handler(e.dataTransfer.files);
  });
}

/* ------------------------------------------------------------------ */
/*  Form submit                                                        */
/* ------------------------------------------------------------------ */
async function handleSubmit(e) {
  e.preventDefault();
  hideFeedback();

  // Honeypot check
  const honeypot = document.getElementById('anonWebsite');
  if (honeypot && honeypot.value) return;

  if (!latInput.value || !lngInput.value) {
    showFeedback('Please select a location on the map.', 'error');
    return;
  }

  const fd = new FormData(reportForm);
  const payload = {};
  for (const [k, v] of fd.entries()) {
    if (k === 'other_parties[]') {
      if (!payload.other_parties) payload.other_parties = [];
      payload.other_parties.push(v);
    } else {
      payload[k] = v;
    }
  }

  // Attach uploads
  if (uploadedPhotos.length) {
    payload.photos = uploadedPhotos.map(p => p.upload_token || p.url);
  }
  if (uploadedVideo) {
    payload.video = uploadedVideo.upload_token || uploadedVideo.url;
  }

  reportForm.setAttribute('aria-busy', 'true');
  announce('Submitting report...');

  try {
    await postJSON('/api/reports/submit.php', payload);
    showFeedback('Report submitted successfully! Thank you.', 'success');
    announce('Report submitted successfully');
    reportForm.reset();
    uploadedPhotos = [];
    uploadedVideo = null;
    photoPreviews.innerHTML = '';
    videoPreview.textContent = '';
    if (locationMarker) {
      locationMap.removeLayer(locationMarker);
      locationMarker = null;
    }
    latInput.value = '';
    lngInput.value = '';
    locationDisplay.textContent = 'No location selected';
    updateCharCounter();
  } catch (err) {
    showFeedback(`Error: ${err.message}`, 'error');
    announce('Report submission failed');
  } finally {
    reportForm.removeAttribute('aria-busy');
  }
}

/* ------------------------------------------------------------------ */
/*  Nav update                                                         */
/* ------------------------------------------------------------------ */
function updateNav() {
  if (isLoggedIn()) {
    const user = getCurrentUser();
    navAuth.innerHTML = `<a href="user_profile.html">${escapeHTML(user.username || 'Profile')}</a>`;
    loginNudge.hidden = true;
    anonymousFields.hidden = true;
  } else {
    navAuth.innerHTML = '<a href="login.html">Log In</a>';
    loginNudge.hidden = false;
    anonymousFields.hidden = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */
async function init() {
  initTheme();
  await checkAuth();
  updateNav();
  await populateLookups();

  const loc = await detectLocation();
  initLocationMap(loc);

  // Event listeners
  themeToggle.addEventListener('click', () => cycleTheme());
  description.addEventListener('input', updateCharCounter);
  reportForm.addEventListener('submit', handleSubmit);

  useMyLocBtn.addEventListener('click', async () => {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      setLocationMarker(pos.coords.latitude, pos.coords.longitude);
    } catch {
      showFeedback('Could not get your location. Please select on the map.', 'warning');
    }
  });

  photoUpload.addEventListener('change', () => handlePhotoSelect(photoUpload.files));
  videoUpload.addEventListener('change', () => handleVideoSelect(videoUpload.files[0]));

  setupDragDrop(photoZone, (files) => handlePhotoSelect(files));
  setupDragDrop(videoZone, (files) => handleVideoSelect(files[0]));

  updateCharCounter();
}

init();
