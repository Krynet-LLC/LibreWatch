// Player/youtubePlayer.js
// Production-ready, lazy-loads config and playerCore, sponsorBlock + deArrow support

let currentPlayer = null;
let currentSegments = [];
let sponsorWatcher = null;

// Load a JS file dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Load config (global var now)
async function loadConfig() {
  if (window.config) return window.config.Player.Misc; // Already loaded
  try {
    await loadScript('/LibreWatch/Player/config.js'); // Absolute path!
    return window.config.Player.Misc;
  } catch (e) {
    console.error('Failed to load config:', e);
    return null;
  }
}

// Create YouTube player
export async function createYouTubePlayer(containerId, videoId, options = {}) {
  if (!videoId) return console.error('Invalid video ID');
  const container = document.getElementById(containerId);
  if (!container) return console.error('Container not found');

  const CFG = await loadConfig();
  if (!CFG) return;

  // Load playerCore.js if not present
  if (!window.LibreUltra) await loadScript('/LibreWatch/Player/playerCore.js');

  // Clear old player
  container.innerHTML = '';
  if (sponsorWatcher) clearInterval(sponsorWatcher);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${CFG.dearrow.API}embed/${videoId}?autoplay=${options.autoplay ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
  iframe.width = options.width || 640;
  iframe.height = options.height || 360;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'no-referrer';
  iframe.title = 'YouTube (Privacy-first) Player';
  iframe.style.cssText = 'border-radius:12px;border:none;overflow:hidden;';

  container.appendChild(iframe);
  currentPlayer = iframe;

  // Fetch SponsorBlock segments
  try {
    currentSegments = (await window.LibreUltra.sponsor(videoId)) || [];
    currentSegments.sort((a, b) => a.segment[0] - b.segment[0]);
  } catch (e) {
    console.warn('SponsorBlock fetch failed:', e);
    currentSegments = [];
  }

  // Automatic skipping
  const win = iframe.contentWindow;
  sponsorWatcher = setInterval(() => {
    if (!win || !win.YT || !win.YT.Player) return;
    const ytPlayer = win.YT.getPlayers && win.YT.getPlayers()[0];
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;
    const t = ytPlayer.getCurrentTime();
    for (const seg of currentSegments) {
      const [start, end] = seg.segment;
      if (t >= start && t < end) { ytPlayer.seekTo(end, true); break; }
    }
  }, 300);

  return iframe;
}

export function destroyPlayer() {
  if (sponsorWatcher) clearInterval(sponsorWatcher);
  if (currentPlayer) { currentPlayer.remove(); currentPlayer = null; }
  currentSegments = [];
}

export function getSponsorSegments() { return currentSegments; }
