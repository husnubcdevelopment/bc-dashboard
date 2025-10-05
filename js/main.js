// BC Development Dashboard - Main Application

// Initialize Dynamic Projects array
window.DYNAMIC_PROJECTS = [];

// Project selector change handler
document.getElementById('projectSelector').addEventListener('change', e => {
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
    renderCategories(CONFIG.categories, selectedProject);
  } else {
    document.getElementById('projectInfo').classList.add('hidden');
    renderCategories(CONFIG.categories, null);
  }
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const filtered = CONFIG.categories.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.items.some(it => it.toLowerCase().includes(q))
  );
  renderCategories(filtered, selectedProject);
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