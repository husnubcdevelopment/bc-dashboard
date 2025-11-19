// BC Development Dashboard - Monday.com API Bridge
// This file connects the Monday integration to Claude's monday.com connector tool

/**
 * Execute Monday.com GraphQL query via Claude connector
 * This replaces the placeholder MondayTool.executeQuery function
 */
window.MondayTool = {
  /**
   * Execute a GraphQL query against Monday.com API
   * @param {string} query - GraphQL query string
   * @param {object} variables - Query variables
   * @returns {Promise<object>} Query results
   */
async executeQuery(query, variables = {}) {
  try {
    console.log('🚀 Calling Monday.com API via Cloudflare Worker...');
    
    const response = await fetch('https://lucky-cloud-d9f0.bcdevelopment.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Monday.com API response received');
    console.log('🔍 Full result:', result);
    
    // Check for errors
    if (result.errors) {
      console.error('❌ Monday API errors:', result.errors);
    }
    
    return result.data || result;
    
  } catch (error) {
    console.error('❌ Monday.com API call failed:', error);
    throw error;
  }
},
  
  /**
   * Fetch project tasks for a specific group
   */
  async fetchProjectTasks(boardId, groupId) {
    const query = `
      query {
        boards(ids: [${boardId}]) {
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
    
    return this.executeQuery(query);
  },
  
  /**
   * Fetch all partners from Partners board
   */
  async fetchPartners(boardId) {
    const query = `
      query {
        boards(ids: [${boardId}]) {
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
    
    return this.executeQuery(query);
  }
};

/**
 * Check if Monday.com integration is available
 */
function isMondayIntegrationAvailable() {
  // Check if we have API credentials or backend endpoint configured
  return true; // Set to true when backend is ready
}

/**
 * Show Monday integration status message
 */
function showMondayIntegrationStatus() {
  if (!isMondayIntegrationAvailable()) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ℹ️  MONDAY.COM INTEGRATIE STATUS                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  De Monday.com integratie is voorbereid maar nog niet       ║
║  verbonden met je backend API.                              ║
║                                                              ║
║  Om dit te activeren heb je nodig:                          ║
║  1. Monday.com API token                                    ║
║  2. Backend endpoint om API calls te proxyen                ║
║  3. OAuth flow (optioneel, voor betere UX)                  ║
║                                                              ║
║  Voor nu toont de UI demo data / lege states.               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }
}

// Show status on load
showMondayIntegrationStatus();

// Export for use in other modules
window.isMondayIntegrationAvailable = isMondayIntegrationAvailable;
