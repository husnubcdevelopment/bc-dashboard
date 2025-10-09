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
    
    // Use dynamic categories if available
    const categoriesToUse = selectedProject.dynamicCategories || CONFIG.categories;
    await renderCategories(categoriesToUse, selectedProject);
  } else {
    document.getElementById('projectInfo').classList.add('hidden');
    await renderCategories(CONFIG.categories, null);
  }
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', async e => {
  const q = e.target.value.toLowerCase();
  
  // Get categories to search
  const categoriesToSearch = selectedProject?.dynamicCategories || CONFIG.categories;
  
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
    '<div class="text-gray-500">Log in om projecten te laden uit Drive.</div>';
  
  // Populate dropdown with static projects
  populateProjectSelector();
  
  // Render empty categories grid
  renderCategories(CONFIG.categories, null);
})();