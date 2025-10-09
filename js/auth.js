// BC Development Dashboard - Authentication Module WITH AUTO-REFRESH

// Voeg toe aan auth.js - na line 1
// Force refresh on OAuth errors
window.addEventListener('error', (e) => {
  if (e.message.includes('gapi') || e.message.includes('gis')) {
    console.warn('OAuth loading error, clearing cache...');
    CacheManager.clearAll();
    setTimeout(() => location.reload(), 1000);
  }
});
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
    
    // Show loading state
    document.getElementById('projectsOverview').innerHTML = 
      '<div class="col-span-full flex justify-center py-8"><div class="loading"></div><span class="ml-3 text-gray-600">Projecten laden...</span></div>';
    
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
    
    // 🚀 START AUTO-REFRESH
    AutoRefreshManager.startProjectsRefresh();
    
    // Show cache stats in console
    const stats = CacheManager.getStats();
    console.log(`📊 Cache: ${stats.entries} entries, ${stats.sizeKB}KB used`);
  };
  
  // Request access token
  if (gapi.client.getToken() === null) {
    window.tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    window.tokenClient.requestAccessToken({ prompt: '' });
  }
}

// Show access denied message
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
    // Try cache first
    const cachedUser = CacheManager.get('user', 'current', CacheManager.EXPIRY.USER_INFO);
    if (cachedUser) {
      window.CURRENT_USER_EMAIL = cachedUser.emailAddress;
      displayUserInfo(cachedUser);
      return;
    }

    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/about',
      params: { fields: 'user' }
    });
    
    const user = response.result.user;
    window.CURRENT_USER_EMAIL = user.emailAddress;
    
    // Cache user info
    CacheManager.set('user', 'current', user);
    
    displayUserInfo(user);
  } catch (e) {
    console.error('Error loading user info:', e);
    window.CURRENT_USER_EMAIL = null;
  }
}

// Display user information with access badge
function displayUserInfo(user) {
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
}

// Handle sign out
function handleSignOut() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
  
  // Stop auto-refresh
  AutoRefreshManager.stopAll();
  
  // Clear cache
  CacheManager.clearAll();
  
  // Reset UI
  document.getElementById('authBanner').classList.remove('hidden');
  document.getElementById('userInfo').innerHTML = '';
  window.CURRENT_USER_EMAIL = null;
  
  console.log('✓ Signed out and cache cleared');
}