// Player/youtubePlayer.js
let currentPlayer = null;
let currentSegments = [];
let sponsorWatcherInterval = null;

// Dynamically import config.js as ES module
async function loadConfig() {
  const module = await import('../Player/config.js'); // dynamic import
  return Object.freeze(module.config.Player.Misc);
}

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

export async function createYouTubePlayer(containerId, videoInput, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error('Container not found');

  const videoId = extractVideoID(videoInput);
  if (!videoId) throw new Error('Invalid video ID');

  // Load config & initialize LibreUltra
  const CFG = await loadConfig();
  await initLibreUltra(CFG);

  container.innerHTML = '';
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);

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

  try {
    currentSegments = (await window.LibreUltra.sponsor(videoId)) || [];
    currentSegments.sort((a, b) => a.segment[0] - b.segment[0]);
  } catch {
    currentSegments = [];
  }

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

export function getSponsorSegments() {
  return currentSegments;
}

export function destroyPlayer() {
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);
  if (currentPlayer) {
    currentPlayer.remove();
    currentPlayer = null;
  }
  currentSegments = [];
}
