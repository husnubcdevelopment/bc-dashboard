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

// **FIXED: Render categories grid with SINGLE PREMIUM COLOR**
function renderCategories(categories, project) {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '';

  if (!project) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">👆 Selecteer een project</div>';
    return;
  }

  if (!categories || categories.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-10">
        <div class="text-gray-400 mb-2">📭 Geen categorieën gevonden in dit project</div>
        <div class="text-sm text-gray-500">Maak mappen aan in Drive met nummering (bijv. "1_Prospectie", "2_Overeenkomsten")</div>
      </div>
    `;
    return;
  }

  const isAuth = gapi.client.getToken() !== null;

  categories.forEach(cat => {
    const card = document.createElement('div');
    const folderId = cat._folderId;
    const categoryNumber = cat._categoryNumber || '?';
    
    card.className = 'category-card';
    
    // Clean title (remove number prefix)
    const cleanTitle = cat.title.replace(/^\d{1,2}[\s._-]/, '');

    if (folderId && isAuth) {
      card.onclick = () => showFilesModal(cat, folderId);
    }

    // 🆕 RENDER SUBFOLDERS MET FILE COUNT INDICATOR
    let itemsHTML = '';
    if (cat.subfolders && cat.subfolders.length > 0) {
      itemsHTML = `
        <div class="category-items">
          <ul>
            ${cat.subfolders.map(subfolder => {
              const itemClass = subfolder.hasFiles 
                ? 'category-subfolder-item has-files' 
                : 'category-subfolder-item empty';
              
              return `<li class="${itemClass}">${subfolder.name}</li>`;
            }).join('')}
          </ul>
        </div>
      `;
    }

    const badge = folderId && isAuth
      ? '<span class="category-badge">📁 Bekijk bestanden</span>'
      : '<span class="category-badge text-red-600">⚠️ Login vereist</span>';

    card.innerHTML = `
      <div class="category-icon">${categoryNumber}</div>
      <h3 class="category-title">${cleanTitle}</h3>
      ${badge}
      ${itemsHTML}
    `;

    grid.appendChild(card);
  });
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

// **Show files modal with subfolder support**
async function showFilesModal(category, mainFolderId) {
  const modal = document.getElementById('fileModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');

  title.innerHTML = `${category.title} <span class="text-sm font-normal text-gray-500 ml-2"><span class="inline-flex items-center gap-1"><span class="pulse-dot"></span>Live</span></span>`;
  content.innerHTML = '<div id="filesContainer"><div class="flex justify-center p-8"><div class="loading"></div></div></div>';
  modal.classList.add('active');

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => refreshFiles(mainFolderId), 30000);
  
  await refreshFiles(mainFolderId);
}

// Refresh files with subfolder display (SHOWS ALL SUBFOLDERS)
async function refreshFiles(folderId) {
  const box = document.getElementById('filesContainer');
  if (!box) return;

  box.innerHTML = '<div class="flex justify-center p-8"><div class="loading"></div></div>';
  
  // Get folder structure with subfolders
  const structure = await getFolderStructure(folderId);
  const allFiles = structure.files;
  const subfolders = structure.subfolders;

  const totalFiles = allFiles.length + subfolders.reduce((sum, sf) => sum + sf.files.length, 0);
  const totalFolders = subfolders.length;

  // Show message if completely empty (no files AND no subfolders)
  if (totalFiles === 0 && totalFolders === 0) {
    box.innerHTML = '<p class="text-gray-500 text-center p-8">📭 Geen bestanden of submappen gevonden</p>';
    return;
  }

  let html = `
    <div class="mb-3 flex justify-between items-center">
      <p class="text-sm text-gray-600">📊 ${totalFiles} bestand(en) • ${totalFolders} submap(pen)</p>
      <button onclick="forceRefreshFiles('${folderId}')" class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
        🔄 Vernieuwen
      </button>
    </div>
  `;

  // Display main folder files
  if (allFiles.length > 0) {
    html += '<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">📄 Bestanden in hoofdmap</h4><div class="space-y-2">';
    allFiles.forEach(f => {
      const isNew = (Date.now() - new Date(f.modifiedTime)) < 3600000;
      html += `
        <div class="file-item flex items-center justify-between p-3 border rounded-lg hover:shadow cursor-pointer ${isNew ? 'bg-yellow-50 border-yellow-300' : ''}"
             onclick="window.open('${f.webViewLink}','_blank')">
          <div class="flex items-center gap-3 flex-1">
            <span class="text-2xl">📄</span>
            <div>
              <p class="font-medium text-gray-800">
                ${f.name}
                ${isNew ? '<span class="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full ml-2">✨ Nieuw</span>' : ''}
              </p>
              <p class="text-xs text-gray-500">${new Date(f.modifiedTime).toLocaleString('nl-BE')} • ${formatFileSize(f.size)}</p>
            </div>
          </div>
          <span class="text-blue-500">🔗</span>
        </div>
      `;
    });
    html += '</div></div>';
  }

  // ✨ Display ALL subfolders (even if empty)
  subfolders.forEach(subfolder => {
    const fileCount = subfolder.files.length;
    const isEmpty = fileCount === 0;
    
    html += `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
          📁 ${subfolder.name} 
          <span class="text-xs ${isEmpty ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'} px-2 py-0.5 rounded-full">
            ${fileCount} bestand(en)
          </span>
        </h4>
    `;
    
    if (isEmpty) {
      // Show empty state for subfolders without files
      html += `
        <div class="pl-4 border-l-2 border-gray-200">
          <div class="p-3 border border-dashed rounded-lg text-center text-gray-400 text-sm">
            📭 Nog geen bestanden in deze map
          </div>
        </div>
      `;
    } else {
      // Show files in subfolder
      html += '<div class="space-y-2 pl-4 border-l-2 border-gray-200">';
      
      subfolder.files.forEach(f => {
        const isNew = (Date.now() - new Date(f.modifiedTime)) < 3600000;
        html += `
          <div class="file-item flex items-center justify-between p-3 border rounded-lg hover:shadow cursor-pointer ${isNew ? 'bg-yellow-50 border-yellow-300' : ''}"
               onclick="window.open('${f.webViewLink}','_blank')">
            <div class="flex items-center gap-3 flex-1">
              <span class="text-2xl">📄</span>
              <div>
                <p class="font-medium text-gray-800">
                  ${f.name}
                  ${isNew ? '<span class="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full ml-2">✨ Nieuw</span>' : ''}
                </p>
                <p class="text-xs text-gray-500">${new Date(f.modifiedTime).toLocaleString('nl-BE')} • ${formatFileSize(f.size)}</p>
              </div>
            </div>
            <span class="text-blue-500">🔗</span>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    html += '</div>';
  });

  html += '<p class="text-xs text-gray-400 text-center mt-4">Auto-refresh 15s • Klik 🔄 voor directe update</p>';
  box.innerHTML = html;
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