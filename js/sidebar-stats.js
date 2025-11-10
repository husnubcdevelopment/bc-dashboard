// BC Development Dashboard - Statistics Sidebar Module

// ===== CONFIGURATION =====
const CATEGORY_CONFIG = {
  '0_TIJDELIJK': { icon: '⏱️', color: '#FFA500', name: 'Tijdelijk' },
  '1_Prospectie': { icon: '🔍', color: '#3B82F6', name: 'Prospectie' },
  '2_Overeenkomst(en)': { icon: '📝', color: '#10B981', name: 'Overeenkomst(en)' },
  '3_Stakeholders': { icon: '👥', color: '#8B5CF6', name: 'Stakeholders' },
  '4_Financien': { icon: '💰', color: '#EF4444', name: 'Financiën' },
  '5_Plannen': { icon: '📋', color: '#F59E0B', name: 'Plannen' },
  '6_OMV': { icon: '🏗️', color: '#06B6D4', name: 'OMV' },
  '7_Akte : Basisakte': { icon: '📜', color: '#EC4899', name: 'Akte: Basisakte' },
  '8_Juridisch': { icon: '⚖️', color: '#6366F1', name: 'Juridisch' },
  '9_Adviezen': { icon: '💡', color: '#14B8A6', name: 'Adviezen' },
  '10_Marktonderzoek': { icon: '📊', color: '#8B5CF6', name: 'Marktonderzoek' },
  '11_Verslagen': { icon: '📄', color: '#3B82F6', name: 'Verslagen' },
  '12_Offertes': { icon: '💼', color: '#F59E0B', name: 'Offertes' },
  '13_Goedgekeurde Offertes': { icon: '✅', color: '#10B981', name: 'Goedgekeurde Offertes' },
  '14_Afbeeldingen': { icon: '🖼️', color: '#EC4899', name: 'Afbeeldingen' },
  '15_Informatie': { icon: 'ℹ️', color: '#6B7280', name: 'Informatie' }
};

// File type configuration
const FILE_TYPES = {
  'application/vnd.google-apps.document': { icon: '📄', name: 'Docs', color: '#4285F4' },
  'application/vnd.google-apps.spreadsheet': { icon: '📊', name: 'Sheets', color: '#0F9D58' },
  'application/pdf': { icon: '📕', name: 'PDF', color: '#F40F02' },
  'image/jpeg': { icon: '🖼️', name: 'Afbeelding', color: '#EA4335' },
  'image/png': { icon: '🖼️', name: 'Afbeelding', color: '#EA4335' },
  'application/vnd.google-apps.presentation': { icon: '📽️', name: 'Slides', color: '#F4B400' },
  'application/vnd.google-apps.folder': { icon: '📁', name: 'Map', color: '#5F6368' }
};

// Global state
let currentProjectStats = null;
let sidebarVisible = false;

// ===== MAIN STATS CALCULATION =====

/**
 * Calculate statistics for all categories in a project
 */
