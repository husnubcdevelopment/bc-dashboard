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
    
    // Show loading state
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
    
    // Store and render projects (will show with loading states)
    window.DYNAMIC_PROJECTS = allProjects;
    renderProjectsOverview(allProjects);
    
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
  
  document.getElementById('projectsOverview').innerHTML = 
    `<div class="col-span-full text-center py-10 text-gray-500">
      <div class="text-4xl mb-3">📭</div>
      <div>Geen projecten beschikbaar voor dit account</div>
    </div>`;
}

// Display user information
async function displayUserInfo(projectCount) {
  if (!window.CURRENT_USER_EMAIL) return;
  
  const hasRoot = await hasAccessToRoot();
  
  let accessBadge = '';
  if (hasRoot) {
    accessBadge = '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Admin - Volledige toegang</span>';
  } else {
    accessBadge = `<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Toegang tot ${projectCount} project${projectCount !== 1 ? 'en' : ''}</span>`;
  }
  
  document.getElementById('userInfo').innerHTML = `
    <span class="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
      <span class="pulse-dot"></span>
      <span class="font-medium text-green-800">${window.CURRENT_USER_EMAIL}</span>
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
  document.getElementById('authBanner').className = 'bg-blue-50 border-b border-blue-300 p-3 text-center';
  document.getElementById('authBanner').innerHTML = `
    <button onclick="handleAuthClick()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
      🔐 Log in met Google
    </button>
  `;
  document.getElementById('userInfo').innerHTML = '';
  document.getElementById('projectsOverview').innerHTML = 
    '<div class="text-gray-500 text-center py-8">🔐 Log in om projecten te laden uit Drive.</div>';
  window.CURRENT_USER_EMAIL = null;
  window.DYNAMIC_PROJECTS = [];
  
  console.log('✓ Signed out and cache cleared');
}