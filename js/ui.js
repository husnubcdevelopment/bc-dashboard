// BC Development Dashboard - UI Module

let selectedProject = null;
let refreshInterval = null;

// Filter projects based on user access
function filterProjectsByAccess(projects, userEmail) {
  // For now, return all projects
  // You can add access control logic here later if needed
  return projects || [];
}

// **GAMMA-INSPIRED: Render projects with glassmorphism & circular progress**
function renderProjectsOverview(projects) {
  const root = document.getElementById('projectsOverview');
  
  if (!projects || !projects.length) {
    root.innerHTML = `
      <div class="col-span-full empty-state-modern fade-in">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">Geen projecten gevonden</h3>
        <p class="empty-state-description">
          Log in met je Google account om projecten uit Drive te laden, 
          of voeg handmatig projecten toe in de configuratie.
        </p>
      </div>
    `;
    return;
  }

  console.log('🎨 Rendering', projects.length, 'projects with Gamma-style UI');

  root.innerHTML = projects.map((p, index) => {
    const categories = p.dynamicCategories || [];
    const categoryCount = categories.length;
    const isLoading = !p._categoriesLoaded;
    const progress = categoryCount > 0 ? 100 : (isLoading ? 50 : 0);
    
    // Calculate circle progress (circumference)
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Format date
    const lastModified = new Date(p.modifiedTime).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Quick action chips (top 3 categories)
    let quickChipsHTML = '';
    if (isLoading) {
      quickChipsHTML = `
        <div class="skeleton skeleton-line" style="width: 100px; height: 32px;"></div>
        <div class="skeleton skeleton-line" style="width: 120px; height: 32px;"></div>
      `;
    } else if (categories.length > 0) {
      const topCategories = categories.slice(0, 3);
      quickChipsHTML = topCategories.map(cat => {
        const cleanTitle = cat.title.replace(/^\d{1,2}[\s._-]/, '');
        return `
          <button class="action-chip" 
                  onclick="showCategoryFiles('${cat._folderId}', '${cat.title.replace(/'/g, "\\'")}', '${cat.icon}')"
                  title="${cat.title}">
            <span class="action-chip-number">${cat._categoryNumber || '•'}</span>
            <span class="truncate">${cleanTitle}</span>
          </button>
        `;
      }).join('');
      
      if (categories.length > 3) {
        quickChipsHTML += `
          <div class="action-chip action-chip-more">
            +${categories.length - 3} meer
          </div>
        `;
      }
    } else {
      quickChipsHTML = `
        <div class="text-xs text-gray-500 italic py-2">
          📂 Nog geen categorieën gevonden
        </div>
      `;
    }

    return `
      <div class="project-card-gamma ${isLoading ? 'loading' : ''} fade-in" 
           style="animation-delay: ${index * 0.1}s">
        
        <!-- Header Row -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-gray-800 mb-1 truncate" title="${p.name}">
              ${p.name}
            </h3>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>${lastModified}</span>
            </div>
          </div>
          
          <button class="icon-btn-modern" 
                  onclick="window.open('https://drive.google.com/drive/folders/${p.baseFolderId}','_blank')"
                  title="Open in Google Drive">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </button>
        </div>

        <!-- Progress Circle + Stats -->
        <div class="flex items-center gap-5 mb-6">
          <!-- Circular Progress -->
          <div class="progress-container">
            <svg class="progress-ring" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="progressGradient-${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#1e3a52;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#b8975a;stop-opacity:1" />
                </linearGradient>
              </defs>
              
              <!-- Background circle -->
              <circle class="progress-ring-circle progress-ring-bg"
                      cx="40" cy="40" r="${radius}">
              </circle>
              
              <!-- Progress circle -->
              <circle class="progress-ring-circle progress-ring-fill ${isLoading ? 'loading' : ''}"
                      cx="40" cy="40" r="${radius}"
                      stroke="url(#progressGradient-${p.id})"
                      stroke-dasharray="${circumference}"
                      stroke-dashoffset="${offset}">
              </circle>
            </svg>
            
            <div class="progress-label">
              ${isLoading ? '⏳' : categoryCount}
            </div>
          </div>

          <!-- Stats -->
          <div class="flex-1">
            <div class="text-sm font-semibold text-gray-700 mb-1">
              ${isLoading ? 'Laden...' : `${categoryCount} ${categoryCount === 1 ? 'Categorie' : 'Categorieën'}`}
            </div>
            <div class="progress-sublabel">
              ${isLoading ? 'Categories worden geladen' : 'Beschikbaar'}
            </div>
            
            ${!isLoading && categoryCount > 0 ? `
              <div class="flex gap-2 mt-3">
                <div class="stat-badge">
                  <span class="stat-badge-icon">📁</span>
                  <span>${categoryCount}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Quick Action Chips -->
        <div class="chip-container">
          ${quickChipsHTML}
        </div>
      </div>
    `;
  }).join('');
}

// Populate project selector dropdown with access control
async function populateProjectSelector() {
  const sel = document.getElementById('projectSelector');
  sel.innerHTML = '<option value="">-- Kies een project --</option>';
  
  // Add static projects from config
  CONFIG.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - ${p.location || ''} (${p.status || 'Actief'})`;
    sel.appendChild(opt);
  });
  
  // Add dynamic projects from Drive (with access control)
  if (window.DYNAMIC_PROJECTS && window.CURRENT_USER_EMAIL) {
    const accessibleProjects = filterProjectsByAccess(window.DYNAMIC_PROJECTS, window.CURRENT_USER_EMAIL);
    
    accessibleProjects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = `auto:${p.id}`;
      opt.textContent = `${p.name} (${p.dynamicCategories?.length || 0} categorieën)`;
      sel.appendChild(opt);
    });
  }
}

