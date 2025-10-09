// BC Development Dashboard - UI Module

let selectedProject = null;
let refreshInterval = null;

// **FIXED: Render projects overview grid with DYNAMIC category counting**
function renderProjectsOverview(projects) {
  const root = document.getElementById('projectsOverview');
  
  if (!projects || !projects.length) {
    root.innerHTML = '<div class="text-gray-500 text-center py-8">Geen projecten gevonden of geen toegang.</div>';
    return;
  }

  console.log('Rendering projects overview with', projects.length, 'projects');

  root.innerHTML = projects.map(p => {
    // Use dynamic categories from the project
    const categories = p.dynamicCategories || [];
    const categoryCount = categories.length;
    
    // Always show 100% when categories exist (we're not comparing to a target)
    const pct = categoryCount > 0 ? 100 : 0;

    // Show first 4 categories as quick links
    const quick = categories.slice(0, 4).map(cat => {
      // Remove number prefix for cleaner display
      const cleanTitle = cat.title.replace(/^\d{1,2}[\s._-]/, '');
      return `<button class="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50"
        onclick="showCategoryFiles('${cat._folderId}', '${cat.title.replace(/'/g, "\\'")}', '${cat.icon}')">
        ${cat.icon} ${cleanTitle}
      </button>`;
    }).join(' ');

    return `
      <div class="bg-white rounded-xl shadow p-5 border hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="text-lg font-bold">${p.name}</div>
            <div class="text-xs text-gray-500">Laatst gewijzigd: ${new Date(p.modifiedTime).toLocaleDateString('nl-BE')}</div>
          </div>
          <button class="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
            onclick="window.open('https://drive.google.com/drive/folders/${p.baseFolderId}','_blank')">
            📂 Open hoofdmap
          </button>
        </div>
        <div class="text-sm mb-2 font-medium">${categoryCount} categorie${categoryCount !== 1 ? 'ën' : ''}</div>
        <div class="w-full h-2 bg-gray-200 rounded mb-3">
          <div class="h-2 bg-green-500 rounded transition-all" style="width:${pct}%"></div>
        </div>
        ${categories.length > 0 
          ? `<div class="mt-3 flex flex-wrap gap-2">${quick}</div>`
          : `<div class="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">⚠️ Geen categorieën gevonden - maak mappen aan met nummering (bijv. "1_Prospectie")</div>`
        }
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

// **FIXED: Render categories grid with dynamic categories**
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
    const folderId = cat._folderId; // Use the folder ID stored in the category
    card.className = `category-card ${cat.colorClass} border-2 rounded-xl shadow p-5`;

    if (folderId && isAuth) {
      card.onclick = () => showFilesModal(cat, folderId);
    }

    let itemsHTML = '';
    if (cat.items?.length) {
      itemsHTML = '<ul class="space-y-2 mt-2">';
      cat.items.forEach(it => {
        itemsHTML += `<li class="text-sm pl-4 py-1.5 bg-white/60 rounded border-l-4 border-current">${it}</li>`;
      });
      itemsHTML += '</ul>';
    }

    const badge = folderId && isAuth
      ? '<span class="text-xs bg-white/90 px-2 py-1 rounded-full font-medium">📂 Bekijk bestanden</span>'
      : '<span class="text-xs bg-red-100 px-2 py-1 rounded-full font-medium text-red-600">⚠️ Login vereist</span>';

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${cat.icon}</span>
          <h3 class="text-lg font-bold">${cat.title}</h3>
        </div>
        ${badge}
      </div>
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

// Refresh files with subfolder display (UPDATED VERSION)
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
      <button onclick="refreshFiles('${folderId}')" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
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

  html += '<p class="text-xs text-gray-400 text-center mt-4">Auto-refresh 30s</p>';
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