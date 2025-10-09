// BC Development Dashboard - Auto Refresh Manager
// Intelligent refresh that only updates what changed

const AutoRefreshManager = {
  intervals: {
    projects: null,
    categories: null
  },

  config: {
    projectsInterval: 60000,    // Check projects every 60s
    categoriesInterval: 30000,  // Check categories every 30s
    filesInterval: 20000        // Check files every 20s (when modal open)
  },

  isEnabled: true,

  // Start auto-refresh for projects overview
  startProjectsRefresh() {
    if (this.intervals.projects) return; // Already running

    console.log('🔄 Starting projects auto-refresh (60s interval)');
    
    this.intervals.projects = setInterval(async () => {
      if (!this.isEnabled || !gapi.client.getToken()) return;

      try {
        await this.refreshProjects();
      } catch (e) {
        console.error('Auto-refresh error:', e);
      }
    }, this.config.projectsInterval);
  },

  // Start auto-refresh for selected project categories
  startCategoriesRefresh(project) {
    if (this.intervals.categories) {
      clearInterval(this.intervals.categories);
    }

    if (!project) return;

    console.log(`🔄 Starting categories auto-refresh for ${project.name} (30s interval)`);

    this.intervals.categories = setInterval(async () => {
      if (!this.isEnabled || !gapi.client.getToken() || !selectedProject) return;

      try {
        await this.refreshCategories(selectedProject);
      } catch (e) {
        console.error('Categories auto-refresh error:', e);
      }
    }, this.config.categoriesInterval);
  },

  // Refresh projects intelligently
  async refreshProjects() {
    console.log('🔍 Checking for project updates...');

    let updatedProjects;

    // Use appropriate method based on user access
    if (hasDirectAccess(window.CURRENT_USER_EMAIL)) {
      updatedProjects = await discoverProjectsFromDirectAccess(window.CURRENT_USER_EMAIL);
    } else if (typeof PROJECTS_ROOT_FOLDER_ID !== 'undefined' && PROJECTS_ROOT_FOLDER_ID) {
      updatedProjects = await discoverProjectsFromDrive();
    } else {
      return;
    }

    const accessibleProjects = filterProjectsByAccess(updatedProjects, window.CURRENT_USER_EMAIL);

    // Check if anything changed
    const hasChanges = this._detectProjectChanges(window.DYNAMIC_PROJECTS, accessibleProjects);

    if (hasChanges) {
      console.log('✨ Projects changed - updating UI');
      window.DYNAMIC_PROJECTS = accessibleProjects;
      
      // Update projects overview
      renderProjectsOverview(accessibleProjects);
      
      // Update dropdown
      await populateProjectSelector();
      
      // Show notification
      this._showNotification('Projecten bijgewerkt');
    } else {
      console.log('✓ Projects unchanged');
    }
  },

  // Refresh categories for selected project
  async refreshCategories(project) {
    console.log(`🔍 Checking for category updates in ${project.name}...`);

    const updatedCategories = await discoverCategoriesFromProject(project.baseFolderId);

    // Check if anything changed
    const hasChanges = this._detectCategoryChanges(
      project.dynamicCategories,
      updatedCategories
    );

    if (hasChanges) {
      console.log('✨ Categories changed - updating UI');
      
      // Update project object
      project.dynamicCategories = updatedCategories;
      
      // Update folders mapping for backward compatibility
      project.folders = {};
      updatedCategories.forEach(cat => {
        project.folders[cat.id] = cat._folderId;
      });

      // Re-render categories
      await renderCategories(updatedCategories, project);
      
      // Update project info banner
      showProjectInfo(project);
      
      // Show notification
      this._showNotification(`${project.name}: Categorieën bijgewerkt`);
    } else {
      console.log('✓ Categories unchanged');
    }
  },

  // Detect changes in projects array
  _detectProjectChanges(oldProjects, newProjects) {
    if (!oldProjects || oldProjects.length !== newProjects.length) {
      return true;
    }

    // Check if any project's modifiedTime changed
    for (let i = 0; i < newProjects.length; i++) {
      const oldProj = oldProjects.find(p => p.id === newProjects[i].id);
      if (!oldProj) return true; // New project
      
      if (oldProj.modifiedTime !== newProjects[i].modifiedTime) {
        return true; // Project modified
      }

      // Check category count
      const oldCatCount = oldProj.dynamicCategories?.length || 0;
      const newCatCount = newProjects[i].dynamicCategories?.length || 0;
      if (oldCatCount !== newCatCount) return true;
    }

    return false;
  },

  // Detect changes in categories
  _detectCategoryChanges(oldCategories, newCategories) {
    if (!oldCategories || oldCategories.length !== newCategories.length) {
      return true;
    }

    // Check if any category title or ID changed
    for (let i = 0; i < newCategories.length; i++) {
      const oldCat = oldCategories.find(c => c._folderId === newCategories[i]._folderId);
      if (!oldCat) return true; // New category
      
      if (oldCat.title !== newCategories[i].title) {
        return true; // Category renamed
      }
    }

    return false;
  },

  // Show subtle notification
  _showNotification(message) {
    // Create notification element
    const notif = document.createElement('div');
    notif.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in';
    notif.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xl">✨</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notif);

    // Remove after 3 seconds
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateX(100%)';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  },

  // Stop all auto-refresh
  stopAll() {
    console.log('⏸️ Stopping all auto-refresh');
    
    if (this.intervals.projects) {
      clearInterval(this.intervals.projects);
      this.intervals.projects = null;
    }
    
    if (this.intervals.categories) {
      clearInterval(this.intervals.categories);
      this.intervals.categories = null;
    }
  },

  // Toggle auto-refresh on/off
  toggle(enabled) {
    this.isEnabled = enabled;
    console.log(`Auto-refresh ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      this.stopAll();
    }
  }
};

// Add animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
    transition: all 0.3s ease-out;
  }
`;
document.head.appendChild(style);

// Expose globally
window.AutoRefreshManager = AutoRefreshManager;