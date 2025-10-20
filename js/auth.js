// BC Development Dashboard - Authentication Module

// Handle authentication click
async function handleAuthClick() {
  // SAFETY CHECK: Ensure tokenClient exists
  if (!window.tokenClient) {
    console.error('❌ Token client not initialized yet');
    alert('Authenticatie is nog niet klaar. Probeer het over een paar seconden opnieuw.');
    return;
  }
  
  if (!window.gapiInited || !window.gisInited) {
    console.error('❌ APIs not fully initialized');
    alert('Google APIs zijn nog aan het laden. Probeer het over een paar seconden opnieuw.');
    return;
  }
  
  window.tokenClient.callback = async (resp) => {
    if (resp.error) {
      console.error('Auth error:', resp);
      return;
    }
    
    // Hide auth banner
    document.getElementById('authBanner').classList.add('hidden');
    
    // Show loading state in BOTH dashboard and list view
    document.getElementById('dashboardWidgets').innerHTML = 
      '<div class="col-span-full flex justify-center py-8"><div class="loading"></div><span class="ml-3 text-gray-600">Dashboard laden...</span></div>';
    
    document.getElementById('projectsOverview').innerHTML = 
      '<div class="col-span-full flex justify-center py-8"><div class="loading"></div><span class="ml-3 text-gray-600">Projecten ophalen...</span></div>';
    
    // Discover projects (FAST - no categories yet)
    const allProjects = await discoverProjects();
    
    if (allProjects.length === 0) {
      showNoAccess();
      return;
    }
    
    // Display user info
    await displayUserInfo(allProjects.length);
    
    // Store projects globally
    window.DYNAMIC_PROJECTS = allProjects;
    
    // 🆕 Render BOTH dashboard widgets AND project cards
    console.log('🎨 Rendering dashboard widgets for', allProjects.length, 'projects');
    renderDashboardWidgets(allProjects);  // Dashboard view
    renderProjectsOverview(allProjects);  // List view
    
    // Populate project selector
    await populateProjectSelector();
    
    // Start auto-refresh
    AutoRefreshManager.startProjectsRefresh();
    
    // Show cache stats
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

// Show no access message
function showNoAccess() {
  const banner = document.getElementById('authBanner');
  banner.classList.remove('hidden');
  banner.className = 'bg-amber-50 border-b border-amber-300 p-4 text-center';
  banner.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <h3 class="font-bold text-amber-800 mb-2">📭 Geen projecten gevonden</h3>
      <p class="text-sm text-amber-700 mb-3">
        Je hebt momenteel geen toegang tot projecten van BC Development.
      </p>
      <div class="text-xs text-left bg-white p-3 rounded space-y-1">
        <p class="font-medium text-gray-700">Mogelijke oorzaken:</p>
        <ul class="list-disc list-inside text-gray-600 space-y-1">
          <li>Er zijn nog geen projecten met je gedeeld</li>
          <li>Je gebruikt een ander Google-account dan verwacht</li>
          <li>De gedeelde projecten zijn verwijderd of ingetrokken</li>
        </ul>
      </div>
      <p class="text-sm text-amber-700 mt-3">
        Neem contact op met BC Development om toegang te krijgen.
      </p>
      <button onclick="handleSignOut()" class="mt-3 text-sm text-amber-600 hover:text-amber-800 underline">
        Uitloggen en opnieuw proberen
      </button>
    </div>
  `;
  
  // Show empty state in BOTH views
  const emptyStateHTML = `
    <div class="col-span-full text-center py-10 text-gray-500">
      <div class="text-4xl mb-3">📭</div>
      <div>Geen projecten beschikbaar voor dit account</div>
    </div>
  `;
  
  document.getElementById('dashboardWidgets').innerHTML = emptyStateHTML;
  document.getElementById('projectsOverview').innerHTML = emptyStateHTML;
}

// Display user information
// Display user information
async function displayUserInfo(projectCount) {
  if (!window.CURRENT_USER_EMAIL) return;
  
  const hasRoot = await hasAccessToRoot();
  
  // Get user info
  const userName = window.CURRENT_USER_EMAIL.split('@')[0]; // "husnu"
  const isMobile = window.innerWidth <= 768;
  
  // Determine display text
  let displayText;
  if (isMobile) {
    // Mobile: Show just first letter as initial
    displayText = userName.charAt(0).toUpperCase(); // "H"
  } else {
    // Desktop: Show email or shortened version
    displayText = hasRoot 
      ? window.CURRENT_USER_EMAIL 
      : `${userName}@...`;
  }
  
  // Update the badge
  const userInfoEl = document.getElementById('userInfo');
  userInfoEl.textContent = displayText;
  userInfoEl.setAttribute('data-email', window.CURRENT_USER_EMAIL);
  
  console.log(`✓ User info displayed: ${displayText} (${hasRoot ? 'Admin' : `${projectCount} projects`})`);
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
  document.getElementById('authBanner').className = 'bg-blue-50 border-b border-blue-300 p-3 text-center';
  document.getElementById('authBanner').innerHTML = `
    <button onclick="handleAuthClick()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
      🔐 Log in met Google
    </button>
  `;
  
  document.getElementById('userInfo').innerHTML = '';
  
  // Reset BOTH dashboard and list views
  const loginMessage = '<div class="text-gray-500 text-center py-8">🔐 Log in om projecten te laden uit Drive.</div>';
  document.getElementById('dashboardWidgets').innerHTML = loginMessage;
  document.getElementById('projectsOverview').innerHTML = loginMessage;
  
  // Reset to dashboard view
  if (typeof switchView === 'function') {
    switchView('dashboard');
  }
  
  window.CURRENT_USER_EMAIL = null;
  window.DYNAMIC_PROJECTS = [];
  
  console.log('✓ Signed out and cache cleared');
}