// BC Development Dashboard - Drive API Module (DYNAMIC ACCESS)

// ===== USER & ACCESS DETECTION =====

// Get current authenticated user
async function getCurrentUser() {
  try {
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/about',
      params: { fields: 'user' }
    });
    return response.result.user;
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
}

// Check if user has access to root folder
async function hasAccessToRoot() {
  if (!PROJECTS_ROOT_FOLDER_ID) return false;
  
  try {
    await gapi.client.drive.files.get({
      fileId: PROJECTS_ROOT_FOLDER_ID,
      fields: 'id,name'
    });
    console.log('✓ User has access to root folder');
    return true;
  } catch (e) {
    if (e.status === 404 || e.status === 403) {
      console.log('✗ User does NOT have access to root folder');
      return false;
    }
    console.error('Error checking root access:', e);
    return false;
  }
}

// ===== PROJECT DISCOVERY METHODS =====

// Method 1: List projects from root folder (for admins/owners)
async function listProjectsFromRoot() {
  console.log('📂 Discovering projects from root folder...');
  
  try {
    const response = await gapi.client.drive.files.list({
      q: `'${PROJECTS_ROOT_FOLDER_ID}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name'
    });
    
    const folders = response.result.files || [];
    console.log(`Found ${folders.length} folders in root`);
    
    // Filter by naming convention if enabled
    const filtered = PROJECT_NAME_FILTERS.enabled
      ? folders.filter(f => matchesProjectNamingConvention(f.name))
      : folders;
    
    console.log(`After filtering: ${filtered.length} projects`);
    return filtered;
  } catch (e) {
    console.error('Error listing projects from root:', e);
    return [];
  }
}

// Method 2: List projects shared with current user (for external users)
async function listProjectsSharedWithMe(ownerEmail = OWNER_EMAIL) {
  console.log('🔗 Discovering projects shared with me...');
  
  try {
    // Build query
    let query = `sharedWithMe and trashed=false and mimeType='application/vnd.google-apps.folder'`;
    
    // Add owner filter if provided
    if (ownerEmail) {
      query += ` and '${ownerEmail}' in owners`;
    }
    
    // Add naming convention filter if enabled
    if (PROJECT_NAME_FILTERS.enabled) {
      // For year-based projects: name contains '2024_' or '2025_' etc.
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 1, currentYear, currentYear + 1];
      const yearFilters = years.map(y => `name contains '${y}_'`).join(' or ');
      query += ` and (${yearFilters})`;
    }
    
    console.log('Query:', query);
    
    const response = await gapi.client.drive.files.list({
      q: query,
      fields: 'files(id,name,modifiedTime,owners,shared)',
      orderBy: 'name',
      pageSize: 100
    });
    
    const folders = response.result.files || [];
    console.log(`Found ${folders.length} shared folders`);
    
    // Additional filtering by naming convention
    const filtered = folders.filter(f => matchesProjectNamingConvention(f.name));
    
    console.log(`After naming filter: ${filtered.length} projects`);
    return filtered;
  } catch (e) {
    console.error('Error listing shared projects:', e);
    return [];
  }
}

// ===== UNIFIED PROJECT DISCOVERY (PARALLEL + LAZY LOADING) =====

// Main discovery function - automatically chooses the right method
async function discoverProjects() {
  console.log('🔍 Starting project discovery...');
  
  const user = await getCurrentUser();
  if (!user) {
    console.error('Cannot discover projects: user not authenticated');
    return [];
  }
  
  window.CURRENT_USER_EMAIL = user.emailAddress;
  console.log('Current user:', user.emailAddress);
  
  // Check access to root
  const hasRoot = await hasAccessToRoot();
  
  // Choose discovery method
  let projectFolders = [];
  if (hasRoot) {
    console.log('→ Using ROOT folder discovery (admin mode)');
    projectFolders = await listProjectsFromRoot();
  } else {
    console.log('→ Using SHARED WITH ME discovery (external user mode)');
    projectFolders = await listProjectsSharedWithMe();
  }
  
  if (projectFolders.length === 0) {
    console.warn('No projects found for this user');
    return [];
  }
  
  // 🚀 NEW: Return projects immediately WITHOUT loading categories
  // Categories will be loaded on-demand (lazy loading)
  const projects = projectFolders.map(folder => ({
    id: folder.id,
    name: folder.name,
    modifiedTime: folder.modifiedTime,
    baseFolderId: folder.id,
    dynamicCategories: null, // Will be loaded on demand
    folders: {},
    _categoriesLoaded: false
  }));
  
  console.log(`✓ Discovery complete: ${projects.length} projects (categories will load on demand)`);
  
  // 🎯 Start loading categories in parallel in the background
  loadProjectCategoriesInBackground(projects);
  
  return projects;
}

// 🚀 NEW: Load categories for all projects in parallel (background)
async function loadProjectCategoriesInBackground(projects) {
  console.log('🔄 Loading categories for all projects in parallel...');
  
  const startTime = Date.now();
  
  // Load all categories in parallel
  const categoryPromises = projects.map(async (project, index) => {
    try {
      // Small delay for each project to stagger API calls (prevents rate limiting)
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      const categories = await discoverCategoriesFromProject(project.baseFolderId);
      
      // Update project object
      project.dynamicCategories = categories;
      project._categoriesLoaded = true;
      
      // Build folders mapping
      project.folders = {};
      for (const cat of categories) {
        project.folders[cat.id] = cat._folderId;
      }
      
      console.log(`  ✓ [${index + 1}/${projects.length}] ${project.name}: ${categories.length} categories`);
      
      // 🎨 PROGRESSIVE RENDERING: Update UI immediately
      renderProjectsOverview(window.DYNAMIC_PROJECTS);
      
      return { project, categories };
    } catch (error) {
      console.error(`  ✗ Failed to load categories for ${project.name}:`, error);
      project._categoriesLoaded = true; // Mark as loaded (failed) to prevent retry
      project.dynamicCategories = [];
      return { project, categories: [] };
    }
  });
  
  // Wait for all to complete
  await Promise.all(categoryPromises);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ All categories loaded in ${duration}s`);
  
  // Final UI update
  renderProjectsOverview(window.DYNAMIC_PROJECTS);
  populateProjectSelector();
}

// 🚀 NEW: Ensure project has categories loaded (lazy load on demand)
async function ensureProjectCategoriesLoaded(project) {
  if (project._categoriesLoaded) {
    return project.dynamicCategories;
  }
  
  console.log(`⏳ Loading categories for ${project.name}...`);
  
  const categories = await discoverCategoriesFromProject(project.baseFolderId);
  
  // Update project
  project.dynamicCategories = categories;
  project._categoriesLoaded = true;
  
  // Build folders mapping
  project.folders = {};
  for (const cat of categories) {
    project.folders[cat.id] = cat._folderId;
  }
  
  console.log(`✓ Loaded ${categories.length} categories for ${project.name}`);
  
  return categories;
}

// ===== CATEGORY & FILE OPERATIONS (unchanged) =====

// List child folders in a parent folder (WITH CACHE)
async function listChildFolders(parentId, useCache = true) {
  if (useCache) {
    const cached = CacheManager.get('folders', parentId, CacheManager.EXPIRY.CATEGORIES);
    if (cached) return cached;
  }

  try {
    const response = await gapi.client.drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name_natural asc'
    });
    
    const folders = response.result.files || [];
    CacheManager.set('folders', parentId, folders);
    return folders;
  } catch (e) {
    console.error('listChildFolders error:', e);
    return [];
  }
}

