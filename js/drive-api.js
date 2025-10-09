// BC Development Dashboard - Drive API Module WITH CACHING

// List child folders in a parent folder (WITH CACHE)
async function listChildFolders(parentId, useCache = true) {
  // Try cache first
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
    
    // Cache the result
    CacheManager.set('folders', parentId, folders);
    
    return folders;
  } catch (e) {
    console.error('listChildFolders error:', e);
    return [];
  }
}

// List files recursively including all subfolders
async function listFilesRecursive(folderId, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];
  
  try {
    const filesResponse = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100
    });
    
    let allFiles = filesResponse.result.files || [];
    
    const subfolders = await listChildFolders(folderId);
    
    for (const subfolder of subfolders) {
      const subFiles = await listFilesRecursive(subfolder.id, depth + 1, maxDepth);
      subFiles.forEach(file => {
        file.folderPath = subfolder.name + (file.folderPath ? '/' + file.folderPath : '');
      });
      allFiles = allFiles.concat(subFiles);
    }
    
    return allFiles;
  } catch (e) {
    console.error('listFilesRecursive error:', e);
    return [];
  }
}

// List files in a folder (WITH CACHE)
async function listFiles(folderId, recursive = true, useCache = true) {
  // Try cache first
  if (useCache) {
    const cached = CacheManager.get('files', folderId, CacheManager.EXPIRY.FILES);
    if (cached) return cached;
  }

  let files;
  
  if (recursive) {
    files = await listFilesRecursive(folderId);
  } else {
    try {
      const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
        orderBy: 'modifiedTime desc'
      });
      files = response.result.files || [];
    } catch (e) {
      console.error('listFiles error:', e);
      files = [];
    }
  }
  
  // Cache the result
  CacheManager.set('files', folderId, files);
  
  return files;
}

// Get detailed folder structure with subfolders (WITH CACHE)
async function getFolderStructure(folderId, useCache = true) {
  // Try cache first
  if (useCache) {
    const cached = CacheManager.get('structure', folderId, CacheManager.EXPIRY.FILES);
    if (cached) return cached;
  }

  const structure = {
    files: [],
    subfolders: []
  };
  
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
    
    // Cache the result
    CacheManager.set('structure', folderId, structure);
    
    return structure;
  } catch (e) {
    console.error('getFolderStructure error:', e);
    return structure;
  }
}

// Get folder metadata by ID
async function getFolderMetadata(folderId) {
  try {
    const response = await gapi.client.drive.files.get({
      fileId: folderId,
      fields: 'id,name,modifiedTime'
    });
    return response.result;
  } catch (e) {
    console.error('getFolderMetadata error:', e);
    return null;
  }
}

// Discover categories dynamically from a project folder (WITH CACHE)
async function discoverCategoriesFromProject(projectFolderId, useCache = true) {
  // Try cache first
  if (useCache) {
    const cached = CacheManager.get('categories', projectFolderId, CacheManager.EXPIRY.CATEGORIES);
    if (cached) return cached;
  }

  const folders = await listChildFolders(projectFolderId, useCache);
  
  // Filter: only folders that start with a number (1_, 2_, etc.)
  const categoryFolders = folders.filter(f => {
    return /^\d{1,2}[\s._-]/.test(f.name);
  });
  
  const categories = buildDynamicCategories(categoryFolders);
  
  // Cache the result
  CacheManager.set('categories', projectFolderId, categories);
  
  return categories;
}

// Get subfolders for a category (for populating items)
async function getSubfoldersForCategory(categoryFolderId) {
  const subfolders = await listChildFolders(categoryFolderId);
  return subfolders.map(sf => sf.name);
}

// Discover projects using direct folder access (for external users)
async function discoverProjectsFromDirectAccess(userEmail) {
  const userPerms = PROJECT_PERMISSIONS[userEmail];
  if (!userPerms || !userPerms.directAccess) {
    return [];
  }
  
  const result = [];
  
  for (const project of userPerms.allowedProjects) {
    try {
      const metadata = await getFolderMetadata(project.folderId);
      if (!metadata) continue;
      
      // Check cache freshness
      const needsRefresh = CacheManager.needsRefresh('project', project.folderId, metadata.modifiedTime);
      
      // Build dynamic categories
      const categories = await discoverCategoriesFromProject(project.folderId, !needsRefresh);
      
      // Build folders object for backward compatibility
      const folders = {};
      for (const cat of categories) {
        folders[cat.id] = cat._folderId;
      }
      
      result.push({
        id: project.folderId,
        name: project.name,
        modifiedTime: metadata.modifiedTime,
        baseFolderId: project.folderId,
        folders: folders,
        dynamicCategories: categories
      });
    } catch (e) {
      console.error(`Error accessing project ${project.name}:`, e);
    }
  }
  
  return result;
}

// Discover all projects from the root Drive folder (for BC Immo users)
async function discoverProjectsFromDrive() {
  if (typeof PROJECTS_ROOT_FOLDER_ID === 'undefined' || !PROJECTS_ROOT_FOLDER_ID) {
    console.warn('PROJECTS_ROOT_FOLDER_ID not defined');
    return [];
  }
  
  const projects = await listChildFolders(PROJECTS_ROOT_FOLDER_ID);
  const result = [];
  
  for (const proj of projects) {
    console.log(`Discovering categories for project: ${proj.name}`);
    
    // Check cache freshness
    const needsRefresh = CacheManager.needsRefresh('project', proj.id, proj.modifiedTime);
    
    // Build dynamic categories
    const categories = await discoverCategoriesFromProject(proj.id, !needsRefresh);
    
    console.log(`Found ${categories.length} categories for ${proj.name}:`, categories.map(c => c.title));
    
    // Build folders object for backward compatibility
    const folders = {};
    for (const cat of categories) {
      folders[cat.id] = cat._folderId;
    }
    
    result.push({
      id: proj.id,
      name: proj.name,
      modifiedTime: proj.modifiedTime,
      baseFolderId: proj.id,
      folders: folders,
      dynamicCategories: categories
    });
  }
  
  console.log('All discovered projects:', result);
  return result;
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}