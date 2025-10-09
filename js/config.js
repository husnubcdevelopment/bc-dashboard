// BC Development Dashboard - Configuration (DYNAMIC ACCESS)

// Google OAuth Configuration
window.CLIENT_ID = '857189998421-7nakrdu1cdm1cl76janm56dkalhl9tc3.apps.googleusercontent.com';
window.SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Root folder ID - Your main "BC Development/Projects" folder
const PROJECTS_ROOT_FOLDER_ID = '1Tv464M-ly8wbxRj9QmboW7YuSn53yqcw';

// Owner email for filtering shared projects (optional but recommended)
// This ensures we only show projects from BC Development, not random shared folders
const OWNER_EMAIL = 'info@bcimmo.be'; // Change to your BC Development Google Workspace email

// Project naming convention filters (optional - helps filter out non-project folders)
// Adjust these based on your naming conventions
const PROJECT_NAME_FILTERS = {
  enabled: true,
  patterns: [
    /^\d{4}_/,        // Starts with year: 2025_ProjectName
    /_[A-Z]/,         // Contains underscore + capital letter
  ]
};

// DYNAMIC CATEGORIES: Auto-discover from Drive + fallback definitions
const CATEGORY_TEMPLATES = {
  1: { icon: "📊", colorClass: "bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200" },
  2: { icon: "✅", colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200" },
  3: { icon: "👥", colorClass: "bg-orange-100 border-orange-400 text-orange-900 hover:bg-orange-200" },
  4: { icon: "💰", colorClass: "bg-green-100 border-green-400 text-green-900 hover:bg-green-200" },
  5: { icon: "🗺️", colorClass: "bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200" },
  6: { icon: "🏢", colorClass: "bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200" },
  7: { icon: "📄", colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200" },
  8: { icon: "⚖️", colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200" },
  9: { icon: "💡", colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200" },
  10: { icon: "📈", colorClass: "bg-indigo-100 border-indigo-400 text-indigo-900 hover:bg-indigo-200" },
  11: { icon: "📋", colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200" },
  12: { icon: "📤", colorClass: "bg-red-100 border-red-400 text-red-900 hover:bg-red-200" },
  13: { icon: "✔️", colorClass: "bg-red-100 border-red-400 text-red-900 hover:bg-red-200" },
  14: { icon: "📐", colorClass: "bg-teal-100 border-teal-400 text-teal-900 hover:bg-teal-200" },
  15: { icon: "🔧", colorClass: "bg-pink-100 border-pink-400 text-pink-900 hover:bg-pink-200" },
  16: { icon: "🎯", colorClass: "bg-cyan-100 border-cyan-400 text-cyan-900 hover:bg-cyan-200" },
  17: { icon: "🔍", colorClass: "bg-lime-100 border-lime-400 text-lime-900 hover:bg-lime-200" },
  18: { icon: "📱", colorClass: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 hover:bg-fuchsia-200" },
  19: { icon: "🌟", colorClass: "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200" },
  20: { icon: "🎨", colorClass: "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200" }
};

// Default for unknown categories
const DEFAULT_CATEGORY_STYLE = {
  icon: "📁",
  colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200"
};

// Categories Configuration
const CONFIG = {
  projects: [],
  categories: []
};

// Helper: Parse category number from folder name
function parseCategoryNumber(folderName) {
  const match = folderName.match(/^(\d{1,2})[\s._-]/);
  return match ? parseInt(match[1]) : null;
}

// Helper: Create category ID from folder name
function createCategoryId(folderName) {
  return folderName
    .replace(/^\d{1,2}[\s._-]/, '')
    .toLowerCase()
    .replace(/[\s._-]+/g, '_');
}

// Helper: Get category style (icon & color)
function getCategoryStyle(categoryNumber) {
  return CATEGORY_TEMPLATES[categoryNumber] || DEFAULT_CATEGORY_STYLE;
}

// Helper: Build categories dynamically from folders
function buildDynamicCategories(folders) {
  const categories = [];
  const seenNumbers = new Set();
  
  const sortedFolders = folders.sort((a, b) => {
    const numA = parseCategoryNumber(a.name) || 999;
    const numB = parseCategoryNumber(b.name) || 999;
    return numA - numB;
  });
  
  for (const folder of sortedFolders) {
    const categoryNum = parseCategoryNumber(folder.name);
    
    if (categoryNum && seenNumbers.has(categoryNum)) continue;
    if (categoryNum) seenNumbers.add(categoryNum);
    
    const id = createCategoryId(folder.name);
    const style = getCategoryStyle(categoryNum);
    
    categories.push({
      id: id,
      title: folder.name,
      icon: style.icon,
      colorClass: style.colorClass,
      items: [],
      subfolders: [],
      _folderId: folder.id,
      _categoryNumber: categoryNum
    });
  }
  
  return categories;
}

// Helper: Check if folder name matches project naming conventions
function matchesProjectNamingConvention(folderName) {
  if (!PROJECT_NAME_FILTERS.enabled) return true;
  
  return PROJECT_NAME_FILTERS.patterns.some(pattern => pattern.test(folderName));
}