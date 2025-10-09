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
  } else {
    document.getElementById('projectInfo').classList.add('hidden');
    await renderCategories([], null);
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