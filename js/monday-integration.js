// BC Development Dashboard - Monday.com Integration Module

// ===== CONFIGURATION =====
const MONDAY_CONFIG = {
  boards: {
    superbord: '5085794983',
    partners: '5085747080',
    contacten: '2018153870'
  },
  

  // Project name mapping (Drive folder name → Monday group)
projectMapping: {
  // Hoofdprojecten
  'Noordlaan': 'group_mkxnjm0z',              // Noordlaan - Genk
  'Noordlaan 20': 'group_mkxnay3s',           // Noordlaan 20 - Genk
  'Wiekstraat': 'group_mkxnww6m',             // Wiekstraat 148 - Genk / EB
  'Bergbeemdstraat': 'group_mkxn81xv',        // Bergbeemdstraat - Genk
  'Zwartberg': 'group_mkxn1328',              // Weg naar Zwartberg - Houthalen
  'Coppéelaan': 'group_mkxnqjkg',             // Evence Coppéelaan 16-18 - Genk
  'Coppee': 'group_mkxnqjkg',                 // Alternatieve spelling
  'As': 'group_mkxnxvcn',                     // Weg naar As BC
  'Zonneweelde': 'group_mkxnby3c',            // Zonneweelde - Genk
  'Gieterijstraat': 'group_mkxnrme0',         // Gieterijstraat 117 - Genk
  'Meilweg': 'group_mkxn1mx5',                // Meilweg - Genk
  'Maaseikerbaan': 'group_mkxnsees',          // Maaseikerbaan - FMG
  'Wildekastanjelaan': 'group_mkxnxdyt',      // Wildekastanjelaan - BC
  'Venne': 'group_mkxn15ht',                  // Project De Venne
  
  // Speciale groepen
  'Archief': 'group_mkxnxws4',                // Archief - Afgerond
  'Administratie': 'group_mkxnh2vz'           // Administratie - Algemeen
}
};