// Show project info banner
function showProjectInfo(project) {
  const el = document.getElementById('projectInfo');
  const categoryCount = project.dynamicCategories?.length || 0;
  
  el.className = 'mb-6 max-w-4xl mx-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6';
  el.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold mb-1">📁 ${project.name}</h2>
        <p class="text-blue-100">${categoryCount} Categorie${categoryCount !== 1 ? 'ën' : ''} • Status: Actief</p>
      </div>
      <button onclick="window.open('https://drive.google.com/drive/folders/${project.baseFolderId}','_blank')"
        class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center gap-2">
        <span>🗂️</span>
        <span>Open hoofdmap</span>
      </button>
    </div>
  `;
}

// **GAMMA-INSPIRED: Render categories with modern card design**
function renderCategories(categories, project) {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '';

  if (!project) {
    grid.innerHTML = `
      <div class="col-span-full empty-state-modern fade-in">
        <div class="empty-state-icon">👆</div>
        <h3 class="empty-state-title">Selecteer een project</h3>
        <p class="empty-state-description">
          Kies een project uit de lijst hierboven om de categorieën te bekijken.
        </p>
      </div>
    `;
    return;
  }

  if (!categories || categories.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full empty-state-modern fade-in">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">Geen categorieën gevonden</h3>
        <p class="empty-state-description">
          Maak genummerde mappen aan in Google Drive (bijv. "1_Prospectie", "2_Overeenkomsten") 
          om automatisch categorieën te genereren.
        </p>
      </div>
    `;
    return;
  }

  const isAuth = gapi.client.getToken() !== null;

  categories.forEach((cat, index) => {
    const card = document.createElement('div');
    const folderId = cat._folderId;
    const categoryNumber = cat._categoryNumber || '?';
    const cleanTitle = cat.title.replace(/^\d{1,2}[\s._-]/, '');
    
    // Count files in subfolders
    const totalFiles = cat.subfolders 
      ? cat.subfolders.reduce((sum, sf) => sum + (sf.hasFiles ? 1 : 0), 0)
      : 0;
    const hasFiles = totalFiles > 0;
    
    card.className = `category-card-gamma ${hasFiles ? 'has-files' : 'empty'} fade-in`;
    card.style.animationDelay = `${index * 0.05}s`;
    
    if (folderId && isAuth) {
      card.onclick = () => showFilesModal(cat, folderId);
      card.style.cursor = 'pointer';
    }

    // Render subfolders with status indicators
    let subfoldersHTML = '';
    if (cat.subfolders && cat.subfolders.length > 0) {
      subfoldersHTML = `
        <div class="category-subfolders">
          ${cat.subfolders.slice(0, 4).map(subfolder => {
            const statusClass = subfolder.hasFiles ? 'has-files' : 'empty';
            const icon = subfolder.hasFiles ? '📄' : '📂';
            
            return `
              <div class="subfolder-item ${statusClass}">
                <span class="subfolder-icon">${icon}</span>
                <span class="subfolder-name">${subfolder.name}</span>
                ${subfolder.hasFiles ? '<span class="subfolder-badge">●</span>' : ''}
              </div>
            `;
          }).join('')}
          
          ${cat.subfolders.length > 4 ? `
            <div class="subfolder-item more">
              <span class="subfolder-icon">⋯</span>
              <span class="subfolder-name">+${cat.subfolders.length - 4} meer</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      subfoldersHTML = `
        <div class="category-subfolders empty-state">
          <div class="text-xs text-gray-400 italic">Nog geen submappen</div>
        </div>
      `;
    }

    card.innerHTML = `
      <!-- Status Indicator (top-right corner) -->
      ${hasFiles ? '<div class="category-status-dot active" title="Bevat bestanden"></div>' : ''}
      
      <!-- Category Number Badge -->
      <div class="category-number-badge ${hasFiles ? 'active' : ''}">
        ${categoryNumber}
      </div>
      
      <!-- Category Header -->
      <div class="category-header">
        <h3 class="category-title-modern">${cleanTitle}</h3>
        
        ${folderId && isAuth ? `
          <div class="category-meta">
            <span class="category-meta-item">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              ${cat.subfolders?.length || 0} ${cat.subfolders?.length === 1 ? 'map' : 'mappen'}
            </span>
            ${hasFiles ? `
              <span class="category-meta-item highlight">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                ${totalFiles} ${totalFiles === 1 ? 'bestand' : 'bestanden'}
              </span>
            ` : ''}
          </div>
        ` : `
          <div class="category-meta">
            <span class="category-meta-item warning">
              🔒 Login vereist
            </span>
          </div>
        `}
      </div>
      
      <!-- Subfolders List -->
      ${subfoldersHTML}
      
      <!-- Action Footer -->
      ${folderId && isAuth ? `
        <div class="category-footer">
          <button class="category-action-btn" onclick="event.stopPropagation(); showFilesModal(${JSON.stringify(cat).replace(/"/g, '&quot;')}, '${folderId}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <span>Bekijk bestanden</span>
          </button>
        </div>
      ` : ''}
    `;

    grid.appendChild(card);
  });
}

