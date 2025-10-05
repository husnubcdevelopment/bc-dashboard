// BC Development Dashboard - UI Module

let selectedProject = null;
let refreshInterval = null;

// Render projects overview grid
function renderProjectsOverview(projects) {
  const root = document.getElementById('projectsOverview');
  
  if (!projects || !projects.length) {
    root.innerHTML = '<div class="text-gray-500">Geen projecten gevonden.</div>';
    return;
  }

  const categoryLabel = id => {
    const c = CONFIG.categories.find(x => x.id === id);
    return c ? c.title : id;
  };

  const calcCompleteness = map => {
    const total = Object.keys(CATEGORY_PREFIX).length;
    const present = Object.keys(map).length;
    return { present, total, pct: Math.round((present / total) * 100) };
  };

  root.innerHTML = projects.map(p => {
    const { present, total, pct } = calcCompleteness(p.folders);
    const missing = Object.keys(CATEGORY_PREFIX).filter(k => !p.folders[k]).slice(0, 3);
    const missHtml = missing.length
      ? `<div class="mt-2 text-xs text-amber-700">Ontbreekt: ${missing.map(categoryLabel).join(', ')}${missing.length >= 3 ? '…' : ''}</div>`
      : `<div class="mt-2 text-xs text-green-700">Alle categorieën aanwezig</div>`;

    const quick = Object.entries(p.folders).slice(0, 4).map(([cid, fid]) =>
      `<button class="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50"
        onclick="showFilesModal(CONFIG.categories.find(c=>c.id==='${cid}'),'${fid}')">
        ${categoryLabel(cid)}
      </button>`
    ).join(' ');

    return `
      <div class="bg-white rounded-xl shadow p-5 border">
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="text-lg font-bold">${p.name}</div>
            <div class="text-xs text-gray-500">Laatst gewijzigd: ${new Date(p.modifiedTime).toLocaleDateString('nl-BE')}</div>
          </div>
          <button class="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            onclick="window.open('https://drive.google.com/drive/folders/${p.baseFolderId}','_blank')">
            Open hoofdmap
          </button>
        </div>
        <div class="text-sm mb-2">${present}/${total} categorieën</div>
        <div class="w-full h-2 bg-gray-200 rounded">
          <div class="h-2 bg-blue-500 rounded" style="width:${pct}%"></div>
        </div>
        ${missHtml}
        <div class="mt-3 flex flex-wrap gap-2">${quick}</div>
      </div>
    `;
  }).join('');
}

// Populate project selector dropdown
function populateProjectSelector() {
  const sel = document.getElementById('projectSelector');
  sel.innerHTML = '<option value="">-- Kies een project --</option>';
  
  // Add static projects from config
  CONFIG.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - ${p.location || ''} (${p.status || 'Actief'})`;
    sel.appendChild(opt);
  });
  
  // Add dynamic projects from Drive
  if (window.DYNAMIC_PROJECTS) {
    window.DYNAMIC_PROJECTS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = `auto:${p.id}`;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }
}

// Show project info banner
function showProjectInfo(project) {
  const el = document.getElementById('projectInfo');
  el.className = 'mb-6 max-w-4xl mx-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow p-6';
  el.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold mb-1">📁 ${project.name}</h2>
        <p class="text-blue-100">Template Structuur • Status: Actief</p>
      </div>
      <button onclick="window.open('https://drive.google.com/drive/folders/${project.baseFolderId}','_blank')"
        class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50">
        🗂️ Open hoofdmap
      </button>
    </div>
  `;
}

// Render categories grid
function renderCategories(categories, project) {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '';

  if (!project) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">👆 Selecteer een project</div>';
    return;
  }

  const isAuth = gapi.client.getToken() !== null;

  categories.forEach(cat => {
    const card = document.createElement('div');
    const folderId = project.folders ? project.folders[cat.id] : null;
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
      : '<span class="text-xs bg-red-100 px-2 py-1 rounded-full font-medium text-red-600">⚠️ Login / map ontbreekt</span>';

    card.innerHTML = `
      <div class="flex items-center justify-between">
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

// Show files modal
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

// Refresh files in modal
async function refreshFiles(folderId) {
  const box = document.getElementById('filesContainer');
  if (!box) return;

  box.innerHTML = '<div class="flex justify-center p-8"><div class="loading"></div></div>';
  const files = await listFiles(folderId);

  if (!files.length) {
    box.innerHTML = '<p class="text-gray-500 text-center p-8">📭 Geen bestanden gevonden</p>';
    return;
  }

  let html = `
    <div class="mb-3 flex justify-between items-center">
      <p class="text-sm text-gray-600">📊 ${files.length} bestand(en)</p>
      <button onclick="refreshFiles('${folderId}')" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
        🔄 Vernieuwen
      </button>
    </div>
    <div class="space-y-2">
  `;

  files.forEach(f => {
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

  html += '</div><p class="text-xs text-gray-400 text-center mt-4">Auto-refresh 30s</p>';
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