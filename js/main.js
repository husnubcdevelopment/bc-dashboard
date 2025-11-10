// BC Development Dashboard - Main Application

// Initialize Dynamic Projects array
window.DYNAMIC_PROJECTS = [];

// Current view state
let currentView = 'dashboard'; // 'dashboard' or 'list'

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
    
    // 🚀 NEW: Ensure categories are loaded before rendering
    if (!selectedProject._categoriesLoaded) {
      // Show loading state
      document.getElementById('categoriesGrid').innerHTML = 
        '<div class="col-span-full flex justify-center py-10"><div class="loading"></div><span class="ml-3 text-gray-600">Categorieën laden...</span></div>';
      
      // Load categories on demand
      await ensureProjectCategoriesLoaded(selectedProject);
      
      // Update project info with correct count
      showProjectInfo(selectedProject);
    }
    
    const categoriesToUse = selectedProject.dynamicCategories || [];
    
    console.log(`Rendering ${categoriesToUse.length} categories for ${selectedProject.name}`);
    
    await renderCategories(categoriesToUse, selectedProject);
    
    // 📊 NEW: Calculate and render sidebar statistics
    if (window.SidebarStats) {
      console.log('📊 Calculating project statistics...');
      const stats = await window.SidebarStats.calculateProjectStats(
        selectedProject.id,
        selectedProject.name
      );
      
      if (stats) {
        window.SidebarStats.renderStatsSidebar(stats);
        console.log('✓ Statistics rendered in sidebar');
      }
    }
    
    // Start auto-refresh for this project's categories
    AutoRefreshManager.startCategoriesRefresh(selectedProject);
  } else {
    document.getElementById('projectInfo').classList.add('hidden');
    await renderCategories([], null);
    
    // Clear sidebar when no project selected
    if (document.getElementById('statsSidebarContent')) {
      document.getElementById('statsSidebarContent').innerHTML = `
        <div class="text-center text-gray-400 py-8">
          Selecteer een project om statistieken te zien
        </div>
      `;
    }
    
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
  // Show initial dashboard message
  document.getElementById('dashboardWidgets').innerHTML =
    '<div class="col-span-full text-gray-500 text-center py-8">🔐 Log in om dashboard te laden.</div>';
  
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

// ========================================
// 🆕 DASHBOARD FUNCTIONS
// ========================================

/**
 * Switch between Dashboard and List view
 */
function switchView(view) {
  currentView = view;
  
  const btnDashboard = document.getElementById('viewDashboard');
  const btnList = document.getElementById('viewList');
  
  if (view === 'dashboard') {
    // Scroll to top (dashboard)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    btnDashboard?.classList.add('active');
    btnList?.classList.remove('active');
  } else {
    // Scroll to projects section
    const projectsSection = document.querySelector('#projectsOverview').closest('section');
    projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    btnDashboard?.classList.remove('active');
    btnList?.classList.add('active');
  }
}

/**
 * Select project from dashboard widget and scroll to categories
 */
function selectProjectFromWidget(projectId) {
  const selector = document.getElementById('projectSelector');
  
  // Find option with matching project ID
  const option = Array.from(selector.options).find(opt => 
    opt.value === projectId || opt.value === `auto:${projectId}`
  );
  
  if (option) {
    selector.value = option.value;
    
    // Trigger change event to load categories
    selector.dispatchEvent(new Event('change'));
    
    // Switch to list view to see categories
    switchView('list');
    
    // Scroll to categories after a short delay
    setTimeout(() => {
      document.getElementById('categoriesGrid').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 300);
  }
}

// Make functions globally accessible
window.switchView = switchView;
window.selectProjectFromWidget = selectProjectFromWidget;