// Player/youtubePlayer.js
// Modular YouTube player with SponsorBlock + DeArrow
// Dynamically imports config.js and initializes LibreUltra

let currentPlayer = null;
let currentSegments = [];
let sponsorWatcherInterval = null;

/**
 * Load Player config dynamically
 */
async function loadConfig() {
  const res = await fetch('../Player/config.js', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load config.js');
  const raw = await res.text();

  const sandbox = {};
  new Function('sandbox', `
    let config;
    ${raw}
    if(typeof config !== "undefined") sandbox.config = config;
  `)(sandbox);

  return Object.freeze(sandbox.config.Player.Misc);
}

/**
 * Initialize LibreUltra if not already
 */
async function initLibreUltra(CFG) {
  if (window.LibreUltra) return;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = '../Player/playerCore.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Extract YouTube video ID from URL or raw ID
 */
function extractVideoID(input) {
  try {
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      const url = new URL(input);
      return url.searchParams.get('v') || url.pathname.split('/').pop();
    }
    return input.trim();
  } catch {
    return input.trim();
  }
}

/**
 * Create and embed YouTube iframe player
 * Automatically fetches SponsorBlock + DeArrow
 */
export async function createYouTubePlayer(containerId, videoInput, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error('Container not found');

  const videoId = extractVideoID(videoInput);
  if (!videoId) throw new Error('Invalid video ID');

  // Load config & initialize LibreUltra
  const CFG = await loadConfig();
  await initLibreUltra(CFG);

  // Clear old player & interval
  container.innerHTML = '';
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${CFG.dearrow.API}embed/${videoId}?autoplay=${options.autoplay ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
  iframe.width = options.width || '640';
  iframe.height = options.height || '360';
  iframe.frameBorder = '0';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'no-referrer';
  iframe.title = 'YouTube (Privacy-first) Player';
  iframe.style.cssText = 'border-radius:12px;border:none;overflow:hidden;';

  container.appendChild(iframe);
  currentPlayer = iframe;

  // Fetch SponsorBlock segments via LibreUltra
  try {
    currentSegments = (await window.LibreUltra.sponsor(videoId)) || [];
    currentSegments.sort((a, b) => a.segment[0] - b.segment[0]);
  } catch {
    currentSegments = [];
  }

  // SponsorBlock auto-skip
  sponsorWatcherInterval = setInterval(() => {
    const win = iframe.contentWindow;
    if (!win || !win.YT || !win.YT.Player) return;
    const players = win.YT.getPlayers?.() || [];
    if (!players.length) return;

    const ytPlayer = players[0];
    if (!ytPlayer.getCurrentTime) return;

    const currentTime = ytPlayer.getCurrentTime();
    for (const seg of currentSegments) {
      const [start, end] = seg.segment;
      if (currentTime >= start && currentTime < end) {
        ytPlayer.seekTo(end, true);
        break;
      }
    }
  }, 300);

  return iframe;
}

/**
 * Get currently loaded SponsorBlock segments
 */
export function getSponsorSegments() {
  return currentSegments;
}

/**
 * Destroy player and cleanup
 */
export function destroyPlayer() {
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);
  if (currentPlayer) {
    currentPlayer.remove();
    currentPlayer = null;
  }
  currentSegments = [];
}
