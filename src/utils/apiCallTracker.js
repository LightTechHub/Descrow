// File: src/utils/apiCallTracker.js - NEW FILE FOR DEBUGGING

class APICallTracker {
  constructor() {
    this.calls = [];
    this.activeCalls = new Map();
  }

  logCall(endpoint, source) {
    const timestamp = new Date().toISOString();
    const stackTrace = new Error().stack;
    
    const call = {
      endpoint,
      source,
      timestamp,
      stackTrace
    };
    
    this.calls.push(call);
    
    console.group(`🔍 API CALL #${this.calls.length}`);
    console.log('Endpoint:', endpoint);
    console.log('Source:', source);
    console.log('Time:', timestamp);
    console.log('Stack:', stackTrace);
    console.groupEnd();
    
    // Alert if too many calls
    const recentCalls = this.calls.filter(c => 
      c.endpoint === endpoint && 
      Date.now() - new Date(c.timestamp).getTime() < 5000
    );
    
    if (recentCalls.length > 3) {
      console.error(`🚨 TOO MANY CALLS TO ${endpoint}:`, recentCalls.length);
      console.table(recentCalls.map(c => ({
        source: c.source,
        time: c.timestamp
      })));
    }
    
    return call;
  }
  
  blockDuplicate(endpoint, fn) {
    const key = endpoint;
    
    // If call is active, return the existing promise
    if (this.activeCalls.has(key)) {
      console.warn(`⚠️ BLOCKED duplicate call to ${endpoint}`);
      return this.activeCalls.get(key);
    }
    
    // Execute and track
    const promise = fn()
      .finally(() => {
        this.activeCalls.delete(key);
      });
    
    this.activeCalls.set(key, promise);
    return promise;
  }
  
  getReport() {
    const grouped = {};
    this.calls.forEach(call => {
      if (!grouped[call.endpoint]) {
        grouped[call.endpoint] = [];
      }
      grouped[call.endpoint].push(call);
    });
    
    console.table(
      Object.entries(grouped).map(([endpoint, calls]) => ({
        endpoint,
        count: calls.length,
        sources: [...new Set(calls.map(c => c.source))].join(', ')
      }))
    );
  }
}

export const apiTracker = new APICallTracker();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.apiTracker = apiTracker;
}
