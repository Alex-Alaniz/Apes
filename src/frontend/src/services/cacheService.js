class CacheService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds default
  }

  // Set item in cache with expiration
  set(key, value, timeout = this.cacheTimeout) {
    const expiresAt = Date.now() + timeout;
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  // Get item from cache if not expired
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Check if cache has valid item
  has(key) {
    return this.get(key) !== null;
  }

  // Clear specific key
  clear(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
  }

  // Get or fetch pattern - useful for async operations
  async getOrFetch(key, fetchFn, timeout = this.cacheTimeout) {
    const cached = this.get(key);
    if (cached !== null) {
      console.log(`Cache hit for: ${key}`);
      return cached;
    }
    
    console.log(`Cache miss for: ${key}, fetching...`);
    const value = await fetchFn();
    this.set(key, value, timeout);
    return value;
  }
}

// Export singleton instance
export default new CacheService(); 