// Discover categories dynamically from a project folder
async function discoverCategoriesFromProject(projectFolderId, useCache = true) {
  if (useCache) {
    const cached = CacheManager.get('categories', projectFolderId, CacheManager.EXPIRY.CATEGORIES);
    if (cached) return cached;
  }

  const folders = await listChildFolders(projectFolderId, useCache);
  
  // Filter: only folders that start with a number
  const categoryFolders = folders.filter(f => /^\d{1,2}[\s._-]/.test(f.name));
  const categories = buildDynamicCategories(categoryFolders);
  
  // Populate subfolders as items
  for (const category of categories) {
    const subfolders = await listChildFolders(category._folderId, useCache);
    category.items = subfolders.map(sf => sf.name);
    category.subfolders = subfolders;
  }
  
  CacheManager.set('categories', projectFolderId, categories);
  return categories;
}

// Get folder structure with subfolders
async function getFolderStructure(folderId, useCache = true) {
  if (useCache) {
    const cached = CacheManager.get('structure', folderId, CacheManager.EXPIRY.FILES);
    if (cached) return cached;
  }

  const structure = { files: [], subfolders: [] };
  
  try {
    const filesResponse = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
      orderBy: 'modifiedTime desc'
    });
    structure.files = filesResponse.result.files || [];
    
    const subfolders = await listChildFolders(folderId, useCache);
    for (const subfolder of subfolders) {
      const subFiles = await gapi.client.drive.files.list({
        q: `'${subfolder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
        orderBy: 'modifiedTime desc'
      });
      
      structure.subfolders.push({
        id: subfolder.id,
        name: subfolder.name,
        files: subFiles.result.files || []
      });
    }
    
    CacheManager.set('structure', folderId, structure);
    return structure;
  } catch (e) {
    console.error('getFolderStructure error:', e);
    return structure;
  }
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}