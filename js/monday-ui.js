// BC Development Dashboard - Monday.com UI Rendering Module
// TEST: Force render test data
window.testMondayUI = function() {
  const testData = {
    projectName: 'Noordlaan 20 Test',
    projectId: 'test',
    tasks: [
      {
        id: '1',
        name: 'Test Taak - HVAC',
        status: 'Bezig',
        priority: 'Urgent',
        typeWork: 'HVAC',
        deadline: '2025-11-25'
      }
    ],
    partners: [
      {
        id: '1',
        name: 'Test Aannemer',
        type: 'Aannemer',
        organization: 'ABC Bouw',
        score: '9'
      }
    ]
  };
  
  renderMondayProjectData(testData);
};
/**
 * Render Monday.com project data in sidebar
 */
function renderMondayProjectData(mondayData) {
  if (!mondayData) {
    return renderMondayEmptyState();
  }
  
  const container = document.getElementById('mondaySidebarContent');
  if (!container) return;
  
  const html = `
    ${renderProjectHeader(mondayData)}
    ${renderTeamOverview(mondayData)}
    ${renderActiveTasks(mondayData)}
  `;
  
  container.innerHTML = html;
}

/**
 * Render empty state when no Monday data available
 */
function renderMondayEmptyState() {
  return `
    <div class="text-center py-12 px-4">
      <div class="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <p class="text-gray-600 text-sm font-medium mb-1">Geen Monday.com data</p>
      <p class="text-gray-400 text-xs">Project niet gekoppeld aan Monday</p>
    </div>
  `;
}

/**
 * Render project header section
 */
