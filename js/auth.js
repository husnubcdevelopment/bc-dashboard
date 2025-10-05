// BC Development Dashboard - Authentication Module

// Global state
window.gapiInited = false;
window.gisInited = false;
window.tokenClient = null;

// Initialize Google API Client
window.gapiLoaded = function() {
  gapi.load('client', initializeGapiClient);
};

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
    });
    window.gapiInited = true;
    maybeEnableButtons();
  } catch (e) {
    console.error('GAPI init error:', e);
  }
}

// Initialize Google Identity Services
window.gisLoaded = function() {
  try {
    window.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: window.CLIENT_ID,
      scope: window.SCOPES,
      callback: '',
    });
    window.gisInited = true;
    maybeEnableButtons();
  } catch (e) {
    console.error('GIS init error:', e);
  }
};

// Enable auth button when both APIs are ready
function maybeEnableButtons() {
  if (window.gapiInited && window.gisInited) {
    document.getElementById('authBanner').classList.remove('hidden');
  }
}

// Handle authentication click
async function handleAuthClick() {
  window.tokenClient.callback = async (resp) => {
    if (resp.error) {
      console.error('Auth error:', resp);
      return;
    }
    
    // Hide auth banner
    document.getElementById('authBanner').classList.add('hidden');
    
    // Load user info
    await loadUserInfo();
    
    // Discover projects from Drive
    if (typeof PROJECTS_ROOT_FOLDER_ID !== 'undefined' && PROJECTS_ROOT_FOLDER_ID) {
      const projects = await discoverProjectsFromDrive();
      window.DYNAMIC_PROJECTS = projects;
      renderProjectsOverview(projects);
    }
    
    // Populate project selector
    await populateProjectSelector();
  };

  // Request access token
  if (gapi.client.getToken() === null) {
    window.tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    window.tokenClient.requestAccessToken({ prompt: '' });
  }
}

// Load and display user information
async function loadUserInfo() {
  try {
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/about',
      params: { fields: 'user' }
    });
    
    const user = response.result.user;
    document.getElementById('userInfo').innerHTML = `
      <span class="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
        <span class="pulse-dot"></span>
        <span class="font-medium text-green-800">Verbonden als ${user.displayName}</span>
      </span>
    `;
  } catch (e) {
    console.error('Error loading user info:', e);
  }
}