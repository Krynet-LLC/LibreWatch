// Player/youtubePlayer.js
// Production-ready, minimal, efficient, async/await

let currentPlayer = null;
let sponsorSegments = [];
let sponsorInterval = null;

async function loadConfig() {
  try {
    const raw = await fetch('./Player/config.js', { cache: 'no-store' }).then(r => r.text());
    const sandbox = {};
    // Evaluate the exported config safely
    new Function('sandbox', `
      ${raw}
      sandbox.config = config.Player.Misc;
    `)(sandbox);
    return Object.freeze(sandbox.config);
  } catch (e) {
    console.error('Failed to load config:', e);
    return null;
  }
}

async function loadCore(CFG) {
  if (!window.LibreUltra) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './Player/playerCore.js';
      script.async = true;
      script.onload = () => {
        if (!window.LibreUltra) reject('LibreUltra failed to initialize');
        else resolve();
      };
      script.onerror = () => reject('Failed to load playerCore.js');
      document.head.appendChild(script);
    });
  }
}

function clearPlayer() {
  if (sponsorInterval) clearInterval(sponsorInterval);
  if (currentPlayer) {
    currentPlayer.remove();
    currentPlayer = null;
  }
  sponsorSegments = [];
}

function startSponsorWatcher(iframe) {
  const ytPlayer = iframe.contentWindow?.YT?.getPlayers?.()?.[0];
  if (!ytPlayer) return;
  sponsorInterval = setInterval(() => {
    const t = ytPlayer.getCurrentTime?.();
    if (!t) return;
    for (const seg of sponsorSegments) {
      const [start, end] = seg.segment;
      if (t >= start && t < end) {
        ytPlayer.seekTo(end, true);
        break;
      }
    }
  }, 300);
}

export async function createYouTubePlayer(containerId, videoId, options = {}) {
  if (!videoId) return console.error('Invalid video ID');
  const container = document.getElementById(containerId);
  if (!container) return console.error('Container not found');

  const CFG = await loadConfig();
  if (!CFG) return;

  await loadCore(CFG);

  clearPlayer();
  const autoplay = options.autoplay ? 1 : 0;
  const iframe = document.createElement('iframe');

  // Play YouTube directly (nocookie)
  const baseURL = CFG.UI.default || 'https://www.youtube-nocookie.com/embed/';
  iframe.src = `${baseURL}${videoId}?autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1`;
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
    sponsorSegments = (await window.LibreUltra.sponsor(videoId)) || [];
    sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
  } catch {
    sponsorSegments = [];
  }

  // Start skipping
  startSponsorWatcher(iframe);

  // Prefetch DeArrow metadata (titles/thumbnails)
  if (CFG.dearrow?.KEY) {
    window.LibreUltra.prefetch(videoId);
  }

  return iframe;
}

export function destroyPlayer() {
  clearPlayer();
}
