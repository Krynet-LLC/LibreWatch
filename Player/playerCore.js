export class LibreUltraCore {
  constructor() {
    this.config = null;
    this.tokens = 25;
    this.cooldowns = new Map();
    this.bc = typeof window !== 'undefined' ? new BroadcastChannel('libre_ultra_sync') : null;

    // Reset rate limit token bucket every minute
    setInterval(() => { this.tokens = 25; }, 60000);

    if (this.bc) {
      this.bc.onmessage = (e) => {
        if (e.data === 'DECREMENT' && this.tokens > 0) this.tokens--;
      };
    }
  }

  async getConfig() {
    if (this.config) return this.config;
    try {
      const res = await fetch('../Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      this.config = json.Player;
      return this.config;
    } catch (e) {
      console.error('Failed to load config.json', e);
      return null;
    }
  }

  checkRateLimit(key) {
    const now = performance.now();
    if (this.cooldowns.has(key) && (now - this.cooldowns.get(key)) < 4000) return false;
    if (this.tokens <= 0) return false;

    this.tokens--;
    this.cooldowns.set(key, now);
    this.bc?.postMessage('DECREMENT');
    return true;
  }

  async getSponsorSegments(videoId) {
    if (!this.checkRateLimit(`sb_${videoId}`)) return [];
    
    try {
      const cfg = await this.getConfig();
      const baseApi = cfg.Misc.sponsorBlock.API.replace(/\/+$/, '');
      const url = `${baseApi}/api/skipSegments?videoID=${videoId}`;

      // Use native browser cache API instead of manual memory tracking arrays
      const cacheStore = await window.caches?.open('librewatch-cache-v1');
      let cachedResponse = cacheStore ? await cacheStore.match(url) : null;

      if (!cachedResponse) {
        const freshResponse = await fetch(url, { referrerPolicy: 'no-referrer' });
        if (freshResponse.ok && cacheStore) {
          await cacheStore.put(url, freshResponse.clone());
          cachedResponse = freshResponse;
        }
      }

      return cachedResponse && cachedResponse.ok ? await cachedResponse.json() : [];
    } catch (err) {
      return [];
    }
  }
}
