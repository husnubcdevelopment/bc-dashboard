// BC Development Dashboard - Main Application

// Initialize Dynamic Projects array
window.DYNAMIC_PROJECTS = [];

// Project selector change handler
document.getElementById('projectSelector').addEventListener('change', async e => {
  const id = e.target.value;
  let p = CONFIG.projects.find(x => x.id === id);
  
  // Check dynamic projects if not found in static config
  if (!p && id.startsWith('auto:')) {
    const rid = id.slice(5);
    p = window.DYNAMIC_PROJECTS.find(x => x.id === rid);
  }
  
  selectedProject = p || null;
  
  if (selectedProject) {
    showProjectInfo(selectedProject);
    document.getElementById('projectInfo').classList.remove('hidden');
    
    // **FIXED: Always use dynamic categories from the project**
    const categoriesToUse = selectedProject.dynamicCategories || [];
    
    console.log(`Rendering ${categoriesToUse.length} categories for ${selectedProject.name}`);
    
    await renderCategories(categoriesToUse, selectedProject);
    
    // 🚀 START AUTO-REFRESH FOR THIS PROJECT'S CATEGORIES
    AutoRefreshManager.startCategoriesRefresh(selectedProject);
  } else {
    document.getElementById('projectInfo').classList.add('hidden');
    await renderCategories([], null);
    
    // Stop category refresh when no project selected
    AutoRefreshManager.intervals.categories && clearInterval(AutoRefreshManager.intervals.categories);
    AutoRefreshManager.intervals.categories = null;
  }
});

// **FIXED: Search functionality with dynamic categories**
document.getElementById('searchInput').addEventListener('input', async e => {
  const q = e.target.value.toLowerCase();
  
  if (!selectedProject) {
    return; // No project selected, nothing to search
  }
  
  // Get categories from selected project
  const categoriesToSearch = selectedProject.dynamicCategories || [];
  
  if (q === '') {
    // Show all categories if search is empty
    await renderCategories(categoriesToSearch, selectedProject);
    return;
  }
  
  // Filter categories based on search query
  const filtered = categoriesToSearch.filter(c =>
    c.title.toLowerCase().includes(q) ||
    (c.items && c.items.some(it => it.toLowerCase().includes(q)))
  );
  
  await renderCategories(filtered, selectedProject);
});

// Initialize application on page load
(function init() {
  // Show initial message in projects overview
  document.getElementById('projectsOverview').innerHTML =
    '<div class="text-gray-500 text-center py-8">🔐 Log in om projecten te laden uit Drive.</div>';
  
  // Populate dropdown with static projects
  populateProjectSelector();
  
  // Render empty categories grid
  renderCategories([], null);
})();

// Settings panel functions
function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const isHidden = panel.classList.contains('hidden');
  
  if (isHidden) {
    panel.classList.remove('hidden');
    updateCacheStats();
  } else {
    panel.classList.add('hidden');
  }
}

function toggleAutoRefresh() {
  AutoRefreshManager.isEnabled = !AutoRefreshManager.isEnabled;
  const btn = document.getElementById('autoRefreshToggle');
  
  if (AutoRefreshManager.isEnabled) {
    btn.textContent = '✓ Actief';
    btn.className = 'px-3 py-1 rounded text-sm bg-green-100 text-green-800';
    AutoRefreshManager.startProjectsRefresh();
    if (selectedProject) {
      AutoRefreshManager.startCategoriesRefresh(selectedProject);
    }
  } else {
    btn.textContent = '✗ Uitgeschakeld';
    btn.className = 'px-3 py-1 rounded text-sm bg-gray-100 text-gray-800';
    AutoRefreshManager.stopAll();
  }
}

function updateCacheStats() {
  const stats = CacheManager.getStats();
  document.getElementById('cacheStats').innerHTML = `
    ${stats.entries} items in cache<br>
    ${stats.sizeKB} KB / ${stats.maxSizeKB} KB gebruikt
  `;
}

function clearCache() {
  if (confirm('Weet je zeker dat je de cache wilt wissen? Dit zal de volgende keer laden trager maken.')) {
    CacheManager.clearAll();
    updateCacheStats();
    alert('✓ Cache gewist');
  }
}

// Close settings panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('settingsPanel');
  const settingsBtn = e.target.closest('button[onclick="toggleSettings()"]');
  
  if (!panel.contains(e.target) && !settingsBtn && !panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
  }
});