async function calculateProjectStats(projectFolderId, projectName) {
  console.log(`📊 Calculating stats for project: ${projectName}`);
  
  try {
    // Get all folders in the project (categories)
    const categoriesResponse = await gapi.client.drive.files.list({
      q: `'${projectFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name'
    });
    
    const categories = categoriesResponse.result.files || [];
    console.log(`Found ${categories.length} categories`);
    
    // Calculate stats for each category
    const categoryStats = await Promise.all(
      categories.map(category => calculateCategoryStats(category))
    );
    
    // Calculate overall project stats
    const projectStats = {
      projectName,
      projectId: projectFolderId,
      categories: categoryStats,
      totals: calculateTotals(categoryStats),
      lastUpdated: new Date().toISOString()
    };
    
    currentProjectStats = projectStats;
    return projectStats;
    
  } catch (error) {
    console.error('Error calculating project stats:', error);
    return null;
  }
}

/**
 * Calculate statistics for a single category
 */
async function calculateCategoryStats(category) {
  const config = CATEGORY_CONFIG[category.name] || {
    icon: '📁',
    color: '#6B7280',
    name: category.name
  };
  
  try {
    // Get all files and subfolders in this category
    const response = await gapi.client.drive.files.list({
      q: `'${category.id}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,size)',
      pageSize: 1000
    });
    
    const items = response.result.files || [];
    
    // Analyze file types
    const fileTypeStats = {};
    let totalSize = 0;
    let folderCount = 0;
    let fileCount = 0;
    
    items.forEach(item => {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        folderCount++;
      } else {
        fileCount++;
        const typeInfo = FILE_TYPES[item.mimeType] || { name: 'Overig', icon: '📎', color: '#6B7280' };
        
        if (!fileTypeStats[item.mimeType]) {
          fileTypeStats[item.mimeType] = {
            count: 0,
            ...typeInfo
          };
        }
        fileTypeStats[item.mimeType].count++;
        
        // Add size if available (Google Docs don't have size)
        if (item.size) {
          totalSize += parseInt(item.size);
        }
      }
    });
    
    // Get most recent file
    const sortedItems = items
      .filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
    
    return {
      id: category.id,
      name: category.name,
      displayName: config.name,
      icon: config.icon,
      color: config.color,
      totalItems: items.length,
      fileCount,
      folderCount,
      fileTypes: fileTypeStats,
      totalSize,
      lastModified: category.modifiedTime,
      mostRecentFile: sortedItems[0] || null
    };
    
  } catch (error) {
    console.error(`Error calculating stats for ${category.name}:`, error);
    return {
      id: category.id,
      name: category.name,
      displayName: config.name,
      icon: config.icon,
      color: config.color,
      error: true
    };
  }
}

/**
 * Calculate totals across all categories
 */
function calculateTotals(categoryStats) {
  return categoryStats.reduce((acc, cat) => {
    acc.totalFiles += cat.fileCount || 0;
    acc.totalFolders += cat.folderCount || 0;
    acc.totalSize += cat.totalSize || 0;
    return acc;
  }, { totalFiles: 0, totalFolders: 0, totalSize: 0 });
}

// ===== UI RENDERING =====

/**
 * Toggle sidebar visibility
 */
function toggleStatsSidebar() {
  sidebarVisible = !sidebarVisible;
  const sidebar = document.getElementById('statsSidebar');
  const toggleBtn = document.getElementById('statsSidebarToggle');
  
  if (sidebarVisible) {
    sidebar.classList.remove('translate-x-full');
    sidebar.classList.add('translate-x-0');
    toggleBtn.innerHTML = '✕';
    toggleBtn.setAttribute('title', 'Sluit statistieken');
  } else {
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('translate-x-full');
    toggleBtn.innerHTML = '📊';
    toggleBtn.setAttribute('title', 'Toon statistieken');
  }
}

/**
 * Render the statistics sidebar
 */
function renderStatsSidebar(stats) {
  if (!stats) return;
  
  const container = document.getElementById('statsSidebarContent');
  
  // Project header
  const projectHeader = `
    <div class="mb-6 pb-4 border-b">
      <h3 class="text-lg font-bold text-gray-800 mb-2">📁 ${stats.projectName}</h3>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div class="bg-blue-50 p-2 rounded text-center">
          <div class="font-bold text-blue-600">${stats.totals.totalFiles}</div>
          <div class="text-gray-600">Bestanden</div>
        </div>
        <div class="bg-green-50 p-2 rounded text-center">
          <div class="font-bold text-green-600">${stats.totals.totalFolders}</div>
          <div class="text-gray-600">Mappen</div>
        </div>
        <div class="bg-purple-50 p-2 rounded text-center">
          <div class="font-bold text-purple-600">${formatFileSize(stats.totals.totalSize)}</div>
          <div class="text-gray-600">Grootte</div>
        </div>
      </div>
    </div>
  `;
  
  // Category statistics
  const categoryCards = stats.categories
    .filter(cat => !cat.error)
    .map(cat => renderCategoryCard(cat))
    .join('');
  
  container.innerHTML = projectHeader + categoryCards;
}

