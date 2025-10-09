// BC Development Dashboard - Error Recovery Module
// Automatically fixes common loading and cache issues

const ErrorRecovery = {
  retryCount: 0,
  maxRetries: 3,

  init() {
    this.detectAndFixIssues();
    this.addErrorListeners();
  },

  // Detect common issues on page load
  detectAndFixIssues() {
    // Check if GAPI/GIS failed to load after 10 seconds
    setTimeout(() => {
      if (!window.gapiInited || !window.gisInited) {
        console.warn('⚠️ OAuth scripts failed to load, attempting recovery...');
        this.handleOAuthLoadFailure();
      }
    }, 10000);

    // Check for stuck loading states
    this.detectStuckLoading();
  },

  // Add global error listeners
  addErrorListeners() {
    // Catch OAuth script errors
    window.addEventListener('error', (e) => {
      if (e.filename && (e.filename.includes('gapi') || e.filename.includes('gsi'))) {
        console.error('OAuth script error:', e.message);
        this.handleOAuthLoadFailure();
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.toString().includes('gapi')) {
        console.error('OAuth promise rejection:', e.reason);
        this.handleOAuthLoadFailure();
      }
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.retryCount > 0) {
        console.log('Tab became visible, checking auth state...');
        this.checkAuthState();
      }
    });
  },

  // Fix OAuth loading failures
  handleOAuthLoadFailure() {
    if (this.retryCount >= this.maxRetries) {
      this.showManualRecovery();
      return;
    }

    this.retryCount++;
    console.log(`Retry attempt ${this.retryCount}/${this.maxRetries}...`);

    // Clear problematic cache
    try {
      CacheManager.clearAll();
      console.log('✓ Cache cleared');
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }

    // Wait a bit, then reload
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },

  // Detect if UI is stuck in loading state
  detectStuckLoading() {
    setTimeout(() => {
      const authBanner = document.getElementById('authBanner');
      const projectsOverview = document.getElementById('projectsOverview');
      
      // Check if auth banner is visible but buttons not working
      if (authBanner && !authBanner.classList.contains('hidden')) {
        const loading = projectsOverview?.innerHTML.includes('loading');
        if (loading) {
          console.warn('⚠️ Stuck loading state detected');
          this.fixStuckLoading();
        }
      }
    }, 15000); // Check after 15 seconds
  },

  // Fix stuck loading UI
  fixStuckLoading() {
    const projectsOverview = document.getElementById('projectsOverview');
    if (projectsOverview) {
      projectsOverview.innerHTML = `
        <div class="text-center py-8">
          <div class="text-amber-600 mb-3">⚠️ Er lijkt iets mis te zijn gegaan</div>
          <button onclick="location.reload()" 
                  class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            🔄 Pagina herladen
          </button>
        </div>
      `;
    }
  },

  // Check current auth state
  checkAuthState() {
    if (gapi.client.getToken() !== null) {
      console.log('✓ Auth token still valid');
      return true;
    }
    console.warn('✗ Auth token expired or missing');
    return false;
  },

  // Show manual recovery instructions
  showManualRecovery() {
    const authBanner = document.getElementById('authBanner');
    if (authBanner) {
      authBanner.classList.remove('hidden');
      authBanner.className = 'bg-amber-50 border-b border-amber-300 p-4 text-center';
      authBanner.innerHTML = `
        <div class="max-w-2xl mx-auto">
          <h3 class="font-bold text-amber-800 mb-2">⚠️ Laadprobleem gedetecteerd</h3>
          <p class="text-sm text-amber-700 mb-3">
            De authenticatie kon niet worden geladen. Probeer het volgende:
          </p>
          <div class="space-y-2 text-sm text-left bg-white p-3 rounded">
            <div>1. <strong>Hard refresh</strong>: Druk Ctrl+Shift+R (Windows) of Cmd+Shift+R (Mac)</div>
            <div>2. <strong>Clear cache</strong>: Browser instellingen → Cache wissen</div>
            <div>3. <strong>Incognito</strong>: Open in privé venster</div>
          </div>
          <button onclick="location.reload()" 
                  class="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            🔄 Probeer opnieuw
          </button>
        </div>
      `;
    }
  },

  // Test function for debugging
  test() {
    console.log('=== Error Recovery Test ===');
    console.log('Retry count:', this.retryCount);
    console.log('GAPI initialized:', window.gapiInited);
    console.log('GIS initialized:', window.gisInited);
    console.log('Auth state:', this.checkAuthState());
    console.log('Cache stats:', CacheManager.getStats());
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ErrorRecovery.init());
} else {
  ErrorRecovery.init();
}

// Expose for debugging
window.ErrorRecovery = ErrorRecovery;