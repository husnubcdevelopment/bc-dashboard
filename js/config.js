// BC Development Dashboard - Configuration

// Google OAuth Configuration
window.CLIENT_ID = '857189998421-7nakrdu1cdm1cl76janm56dkalhl9tc3.apps.googleusercontent.com';
window.SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Root folder ID - Your main "BC Development/Projects" folder (for BC Immo users)
const PROJECTS_ROOT_FOLDER_ID = '1Tv464M-ly8wbxRj9QmboW7YuSn53yqcw';

// Project Permissions Configuration - WITH DIRECT FOLDER IDS
const PROJECT_PERMISSIONS = {
  'gtahusnu@gmail.com': {
    directAccess: true,
    allowedProjects: [
      {
        name: '2025_DeVenne',
        folderId: '1VsxWc_xVts9p7Upo10ZWLyUL4wfBMOzw'
      }
    ],
    accessLevel: 'read'
  }
};

// Domain whitelist - users from these domains get full access via parent folder
const ALLOWED_DOMAINS = ['bcimmo.be'];

// DYNAMIC CATEGORIES: Auto-discover from Drive + fallback definitions
// De volgorde en standaard info voor bekende categorieën
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
  // Voeg meer nummers toe als je wilt...
  // Voor onbekende nummers wordt een default gebruikt
};

// Default voor nieuwe/onbekende categorieën
const DEFAULT_CATEGORY_STYLE = {
  icon: "📁",
  colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200"
};

// Categories Configuration - Now dynamically populated!
const CONFIG = {
  projects: [],
  categories: [] // Wordt dynamisch gevuld vanuit Drive!
};

// Helper: Parse category number from folder name
function parseCategoryNumber(folderName) {
  // Matches: "1_", "01_", "1.", "01.", "1-", "01-", "1 "
  const match = folderName.match(/^(\d{1,2})[\s._-]/);
  return match ? parseInt(match[1]) : null;
}

// Helper: Create category ID from folder name
function createCategoryId(folderName) {
  // "1_Prospectie" -> "prospectie"
  // "14_Goedgekeurde_Plannen" -> "goedgekeurde_plannen"
  return folderName
    .replace(/^\d{1,2}[\s._-]/, '') // Remove number prefix
    .toLowerCase()
    .replace(/[\s._-]+/g, '_'); // Replace spaces/dots/dashes with underscore
}

// Helper: Get category style (icon & color)
function getCategoryStyle(categoryNumber) {
  return CATEGORY_TEMPLATES[categoryNumber] || DEFAULT_CATEGORY_STYLE;
}

// Helper: Build categories dynamically from folders
function buildDynamicCategories(folders) {
  const categories = [];
  const seenNumbers = new Set();
  
  // Sort folders by number
  const sortedFolders = folders.sort((a, b) => {
    const numA = parseCategoryNumber(a.name) || 999;
    const numB = parseCategoryNumber(b.name) || 999;
    return numA - numB;
  });
  
  for (const folder of sortedFolders) {
    const categoryNum = parseCategoryNumber(folder.name);
    
    // Skip if we've already seen this number (shouldn't happen but just in case)
    if (categoryNum && seenNumbers.has(categoryNum)) continue;
    if (categoryNum) seenNumbers.add(categoryNum);
    
    const id = createCategoryId(folder.name);
    const style = getCategoryStyle(categoryNum);
    
    // Extract subfolder names (will be populated later when project is selected)
    categories.push({
      id: id,
      title: folder.name,
      icon: style.icon,
      colorClass: style.colorClass,
      items: [], // Will be populated with subfolders dynamically
      subfolders: [],
      _folderId: folder.id, // Store folder ID for later use
      _categoryNumber: categoryNum
    });
  }
  
  return categories;
}

// Permission Helper Functions
function checkUserAccess(userEmail, projectName) {
  if (!userEmail) return false;
  
  const domain = userEmail.split('@')[1];
  if (ALLOWED_DOMAINS.includes(domain)) {
    return true;
  }
  
  const userPerms = PROJECT_PERMISSIONS[userEmail];
  if (!userPerms) return false;
  
  if (userPerms.directAccess) {
    return userPerms.allowedProjects.some(p => p.name === projectName);
  }
  
  return userPerms.allowedProjects.includes(projectName);
}

function filterProjectsByAccess(projects, userEmail) {
  if (!userEmail) return [];
  
  const domain = userEmail.split('@')[1];
  if (ALLOWED_DOMAINS.includes(domain)) {
    return projects;
  }
  
  const userPerms = PROJECT_PERMISSIONS[userEmail];
  if (!userPerms) return [];
  
  if (userPerms.directAccess) {
    const allowedNames = userPerms.allowedProjects.map(p => p.name);
    return projects.filter(p => allowedNames.includes(p.name));
  }
  
  return projects.filter(p => userPerms.allowedProjects.includes(p.name));
}

// Check if user has direct access (bypasses parent folder)
function hasDirectAccess(userEmail) {
  if (!userEmail) return false;
  const userPerms = PROJECT_PERMISSIONS[userEmail];
  return userPerms && userPerms.directAccess === true;
}