// **GAMMA-INSPIRED: Render dashboard overview widgets**
function renderDashboardWidgets(projects) {
  const container = document.getElementById('dashboardWidgets');
  
  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full empty-state-modern">
        <div class="empty-state-icon">📊</div>
        <h3 class="empty-state-title">Geen data beschikbaar</h3>
        <p class="empty-state-description">Log in om dashboard statistieken te zien.</p>
      </div>
    `;
    return;
  }

  // Calculate stats
  const totalProjects = projects.length;
  const loadedProjects = projects.filter(p => p._categoriesLoaded);
  const totalCategories = loadedProjects.reduce((sum, p) => 
    sum + (p.dynamicCategories?.length || 0), 0
  );
  
  // Count projects with files
  const projectsWithFiles = loadedProjects.filter(p => 
    p.dynamicCategories?.some(cat => 
      cat.subfolders?.some(sf => sf.hasFiles)
    )
  ).length;
  
  // Recent activity (files added in last 24h)
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  let recentFiles = 0;
  
  // Calculate completion percentage
  const completionRate = totalCategories > 0 
    ? Math.round((projectsWithFiles / loadedProjects.length) * 100) 
    : 0;

  // Most active project (most categories)
  const mostActiveProject = loadedProjects.reduce((max, p) => 
    (p.dynamicCategories?.length || 0) > (max.dynamicCategories?.length || 0) ? p : max
  , loadedProjects[0] || {});

  container.innerHTML = `
    <!-- Widget 1: Total Projects -->
    <div class="dashboard-widget gradient-navy fade-in">
      <div>
        <div class="widget-icon">🏢</div>
        <div class="widget-title">Totaal Projecten</div>
      </div>
      <div>
        <div class="widget-big-number">${totalProjects}</div>
        <div class="widget-label">Actieve projecten</div>
        <div class="widget-sublabel">${loadedProjects.length} volledig geladen</div>
      </div>
    </div>

    <!-- Widget 2: Total Categories -->
    <div class="dashboard-widget gradient-blue fade-in" style="animation-delay: 0.1s">
      <div>
        <div class="widget-icon">📁</div>
        <div class="widget-title">Categorieën</div>
      </div>
      <div>
        <div class="widget-big-number">${totalCategories}</div>
        <div class="widget-label">Totaal categorieën</div>
        <div class="widget-sublabel">Verdeeld over ${totalProjects} projecten</div>
      </div>
    </div>

    <!-- Widget 3: Projects with Files -->
    <div class="dashboard-widget gradient-green fade-in" style="animation-delay: 0.2s">
      <div>
        <div class="widget-icon">✅</div>
        <div class="widget-title">Project Status</div>
      </div>
      <div>
        <div class="widget-big-number">${projectsWithFiles}</div>
        <div class="widget-label">Projecten met bestanden</div>
        <div class="widget-sublabel">${completionRate}% van alle projecten</div>
      </div>
    </div>

    <!-- Widget 4: Completion Progress Circle -->
    <div class="dashboard-widget gradient-purple fade-in" style="animation-delay: 0.3s">
      <div>
        <div class="widget-title">Voltooiingspercentage</div>
      </div>
      <div class="widget-progress">
        <div class="progress-circle-large">
          <svg viewBox="0 0 120 120">
            <circle class="progress-circle-bg" cx="60" cy="60" r="54"></circle>
            <circle class="progress-circle-fill" cx="60" cy="60" r="54"
                    stroke-dasharray="${2 * Math.PI * 54}"
                    stroke-dashoffset="${2 * Math.PI * 54 * (1 - completionRate / 100)}">
            </circle>
          </svg>
          <div class="progress-circle-label">${completionRate}%</div>
        </div>
        <div>
          <div class="widget-label">Project voortgang</div>
          <div class="widget-sublabel">${projectsWithFiles}/${loadedProjects.length} compleet</div>
        </div>
      </div>
    </div>

    <!-- Widget 5: Most Active Project -->
    ${mostActiveProject.name ? `
      <div class="dashboard-widget gradient-gold fade-in" style="animation-delay: 0.4s">
        <div>
          <div class="widget-icon">⭐</div>
          <div class="widget-title">Meest Actief Project</div>
        </div>
        <div>
          <div class="widget-label" style="font-size: 1.125rem; margin-bottom: 0.5rem;">
            ${mostActiveProject.name}
          </div>
          <div class="widget-sublabel">
            ${mostActiveProject.dynamicCategories?.length || 0} categorieën
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Widget 6: Quick Access (Top 3 Projects) -->
    <div class="dashboard-widget gradient-pink fade-in" style="animation-delay: 0.5s">
      <div>
        <div class="widget-icon">⚡</div>
        <div class="widget-title">Snelle Toegang</div>
      </div>
      <div class="widget-list">
        ${loadedProjects.slice(0, 3).map(p => `
          <div class="widget-list-item" onclick="selectProjectFromWidget('${p.id}')">
            <span class="widget-list-item-icon">📂</span>
            <span class="widget-list-item-text">${p.name}</span>
            <span class="widget-list-item-badge">${p.dynamicCategories?.length || 0}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// **View Toggle Function**
function switchView(view) {
  const dashboardSection = document.getElementById('dashboardSection');
  const projectsOverview = document.getElementById('projectsOverview').parentElement;
  const btnDashboard = document.getElementById('viewDashboard');
  const btnList = document.getElementById('viewList');
  
  if (view === 'dashboard') {
    dashboardSection.style.display = 'block';
    projectsOverview.style.display = 'none';
    btnDashboard.classList.add('active');
    btnList.classList.remove('active');
  } else {
    dashboardSection.style.display = 'none';
    projectsOverview.style.display = 'block';
    btnDashboard.classList.remove('active');
    btnList.classList.add('active');
  }
}

// **Helper function for quick category access from project cards**
function showCategoryFiles(folderId, title, icon) {
  const category = {
    title: title,
    icon: icon,
    _folderId: folderId
  };
  showFilesModal(category, folderId);
}

// **GAMMA-INSPIRED: Show files modal with modern design**
async function showFilesModal(category, mainFolderId) {
  const modal = document.getElementById('fileModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');

  // Clean title
  const cleanTitle = category.title.replace(/^\d{1,2}[\s._-]/, '');

  title.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="modal-category-badge">${category._categoryNumber || '📁'}</div>
      <div>
        <div class="text-xl font-bold">${cleanTitle}</div>
        <div class="text-sm font-normal text-gray-500 mt-0.5">
          <span class="inline-flex items-center gap-1.5">
            <span class="pulse-dot"></span>
            <span>Live synchronisatie</span>
          </span>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = `
    <div id="filesContainer" class="flex justify-center items-center p-12">
      <div class="flex flex-col items-center gap-3">
        <div class="loading"></div>
        <div class="text-sm text-gray-500">Bestanden laden...</div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => refreshFiles(mainFolderId), 30000);
  
  await refreshFiles(mainFolderId);
}

// **GAMMA-INSPIRED: Refresh files with modern card layout**
async function refreshFiles(folderId) {
  const box = document.getElementById('filesContainer');
  if (!box) return;

  box.innerHTML = `
    <div class="flex justify-center items-center p-12">
      <div class="flex flex-col items-center gap-3">
        <div class="loading"></div>
        <div class="text-sm text-gray-500">Bestanden laden...</div>
      </div>
    </div>
  `;
  
  const structure = await getFolderStructure(folderId);
  const allFiles = structure.files;
  const subfolders = structure.subfolders;

  const totalFiles = allFiles.length + subfolders.reduce((sum, sf) => sum + sf.files.length, 0);
  const totalFolders = subfolders.length;

  if (totalFiles === 0 && totalFolders === 0) {
    box.innerHTML = `
      <div class="empty-state-modern">
        <div class="empty-state-icon">📭</div>
        <h3 class="empty-state-title">Geen bestanden gevonden</h3>
        <p class="empty-state-description">
          Deze categorie bevat nog geen bestanden of submappen. 
          Upload bestanden in Google Drive om ze hier te zien.
        </p>
      </div>
    `;
    return;
  }

  let html = `
    <!-- Modal Header Stats -->
    <div class="modal-stats-bar">
      <div class="stat-pill">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span>${totalFiles} ${totalFiles === 1 ? 'bestand' : 'bestanden'}</span>
      </div>
      
      <div class="stat-pill">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
        <span>${totalFolders} ${totalFolders === 1 ? 'map' : 'mappen'}</span>
      </div>
      
      <button onclick="forceRefreshFiles('${folderId}')" class="refresh-btn">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Vernieuwen</span>
      </button>
    </div>
  `;

  // Main folder files
  if (allFiles.length > 0) {
    html += `
      <div class="file-section">
        <h4 class="file-section-title">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
          Hoofdmap
          <span class="file-count-badge">${allFiles.length}</span>
        </h4>
        <div class="file-grid">
          ${allFiles.map(f => renderFileCard(f)).join('')}
        </div>
      </div>
    `;
  }

  // Subfolders
  subfolders.forEach(subfolder => {
    const fileCount = subfolder.files.length;
    const isEmpty = fileCount === 0;
    
   html += `
    <div class="file-section ${isEmpty ? 'empty' : ''}">
      <div class="file-section-header">
        <div class="file-section-title">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
          <span class="flex-1 min-w-0 truncate">${subfolder.name}</span>
          <span class="file-count-badge ${isEmpty ? 'empty' : ''}">${fileCount}</span>
        </div>
      </div>
    `;
    if (isEmpty) {
      html += `
        <div class="empty-folder-state">
          <div class="text-gray-400 text-sm">📂 Nog geen bestanden</div>
        </div>
      `;
    } else {
      html += `
        <div class="file-grid">
          ${subfolder.files.map(f => renderFileCard(f)).join('')}
        </div>
      `;
    }
    
    html += '</div>';
  });

  html += `
    <div class="modal-footer-info">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>Automatisch ververst elke 30 seconden</span>
    </div>
  `;

  box.innerHTML = html;
}

// **Helper: Render individual file card**
function renderFileCard(file) {
  const isNew = (Date.now() - new Date(file.modifiedTime)) < 3600000; // 1 hour
  const fileIcon = getFileIcon(file.mimeType);
  const fileDate = new Date(file.modifiedTime).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return `
    <div class="file-card-modern ${isNew ? 'new' : ''}" 
         onclick="window.open('${file.webViewLink}','_blank')"
         title="${file.name}">
      ${isNew ? '<div class="new-badge">✨ Nieuw</div>' : ''}
      
      <div class="file-icon-large">${fileIcon}</div>
      
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          <span>${fileDate}</span>
          <span>•</span>
          <span>${formatFileSize(file.size)}</span>
        </div>
      </div>
      
      <div class="file-action-overlay">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
        </svg>
      </div>
    </div>
  `;
}

// **Helper: Get file icon based on mime type**
function getFileIcon(mimeType) {
  if (!mimeType) return '📄';
  
  const iconMap = {
    'application/pdf': '📕',
    'application/msword': '📘',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'application/vnd.ms-powerpoint': '📙',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📙',
    'image/': '🖼️',
    'video/': '🎬',
    'audio/': '🎵',
    'application/zip': '📦',
    'application/x-rar': '📦'
  };
  
  for (const [key, icon] of Object.entries(iconMap)) {
    if (mimeType.includes(key)) return icon;
  }
  
  return '📄';
}
// Close modal
function closeModal() {
  document.getElementById('fileModal').classList.remove('active');
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Force refresh files (bypass cache)
async function forceRefreshFiles(folderId) {
  console.log('🔄 Force refresh - clearing cache for:', folderId);
  
  // Clear cache for this folder
  CacheManager.remove('structure', folderId);
  CacheManager.remove('files', folderId);
  CacheManager.remove('folders', folderId);
  
  // Show loading
  const box = document.getElementById('filesContainer');
  if (box) {
    box.innerHTML = '<div class="flex justify-center p-8"><div class="loading"></div></div>';
  }
  
  // Refresh with fresh data
  await refreshFiles(folderId);
  
  // Show notification
  showTempNotification('✨ Bestanden vernieuwd');
}

// Show temporary notification
function showTempNotification(message) {
  const notif = document.createElement('div');
  notif.className = 'fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in';
  notif.textContent = message;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transform = 'translateX(100%)';
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}