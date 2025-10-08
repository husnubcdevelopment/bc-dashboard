// BC Development Dashboard - Authentication Module

// Global state
window.gapiInited = false;
window.gisInited = false;
window.tokenClient = null;
window.CURRENT_USER_EMAIL = null;

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
    
    // Load user info and check access
    await loadUserInfo();
    
    // Check if user has any access
    if (!window.CURRENT_USER_EMAIL) {
      showAccessDenied('Kan gebruiker niet identificeren');
      return;
    }
    
    // Discover projects from Drive
    let allProjects = [];
    
    // Check if user has direct access (external users with specific folder IDs)
    if (hasDirectAccess(window.CURRENT_USER_EMAIL)) {
      console.log('Using direct folder access for:', window.CURRENT_USER_EMAIL);
      allProjects = await discoverProjectsFromDirectAccess(window.CURRENT_USER_EMAIL);
    } else if (typeof PROJECTS_ROOT_FOLDER_ID !== 'undefined' && PROJECTS_ROOT_FOLDER_ID) {
      // Domain users: discover from parent folder
      console.log('Using parent folder access for:', window.CURRENT_USER_EMAIL);
      allProjects = await discoverProjectsFromDrive();
    }
    
    // Filter projects based on user permissions
    const accessibleProjects = filterProjectsByAccess(allProjects, window.CURRENT_USER_EMAIL);
    
    if (accessibleProjects.length === 0) {
      showAccessDenied(`Geen toegang tot projecten voor ${window.CURRENT_USER_EMAIL}`);
      return;
    }
    
    window.DYNAMIC_PROJECTS = accessibleProjects;
    renderProjectsOverview(accessibleProjects);
    
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

// **NEW: Show access denied message**
function showAccessDenied(message) {
  const banner = document.getElementById('authBanner');
  banner.classList.remove('hidden');
  banner.className = 'bg-red-50 border-b border-red-300 p-3 text-center';
  banner.innerHTML = `
    <span class="text-red-800 font-medium">🚫 ${message}</span>
    <p class="text-sm text-red-600 mt-1">Neem contact op met de beheerder voor toegang.</p>
  `;
  
  document.getElementById('projectsOverview').innerHTML = 
    `<div class="text-red-500 text-center">Geen toegang. Neem contact op met BC Development.</div>`;
}

// Load and display user information
async function loadUserInfo() {
  try {
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/about',
      params: { fields: 'user' }
    });
    
    const user = response.result.user;
    window.CURRENT_USER_EMAIL = user.emailAddress;
    
    // Check if user has access
    const domain = user.emailAddress.split('@')[1];
    const hasFullAccess = ALLOWED_DOMAINS.includes(domain);
    const hasLimitedAccess = PROJECT_PERMISSIONS[user.emailAddress];
    
    let accessBadge = '';
    if (hasFullAccess) {
      accessBadge = '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Volledige toegang</span>';
    } else if (hasLimitedAccess) {
      const projectCount = hasLimitedAccess.allowedProjects.length;
      accessBadge = `<span class="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Toegang tot ${projectCount} project(en)</span>`;
    }
    
    document.getElementById('userInfo').innerHTML = `
      <span class="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
        <span class="pulse-dot"></span>
        <span class="font-medium text-green-800">Verbonden als ${user.displayName}</span>
        ${accessBadge}
      </span>
    `;
  } catch (e) {
    console.error('Error loading user info:', e);
    window.CURRENT_USER_EMAIL = null;
  }
}