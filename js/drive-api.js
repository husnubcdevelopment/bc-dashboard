// BC Development Dashboard - Drive API Module

// List child folders in a parent folder
async function listChildFolders(parentId) {
  try {
    const response = await gapi.client.drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name_natural asc'
    });
    return response.result.files || [];
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

// List files in a folder
async function listFiles(folderId, recursive = true) {
  if (recursive) {
    return await listFilesRecursive(folderId);
  }
  
  try {
    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
      orderBy: 'modifiedTime desc'
    });
    return response.result.files || [];
  } catch (e) {
    console.error('listFiles error:', e);
    return [];
  }
}

// Get detailed folder structure with subfolders
async function getFolderStructure(folderId) {
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
    
    const subfolders = await listChildFolders(folderId);
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

// NEW: Discover categories dynamically from a project folder
async function discoverCategoriesFromProject(projectFolderId) {
  const folders = await listChildFolders(projectFolderId);
  
  // Filter: only folders that start with a number (1_, 2_, etc.)
  const categoryFolders = folders.filter(f => {
    return /^\d{1,2}[\s._-]/.test(f.name);
  });
  
  return buildDynamicCategories(categoryFolders);
}

// NEW: Get subfolders for a category (for populating items)
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
      
      // Get all child folders (categories)
      const childFolders = await listChildFolders(project.folderId);
      
      // Build dynamic categories
      const categories = await discoverCategoriesFromProject(project.folderId);
      
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
        dynamicCategories: categories // Store dynamic categories
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
    // Build dynamic categories
    const categories = await discoverCategoriesFromProject(proj.id);
    
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
      dynamicCategories: categories // Store dynamic categories
    });
  }
  
  return result;
}

// Helper: Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}