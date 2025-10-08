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
    // Get files in current folder
    const filesResponse = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 100
    });
    
    let allFiles = filesResponse.result.files || [];
    
    // Get subfolders
    const subfolders = await listChildFolders(folderId);
    
    // Recursively get files from subfolders
    for (const subfolder of subfolders) {
      const subFiles = await listFilesRecursive(subfolder.id, depth + 1, maxDepth);
      // Add folder path to each file for better organization
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

// List files in a folder (with option for recursive)
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
    // Get files
    const filesResponse = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)',
      orderBy: 'modifiedTime desc'
    });
    structure.files = filesResponse.result.files || [];
    
    // Get subfolders with their files
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

// Discover all projects from the root Drive folder
async function discoverProjectsFromDrive() {
  if (typeof PROJECTS_ROOT_FOLDER_ID === 'undefined' || !PROJECTS_ROOT_FOLDER_ID) {
    console.warn('PROJECTS_ROOT_FOLDER_ID not defined');
    return [];
  }
  
  const projects = await listChildFolders(PROJECTS_ROOT_FOLDER_ID);
  const result = [];
  
  for (const proj of projects) {
    const childFolders = await listChildFolders(proj.id);
    const folders = {};
    
    // Match folders to categories based on prefix
    for (const [catId, regex] of Object.entries(CATEGORY_PREFIX)) {
      const match = childFolders.find(f => regex.test(f.name));
      if (match) {
        folders[catId] = match.id;
      }
    }
    
    result.push({
      id: proj.id,
      name: proj.name,
      modifiedTime: proj.modifiedTime,
      baseFolderId: proj.id,
      folders
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