class IPCOptimizer {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.debounceTimers = new Map();
    this.lastRequestTime = new Map();
    
    this.CACHE_TTL = 5000;
    this.DEBOUNCE_DELAY = 100;
    this.MIN_REQUEST_INTERVAL = 500;
  }

  getCacheKey(channel, args) {
    return `${channel}:${JSON.stringify(args)}`;
  }

  isValidCache(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < this.CACHE_TTL;
  }

  async invoke(channel, ...args) {
    const cacheKey = this.getCacheKey(channel, args);
    
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult && this.isValidCache(cachedResult)) {
      return cachedResult.data;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const lastRequestTime = this.lastRequestTime.get(channel) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    const requestPromise = this.executeRequest(channel, args, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      this.lastRequestTime.set(channel, Date.now());
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async executeRequest(channel, args, cacheKey) {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }

    if (channel.includes('.')) {
      const [namespace, method] = channel.split('.');
      if (window.electron[namespace] && typeof window.electron[namespace][method] === 'function') {
        return window.electron[namespace][method](...args);
      }
    }

    if (window.electron.invoke) {
      return window.electron.invoke(channel, ...args);
    }

    throw new Error(`No handler found for channel: ${channel}`);
  }

  debounce(channel, callback, delay = this.DEBOUNCE_DELAY) {
    const existingTimer = this.debounceTimers.get(channel);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(channel);
    }, delay);

    this.debounceTimers.set(channel, timer);
  }

  invalidateCache(pattern) {
    if (typeof pattern === 'string') {
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  clearPendingRequests() {
    this.pendingRequests.clear();
  }

  cleanup() {
    this.cache.clear();
    this.pendingRequests.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

export const ipcOptimizer = new IPCOptimizer();

export const optimizedInvoke = (channel, ...args) => {
  return ipcOptimizer.invoke(channel, ...args);
};

export const debouncedCall = (channel, callback, delay) => {
  return ipcOptimizer.debounce(channel, callback, delay);
};

export const invalidateIPCCache = (pattern) => {
  return ipcOptimizer.invalidateCache(pattern);
};
