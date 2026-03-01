// Player/playerCore.js
// Minimal, plain JS, JSON-config-friendly, window-based

window.LibreUltra = (() => {
  let CFG = null;
  const memory = new Map();
  const inflight = new Map();
  const lastHit = new Map();
  const RATE_LIMIT = 25;
  const INTERVAL = 60000;
  const TTL = 5 * 60 * 1000; // 5 min cache
  const MAX_CACHE = 80;
  const PER_VIDEO_COOLDOWN = 4000;

  let tokens = RATE_LIMIT;
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("libre_ultra") : null;
  if (bc) bc.onmessage = e => { if (e.data === "t" && tokens > 0) tokens--; };
  setInterval(() => tokens = RATE_LIMIT, INTERVAL);

  function allow() { if (tokens <= 0) return false; tokens--; bc?.postMessage("t"); return true; }
  function now() { return performance.now(); }
  function trim() { while (memory.size > MAX_CACHE) memory.delete(memory.keys().next().value); }

  setInterval(() => {
    const t = now();
    for (const [k,v] of memory) if (t - v.t > TTL) memory.delete(k);
  }, 60000);

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      CFG = json.Player.Misc;
      CFG.UI = json.Player.UI; // include UI for completeness
      return CFG;
    } catch(e) { console.error('Failed to load config:', e); return null; }
  }

  async function core(key, url) {
    const cached = memory.get(key);
    if (cached && now() - cached.t < TTL) return cached.v;
    if (lastHit.has(key) && now() - lastHit.get(key) < PER_VIDEO_COOLDOWN) return null;
    if (!allow()) return null;
    if (inflight.has(key)) return inflight.get(key);

    lastHit.set(key, now());
    const req = fetch(url, { referrerPolicy: "no-referrer", keepalive: true })
      .then(r => r.ok ? r.json() : null)
      .then(v => { inflight.delete(key); if (v) { memory.set(key, { v, t: now() }); trim(); } return v; })
      .catch(() => { inflight.delete(key); return null; });
    inflight.set(key, req);
    return req;
  }

  async function sponsor(videoID) {
    const config = await loadConfig();
    if (!config || !config.sponsorBlock?.API) return [];
    const base = config.sponsorBlock.API.replace(/\/+$/,''); // remove trailing slash
    const url = `${base}/api/skipSegments?videoID=${videoID}`;
    return core(`sb_${videoID}`, url) || [];
  }

  async function dearrow(videoID) {
    const config = await loadConfig();
    if (!config || !config.dearrow?.API || !config.dearrow?.KEY) return null;
    const base = config.dearrow.API.replace(/\/+$/,'');
    const url = `${base}/api/branding?videoID=${videoID}&license=${config.dearrow.KEY}`;
    return core(`da_${videoID}`, url);
  }

  function prefetch(videoID) {
    requestIdleCallback?.(() => dearrow(videoID));
  }

  return { sponsor, dearrow, prefetch };
})();