// Global cache for Monday data
let mondayDataCache = {
  partners: null,
  projectTasks: {},
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

// ===== MAIN FUNCTIONS =====

/**
 * Initialize Monday.com integration for a project
 */
async function initializeMondayIntegration(projectName, projectId) {
  console.log(`Initializing Monday.com integration for: ${projectName}`);
  
  try {
    // Find matching Monday group
    const groupId = findMatchingGroup(projectName);
    
    if (!groupId) {
      console.log('No matching Monday.com group found for this project');
      return null;
    }
    
    // Fetch data in parallel
    const [tasks, partners] = await Promise.all([
      fetchProjectTasks(groupId),
      fetchPartners()
    ]);
    
    return {
      projectName,
      projectId,
      groupId,
      tasks,
      partners,
      linkedContacts: extractLinkedContacts(tasks)
    };
    
  } catch (error) {
    console.error('Error initializing Monday integration:', error);
    return null;
  }
}

/**
 * Find matching Monday group ID from project name
 */
function findMatchingGroup(projectName) {
  // Try exact matches first
  for (const [keyword, groupId] of Object.entries(MONDAY_CONFIG.projectMapping)) {
    if (projectName.includes(keyword)) {
      return groupId;
    }
  }
  
  // Try fuzzy match (remove year, underscores, etc.)
  const cleanName = projectName
    .replace(/^\d{4}_DEV_/, '')
    .replace(/_/g, ' ')
    .toLowerCase();
  
  for (const [keyword, groupId] of Object.entries(MONDAY_CONFIG.projectMapping)) {
    if (cleanName.includes(keyword.toLowerCase())) {
      return groupId;
    }
  }
  
  return null;
}

/**
 * Fetch project tasks from Superbord
 */
async function fetchProjectTasks(groupId) {
  // Check cache
  if (mondayDataCache.projectTasks[groupId]) {
    const cacheAge = Date.now() - mondayDataCache.lastFetch;
    if (cacheAge < mondayDataCache.cacheDuration) {
      console.log('Using cached project tasks');
      return mondayDataCache.projectTasks[groupId];
    }
  }
  
  try {
    const query = `
      query {
        boards(ids: [${MONDAY_CONFIG.boards.superbord}]) {
          groups(ids: ["${groupId}"]) {
            id
            title
            items_page(limit: 50) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await callMondayAPI(query);
    
console.log('📦 Raw Monday API response:', response);
console.log('📦 Response keys:', Object.keys(response));
console.log('📦 Has data?:', response.data);
console.log('📦 Has boards?:', response.boards);

// Monday API wraps response in 'data' object
const data = response.data || response;
console.log('📦 Data object:', data);
console.log('📦 Data.boards:', data.boards);

if (!data || !data.boards || !data.boards[0]) {
  console.log('⚠️ No boards in response');
  console.log('Full response:', JSON.stringify(response, null, 2));
  return [];
}
    
    const group = data.boards[0].groups[0];
    if (!group || !group.items_page) {
      console.log('⚠️ No group or items in response');
      return [];
    }
    
    console.log(`📋 Found ${group.items_page.items.length} items in group`);
    
    const tasks = group.items_page.items.map(item => {
      const parsed = parseTaskItem(item);
      console.log('✓ Parsed task:', parsed.name);
      return parsed;
    });
    
    // Cache the results
    mondayDataCache.projectTasks[groupId] = tasks;
    mondayDataCache.lastFetch = Date.now();
    
    return tasks;
    
  } catch (error) {
    console.error('❌ Error fetching project tasks:', error);
    return [];
  }
}

/**
 * Fetch partners/stakeholders from Partners board
 */
async function fetchPartners() {
  // Check cache
  if (mondayDataCache.partners) {
    const cacheAge = Date.now() - mondayDataCache.lastFetch;
    if (cacheAge < mondayDataCache.cacheDuration) {
      console.log('Using cached partners');
      return mondayDataCache.partners;
    }
  }
  
  try {
    const query = `
      query {
        boards(ids: [${MONDAY_CONFIG.boards.partners}]) {
          items_page(limit: 100) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;
    
const response = await callMondayAPI(query);

// Monday API wraps response in 'data' object
const data = response.data || response;

if (!data || !data.boards || !data.boards[0]) {
  return [];
}

const partners = data.boards[0].items_page.items.map(item => parsePartnerItem(item));
    
    // Cache the results
    mondayDataCache.partners = partners;
    mondayDataCache.lastFetch = Date.now();
    
    return partners;
    
  } catch (error) {
    console.error('Error fetching partners:', error);
    return [];
  }
}

/**
 * Parse task item from Monday API response
 */
function parseTaskItem(item) {
  const columns = {};
  
  item.column_values.forEach(col => {
    columns[col.id] = {
      text: col.text,
      value: col.value
    };
  });
  
  return {
    id: item.id,
    name: item.name,
    project: columns.text_mkxnqr1j?.text || '',
    typeTask: columns.color_mkxn4qwv?.text || '',
    status: columns.color_mkxn92ef?.text || '',
    priority: columns.color_mkxn6rdg?.text || '',
    deadline: columns.date_mkxncjw1?.text || '',
    responsible: columns.multiple_person_mkxn1y6q?.text || '',
    budget: columns.numeric_mkxnvpgh?.text || '',
    typeWork: columns.dropdown_mkxnwrg0?.text || '',
    supplier: columns.text_mkxnka9k?.text || '',
    description: columns.long_text_mkxnrg6q?.text || '',
    linkedContactsDev: columns.board_relation_mkxn1sz?.value || null,
    linkedContactsFin: columns.board_relation_mkxn2qjf?.value || null
  };
}

/**
 * Parse partner item from Monday API response
 */
function parsePartnerItem(item) {
  const columns = {};
  
  item.column_values.forEach(col => {
    columns[col.id] = {
      text: col.text,
      value: col.value
    };
  });
  
  return {
    id: item.id,
    name: item.name,
    type: columns.color_mkxnjqpd?.text || '',
    organization: columns.text_mkxn643r?.text || '',
    contact: columns.text_mkxnjsn8?.text || '',
    expertise: columns.long_text_mkxn8zs4?.text || '',
    score: columns.rating_mkxnz6wk?.text || 'N/A',
    previousProjects: columns.long_text_mkxnhh2s?.text || '',
    notes: columns.long_text_mkxnyp66?.text || ''
  };
}

/**
 * Extract linked contacts from tasks
 */
function extractLinkedContacts(tasks) {
  const contactIds = new Set();
  
  tasks.forEach(task => {
    // Parse linked contacts from board relations
    if (task.linkedContactsDev) {
      try {
        const data = JSON.parse(task.linkedContactsDev);
        if (data.linkedPulseIds) {
          data.linkedPulseIds.forEach(id => contactIds.add(id.linkedPulseId));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (task.linkedContactsFin) {
      try {
        const data = JSON.parse(task.linkedContactsFin);
        if (data.linkedPulseIds) {
          data.linkedPulseIds.forEach(id => contactIds.add(id.linkedPulseId));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });
  
  return Array.from(contactIds);
}

/**
 * Get tasks by status/priority for dashboard
 */
function getTasksByStatus(tasks) {
  return {
    urgent: tasks.filter(t => t.priority === 'Urgent' || t.priority.includes('🔴')),
    thisWeek: tasks.filter(t => {
      if (!t.deadline) return false;
      const deadline = new Date(t.deadline);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return deadline >= now && deadline <= weekFromNow;
    }),
    waiting: tasks.filter(t => t.status === 'Wachten' || t.status.includes('⏸')),
    active: tasks.filter(t => t.status === 'Bezig' || t.status.includes('🔄'))
  };
}

/**
 * Get partners by type
 */
function getPartnersByType(partners) {
  const grouped = {};
  
  partners.forEach(partner => {
    const type = partner.type || 'Overig';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(partner);
  });
  
  // Sort by score within each type
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => {
      const scoreA = parseFloat(a.score) || 0;
      const scoreB = parseFloat(b.score) || 0;
      return scoreB - scoreA;
    });
  });
  
  return grouped;
}

/**
 * Search partners by criteria
 */
function searchPartners(partners, criteria) {
  return partners.filter(partner => {
    // Filter by type
    if (criteria.type && partner.type !== criteria.type) {
      return false;
    }
    
    // Filter by expertise
    if (criteria.expertise) {
      const expertise = partner.expertise.toLowerCase();
      if (!expertise.includes(criteria.expertise.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by minimum score
    if (criteria.minScore) {
      const score = parseFloat(partner.score) || 0;
      if (score < criteria.minScore) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Call Monday.com GraphQL API
 */
async function callMondayAPI(query, variables = {}) {
  try {
    const response = await window.MondayTool.executeQuery(query, variables);
    return { data: response }; // Wrap in data object
  } catch (error) {
    console.error('Monday API call failed:', error);
    return { data: {} };
  }
}

/**
 * Format date for display
 */
function formatDeadline(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Verlopen';
  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Morgen';
  if (diffDays <= 7) return `Over ${diffDays} dagen`;
  
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

/**
 * Get status color class
 */
function getStatusColorClass(status) {
  if (!status) return 'gray';
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('klaar') || statusLower.includes('done')) return 'green';
  if (statusLower.includes('bezig') || statusLower.includes('progress')) return 'blue';
  if (statusLower.includes('stuck') || statusLower.includes('blocked')) return 'red';
  if (statusLower.includes('wachten') || statusLower.includes('waiting')) return 'yellow';
  
  return 'gray';
}

/**
 * Get priority color class
 */
function getPriorityColorClass(priority) {
  if (!priority) return 'gray';
  
  const priorityLower = priority.toLowerCase();
  
  if (priorityLower.includes('urgent') || priorityLower.includes('critical')) return 'red';
  if (priorityLower.includes('hoog') || priorityLower.includes('high')) return 'orange';
  if (priorityLower.includes('normaal') || priorityLower.includes('normal')) return 'blue';
  if (priorityLower.includes('laag') || priorityLower.includes('low')) return 'green';
  
  return 'gray';
}

// ===== EXPORT =====
window.MondayIntegration = {
  initializeMondayIntegration,
  fetchProjectTasks,
  fetchPartners,
  getTasksByStatus,
  getPartnersByType,
  searchPartners,
  formatDeadline,
  getStatusColorClass,
  getPriorityColorClass
};

// Temporary bridge for Monday.com API calls
window.MondayTool = {
  async executeQuery(query, variables) {
    // This will be replaced with actual Monday.com connector tool calls
    console.log('Monday API Query:', query);
    return { data: {} };
  }
};
