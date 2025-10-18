// BC Development Dashboard - UI Module

let selectedProject = null;
let refreshInterval = null;

// Filter projects based on user access
function filterProjectsByAccess(projects, userEmail) {
  // For now, return all projects
  // You can add access control logic here later if needed
  return projects || [];
}

// **FIXED: Render projects overview grid with DYNAMIC category counting + PROGRESSIVE LOADING**
function renderProjectsOverview(projects) {
  const root = document.getElementById('projectsOverview');
  
  if (!projects || !projects.length) {
    root.innerHTML = '<div class="text-gray-500 text-center py-8">Geen projecten gevonden of geen toegang.</div>';
    return;
  }

  console.log('Rendering projects overview with', projects.length, 'projects');

  root.innerHTML = projects.map(p => {
    const categories = p.dynamicCategories || [];
    const categoryCount = categories.length;
    const isLoading = !p._categoriesLoaded;
    const pct = categoryCount > 0 ? 100 : 0;

    let quick = '';
    if (isLoading) {
      quick = '<div class="text-xs text-gray-500 italic">⏳ Categorieën laden...</div>';
    } else if (categories.length > 0) {
      quick = categories.slice(0, 4).map(cat => {
        const cleanTitle = cat.title.replace(/^\d{1,2}[\s._-]/, '');
        return `<button class="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50 truncate max-w-full"
          onclick="showCategoryFiles('${cat._folderId}', '${cat.title.replace(/'/g, "\\'")}', '${cat.icon}')">
          ${cleanTitle}
        </button>`;
      }).join(' ');
    }

    return `
      <div class="bg-white rounded-xl shadow p-5 border hover:shadow-lg transition-shadow ${isLoading ? 'opacity-75' : ''}">
        <div class="flex flex-col gap-3">
          <!-- Project Title & Button Row -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="text-lg font-bold truncate" title="${p.name}">${p.name}</div>
              <div class="text-xs text-gray-500">Laatst gewijzigd: ${new Date(p.modifiedTime).toLocaleDateString('nl-BE')}</div>
            </div>
            <button class="flex-shrink-0 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
              onclick="window.open('https://drive.google.com/drive/folders/${p.baseFolderId}','_blank')">
              📂 Open hoofdmap
            </button>
          </div>

          <!-- Category Count & Progress -->
          <div>
            <div class="text-sm mb-2 font-medium">
              ${isLoading 
                ? '<span class="text-gray-500">⏳ Laden...</span>' 
                : `${categoryCount} categorie${categoryCount !== 1 ? 'ën' : ''}`
              }
            </div>
            <div class="w-full h-2 bg-gray-200 rounded">
              <div class="h-2 ${isLoading ? 'bg-gray-400 animate-pulse' : 'bg-green-500'} rounded transition-all" style="width:${isLoading ? '50' : pct}%"></div>
            </div>
          </div>

          <!-- Quick Links -->
          ${isLoading 
            ? '<div class="text-xs text-gray-500">Categorieën worden geladen...</div>'
            : categories.length > 0 
              ? `<div class="flex flex-wrap gap-2">${quick}</div>`
              : `<div class="text-xs text-amber-600 bg-amber-50 p-2 rounded">⚠️ Geen categorieën gevonden</div>`
          }
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