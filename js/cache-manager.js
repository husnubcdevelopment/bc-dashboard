// BC Development Dashboard - Cache Manager
// Smart caching with timestamp-based invalidation

const CacheManager = {
  // Cache expiry times (in milliseconds)
  EXPIRY: {
    PROJECTS: 5 * 60 * 1000,      // 5 minutes
    CATEGORIES: 10 * 60 * 1000,   // 10 minutes
    FILES: 2 * 60 * 1000,         // 2 minutes (files change more often)
    USER_INFO: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Generate cache key
  _key(prefix, id) {
    return `bc_dash_${prefix}_${id}`;
  },

  // Set cache with timestamp
  set(prefix, id, data) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this._key(prefix, id), JSON.stringify(cacheEntry));
      console.log(`✓ Cached ${prefix}:${id}`);
    } catch (e) {
      console.warn('Cache write failed:', e);
      // LocalStorage full? Clear old entries
      this.clearOldest();
    }
  },

  // Get cache if not expired
  get(prefix, id, expiryMs = this.EXPIRY.PROJECTS) {
    try {
      const cached = localStorage.getItem(this._key(prefix, id));
      if (!cached) return null;

      const entry = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age > expiryMs) {
        console.log(`⏰ Cache expired for ${prefix}:${id} (age: ${Math.round(age/1000)}s)`);
        this.remove(prefix, id);
        return null;
      }

      console.log(`✓ Cache hit for ${prefix}:${id} (age: ${Math.round(age/1000)}s)`);
      return entry.data;
    } catch (e) {
      console.warn('Cache read failed:', e);
      return null;
    }
  },

  // Remove specific cache
  remove(prefix, id) {
    localStorage.removeItem(this._key(prefix, id));
  },

  // Clear all dashboard cache
  clearAll() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('bc_dash_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('✓ All cache cleared');
  },

  // Clear oldest entries (when storage full)
  clearOldest() {
    const entries = [];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('bc_dash_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          entries.push({ key, timestamp: entry.timestamp });
        } catch (e) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25%
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      localStorage.removeItem(entries[i].key);
    }

    console.log(`✓ Cleared ${removeCount} old cache entries`);
  },

  // Check if data needs refresh based on Drive modifiedTime
  needsRefresh(prefix, id, driveModifiedTime) {
    const cached = this.get(prefix, id, Infinity); // Get even if expired
    if (!cached) return true;

    // If we have Drive's modifiedTime, compare it
    if (driveModifiedTime) {
      const cachedTime = new Date(cached.modifiedTime || 0).getTime();
      const driveTime = new Date(driveModifiedTime).getTime();
      
      if (driveTime > cachedTime) {
        console.log(`🔄 Drive data newer than cache for ${prefix}:${id}`);
        return true;
      }
    }

    return false;
  },

  // Get cache statistics
  getStats() {
    const keys = Object.keys(localStorage);
    const dashKeys = keys.filter(k => k.startsWith('bc_dash_'));
    
    let totalSize = 0;
    dashKeys.forEach(key => {
      totalSize += localStorage.getItem(key).length;
    });

    return {
      entries: dashKeys.length,
      sizeKB: Math.round(totalSize / 1024),
      maxSizeKB: 5120 // Most browsers: 5-10MB
    };
  }
};

// Expose globally
window.CacheManager = CacheManager;