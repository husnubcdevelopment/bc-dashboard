// BC Development Dashboard - Configuration (DYNAMIC ACCESS)

// Google OAuth Configuration
window.CLIENT_ID = '857189998421-7nakrdu1cdm1cl76janm56dkalhl9tc3.apps.googleusercontent.com';
window.SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Root folder ID
const PROJECTS_ROOT_FOLDER_ID = '1Tv464M-ly8wbxRj9QmboW7YuSn53yqcw';
const OWNER_EMAIL = 'info@bcimmo.be';

// Project naming convention filters
const PROJECT_NAME_FILTERS = {
  enabled: true,
  patterns: [
    /^\d{4}_/,
    /_[A-Z]/,
  ]
};

// ========================================
// 🎨 PREMIUM SINGLE COLOR SYSTEM
// Alle mappen krijgen DEZELFDE premium kleur
// Clean, elegant, professional - GEEN carnaval
// ========================================

// Kies ÉÉN premium kleur voor alle categorieën
// Geïnspireerd door je logo: Navy + Gold accent
const PREMIUM_CATEGORY_STYLE = {
  // Light mode
  bg: '#f0f4f8',           // Zeer subtiel licht blauw/grijs
  border: '#d9e2ec',       // Zachte border
  text: '#334e68',         // Navy text (van je logo)
  textHover: '#1e3a52',    // Donkerder navy on hover
  
  // Accent (voor hover states)
  hoverBg: '#e6eef5',      // Iets donkerder bij hover
  hoverBorder: '#b8975a',  // Gold accent van je logo
  
  // Dark mode versie
  bgDark: '#1f2937',
  borderDark: '#374151',
  textDark: '#f0f6fc',
  hoverBgDark: '#2d3748',
};

// ========================================
// 🔧 HELPER FUNCTIONS
// ========================================

function parseCategoryNumber(folderName) {
  const match = folderName.match(/^(\d{1,2})[\s._-]/);
  return match ? parseInt(match[1]) : null;
}

function createCategoryId(folderName) {
  return folderName
    .replace(/^\d{1,2}[\s._-]/, '')
    .toLowerCase()
    .replace(/[\s._-]+/g, '_');
}

// 🎨 Get category style - ALLE MAPPEN DEZELFDE PREMIUM KLEUR
function getCategoryStyle(categoryNumber) {
  // Iedereen krijgt dezelfde style - clean & premium
  return {
    icon: "", // GEEN emoji
    colorClass: "category-premium", // Single class voor alle categorieën
    bg: PREMIUM_CATEGORY_STYLE.bg,
    border: PREMIUM_CATEGORY_STYLE.border,
    text: PREMIUM_CATEGORY_STYLE.text,
    textHover: PREMIUM_CATEGORY_STYLE.textHover,
    hoverBg: PREMIUM_CATEGORY_STYLE.hoverBg,
    hoverBorder: PREMIUM_CATEGORY_STYLE.hoverBorder
  };
}

// Build categories dynamically from folders
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
      colorClass: style.colorClass, // "category-premium" voor IEDEREEN
      bg: style.bg,
      border: style.border,
      text: style.text,
      textHover: style.textHover,
      hoverBg: style.hoverBg,
      hoverBorder: style.hoverBorder,
      items: [],
      subfolders: [],
      _folderId: folder.id,
      _categoryNumber: categoryNum
    });
  }
  
  return categories;
}

function matchesProjectNamingConvention(folderName) {
  if (!PROJECT_NAME_FILTERS.enabled) return true;
  return PROJECT_NAME_FILTERS.patterns.some(pattern => pattern.test(folderName));
}

const CONFIG = {
  projects: [],
  categories: []
};