function renderProjectHeader(mondayData) {
  const tasks = mondayData.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status && t.status.toLowerCase().includes('klaar')).length;
  const urgentTasks = tasks.filter(t => t.priority && t.priority.toLowerCase().includes('urgent')).length;
  
  return `
    <div class="mb-6 pb-4 border-b border-gray-200">
      <h3 class="text-base font-bold text-gray-800 mb-3">Monday.com Project Data</h3>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
          <div class="font-bold text-blue-700 text-lg">${totalTasks}</div>
          <div class="text-gray-600 mt-1">Taken</div>
        </div>
        <div class="bg-green-50 p-3 rounded-lg text-center border border-green-100">
          <div class="font-bold text-green-700 text-lg">${completedTasks}</div>
          <div class="text-gray-600 mt-1">Klaar</div>
        </div>
        <div class="bg-red-50 p-3 rounded-lg text-center border border-red-100">
          <div class="font-bold text-red-700 text-lg">${urgentTasks}</div>
          <div class="text-gray-600 mt-1">Urgent</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render team overview section
 */
function renderTeamOverview(mondayData) {
  const partners = mondayData.partners || [];
  const partnersByType = window.MondayIntegration.getPartnersByType(partners);
  
  if (Object.keys(partnersByType).length === 0) {
    return '';
  }
  
  const typeOrder = ['Aannemer', 'Architect', 'Studiebureau', 'Investeerder', 'Jurist'];
  const sortedTypes = Object.keys(partnersByType).sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  const typeCards = sortedTypes.slice(0, 4).map(type => {
    const typePartners = partnersByType[type].slice(0, 3);
    return renderPartnerTypeCard(type, typePartners);
  }).join('');
  
  return `
    <div class="mb-6">
      <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 bg-blue-600 rounded"></span>
        Team & Contacten
      </h4>
      <div class="space-y-2">
        ${typeCards}
      </div>
    </div>
  `;
}

/**
 * Render partner type card
 */
function renderPartnerTypeCard(type, partners) {
  const partnersList = partners.map(p => `
    <div class="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded">
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium text-gray-800 truncate">${p.name}</div>
        ${p.organization ? `<div class="text-xs text-gray-500 truncate">${p.organization}</div>` : ''}
      </div>
      ${p.score && p.score !== 'N/A' ? `
        <div class="ml-2 flex items-center gap-1">
          <div class="text-xs font-bold text-amber-600">${p.score}</div>
          <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  return `
    <div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-bold text-gray-700">${type}</div>
        <div class="text-xs text-gray-500">${partners.length} personen</div>
      </div>
      <div class="space-y-0.5">
        ${partnersList}
      </div>
    </div>
  `;
}

/**
 * Render active tasks section
 */
function renderActiveTasks(mondayData) {
  const tasks = mondayData.tasks || [];
  const tasksByStatus = window.MondayIntegration.getTasksByStatus(tasks);
  
  if (tasks.length === 0) {
    return '';
  }
  
  return `
    <div class="mb-6">
      <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span class="w-1 h-4 bg-purple-600 rounded"></span>
        Lopende Taken
      </h4>
      <div class="space-y-2">
        ${renderTaskSection('Urgent', tasksByStatus.urgent, 'red')}
        ${renderTaskSection('Deze Week', tasksByStatus.thisWeek, 'blue')}
        ${renderTaskSection('In Behandeling', tasksByStatus.active, 'green')}
      </div>
    </div>
  `;
}

/**
 * Render task section
 */
function renderTaskSection(title, tasks, color) {
  if (tasks.length === 0) return '';
  
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };
  
  const taskItems = tasks.slice(0, 5).map(task => renderTaskItem(task)).join('');
  const moreCount = tasks.length - 5;
  
  return `
    <div class="bg-white border border-gray-200 rounded-lg p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-bold text-gray-700">${title}</div>
        <div class="text-xs px-2 py-0.5 rounded-full ${colorClasses[color]}">${tasks.length}</div>
      </div>
      <div class="space-y-1.5">
        ${taskItems}
        ${moreCount > 0 ? `
          <div class="text-xs text-gray-500 text-center pt-1">
            +${moreCount} meer taken
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render single task item
 */
function renderTaskItem(task) {
  const statusColor = window.MondayIntegration.getStatusColorClass(task.status);
  const priorityColor = window.MondayIntegration.getPriorityColorClass(task.priority);
  const deadline = window.MondayIntegration.formatDeadline(task.deadline);
  
  const statusDot = `<span class="w-2 h-2 rounded-full bg-${statusColor}-500 inline-block"></span>`;
  
  return `
    <div class="py-2 px-2.5 hover:bg-gray-50 rounded border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
         onclick="openMondayTask('${task.id}')">
      <div class="flex items-start gap-2">
        <div class="mt-1">${statusDot}</div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-gray-800 truncate">${task.name}</div>
          <div class="flex items-center gap-2 mt-1">
            ${task.typeWork ? `<span class="text-xs text-gray-500">${task.typeWork}</span>` : ''}
            ${deadline ? `
              <span class="text-xs text-gray-400">•</span>
              <span class="text-xs text-${priorityColor}-600 font-medium">${deadline}</span>
            ` : ''}
          </div>
          ${task.supplier ? `
            <div class="text-xs text-gray-500 mt-1 truncate">${task.supplier}</div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render contact search widget
 */
function renderContactSearch(partners) {
  const types = [...new Set(partners.map(p => p.type))].filter(Boolean).sort();
  
  const typeOptions = types.map(type => 
    `<option value="${type}">${type}</option>`
  ).join('');
  
  return `
    <div class="mb-6 bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
      <h4 class="text-sm font-bold text-gray-800 mb-3">Zoek Specialist</h4>
      
      <div class="space-y-2">
        <select id="contactSearchType" class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          <option value="">Alle types</option>
          ${typeOptions}
        </select>
        
        <input type="text" 
               id="contactSearchExpertise" 
               placeholder="Expertise (bijv. HVAC, ruwbouw)"
               class="w-full text-xs border border-gray-300 rounded px-2 py-1.5">
        
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-600">Min. score:</label>
          <input type="number" 
                 id="contactSearchScore" 
                 min="0" 
                 max="10" 
                 step="0.5"
                 placeholder="0-10"
                 class="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5">
        </div>
        
        <button onclick="executeContactSearch()" 
                class="w-full bg-blue-600 text-white text-xs font-medium py-2 rounded hover:bg-blue-700 transition-colors">
          Zoeken
        </button>
      </div>
      
      <div id="contactSearchResults" class="mt-3"></div>
    </div>
  `;
}

/**
 * Execute contact search
 */
function executeContactSearch() {
  const type = document.getElementById('contactSearchType')?.value;
  const expertise = document.getElementById('contactSearchExpertise')?.value;
  const minScore = parseFloat(document.getElementById('contactSearchScore')?.value) || 0;
  
  // Get cached partners
  const allPartners = window.mondayDataCache?.partners || [];
  
  const results = window.MondayIntegration.searchPartners(allPartners, {
    type: type || null,
    expertise: expertise || null,
    minScore: minScore || null
  });
  
  renderContactSearchResults(results);
}

/**
 * Render contact search results
 */
function renderContactSearchResults(results) {
  const container = document.getElementById('contactSearchResults');
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-gray-500 text-center py-3">
        Geen contacten gevonden
      </div>
    `;
    return;
  }
  
  const resultItems = results.slice(0, 5).map(partner => `
    <div class="py-2 px-2 hover:bg-white rounded border border-gray-100 hover:border-gray-300 transition-colors">
      <div class="text-xs font-medium text-gray-800">${partner.name}</div>
      ${partner.organization ? `<div class="text-xs text-gray-500">${partner.organization}</div>` : ''}
      <div class="flex items-center gap-2 mt-1">
        <span class="text-xs text-gray-600">${partner.type}</span>
        ${partner.score && partner.score !== 'N/A' ? `
          <span class="text-xs text-amber-600 font-bold">${partner.score}/10</span>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = `
    <div class="space-y-1">
      <div class="text-xs text-gray-600 mb-2">${results.length} resultaten</div>
      ${resultItems}
    </div>
  `;
}

/**
 * Open Monday task in new tab
 */
function openMondayTask(taskId) {
  const url = `https://bc-development-company.monday.com/boards/5085794983/pulses/${taskId}`;
  window.open(url, '_blank');
}

// Make functions globally accessible
window.renderMondayProjectData = renderMondayProjectData;
window.renderContactSearch = renderContactSearch;
window.executeContactSearch = executeContactSearch;
window.openMondayTask = openMondayTask;