/**
 * Render a single category card
 */
function renderCategoryCard(category) {
  const isEmpty = category.fileCount === 0 && category.folderCount === 0;
  const chartId = `chart-${category.id}`;
  
  // File type breakdown
  const fileTypeBreakdown = Object.entries(category.fileTypes || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([type, info]) => `
      <div class="flex items-center justify-between text-xs">
        <span>${info.icon} ${info.name}</span>
        <span class="font-semibold">${info.count}</span>
      </div>
    `).join('');
  
  // Most recent file
  const recentFile = category.mostRecentFile ? `
    <div class="text-xs text-gray-500 mt-2 pt-2 border-t">
      <div class="font-semibold mb-1">Laatst gewijzigd:</div>
      <div class="truncate">${category.mostRecentFile.name}</div>
      <div class="text-gray-400">${formatDate(category.mostRecentFile.modifiedTime)}</div>
    </div>
  ` : '';
  
  const html = `
    <div class="category-stat-card mb-4 p-4 bg-white rounded-lg border-2 hover:shadow-md transition-all cursor-pointer"
         style="border-color: ${category.color}20"
         onclick="highlightCategory('${category.name}')">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${category.icon}</span>
          <div>
            <h4 class="font-bold text-sm text-gray-800">${category.displayName}</h4>
            <p class="text-xs text-gray-500">${category.totalItems} items</p>
          </div>
        </div>
        ${isEmpty ? '<span class="text-xs bg-gray-100 px-2 py-1 rounded">Leeg</span>' : ''}
      </div>
      
      ${!isEmpty ? `
        <!-- Chart Canvas -->
        ${Object.keys(category.fileTypes || {}).length > 0 ? `
          <div class="mb-3">
            <canvas id="${chartId}" width="100" height="100"></canvas>
          </div>
        ` : ''}
        
        <div class="space-y-1 mb-2">
          ${fileTypeBreakdown || '<div class="text-xs text-gray-400">Geen bestanden</div>'}
        </div>
        
        <!-- Mini progress bar -->
        <div class="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="absolute h-full rounded-full" 
               style="width: ${Math.min(100, (category.fileCount / 10) * 100)}%; background: ${category.color}">
          </div>
        </div>
        
        ${recentFile}
      ` : '<div class="text-center text-gray-400 text-xs py-4">🚫 Geen inhoud</div>'}
    </div>
  `;
  
  // Render chart after DOM insertion
  if (!isEmpty && Object.keys(category.fileTypes || {}).length > 0) {
    setTimeout(() => renderCategoryChart(chartId, category), 100);
  }
  
  return html;
}

/**
 * Render donut chart for category file types
 */
function renderCategoryChart(canvasId, category) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const fileTypes = Object.values(category.fileTypes || {});
  
  if (fileTypes.length === 0) return;
  
  const data = {
    labels: fileTypes.map(ft => ft.name),
    datasets: [{
      data: fileTypes.map(ft => ft.count),
      backgroundColor: fileTypes.map(ft => ft.color || category.color),
      borderWidth: 0
    }]
  };
  
  new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

/**
 * Highlight a category in the main view
 */
function highlightCategory(categoryName) {
  // Find the category card in the main grid
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(card => {
    const titleElement = card.querySelector('h3');
    if (titleElement && titleElement.textContent.includes(categoryName)) {
      // Scroll to card
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight animation
      card.classList.add('ring-4', 'ring-blue-400');
      setTimeout(() => {
        card.classList.remove('ring-4', 'ring-blue-400');
      }, 2000);
    }
  });
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weken geleden`;
  
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== EXPORT =====
window.SidebarStats = {
  calculateProjectStats,
  renderStatsSidebar,
  toggleStatsSidebar
};
