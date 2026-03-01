// youtubePlayer.js - fully modular, production-ready
let currentPlayer = null;
let currentSegments = [];
let sponsorWatcher = null;

async function loadConfig() {
  const raw = await fetch('./config.js', { cache: 'no-store' }).then(r => r.text());
  const sandbox = {};
  new Function('sandbox', `
    let config;
    ${raw}
    if(typeof config !== "undefined") sandbox.config = config;
  `)(sandbox);
  return Object.freeze(sandbox.config.Player.Misc);
}

export async function createYouTubePlayer(containerId, videoId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return console.error('Container not found');
  if (!videoId) return console.error('Invalid video ID');

  // Load config
  const CFG = await loadConfig();

  // Load LibreUltra player core if not loaded
  if (!window.LibreUltra) {
    const script = document.createElement('script');
    script.src = './playerCore.js';
    script.async = true;
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  // Clear previous player
  container.innerHTML = '';
  if (sponsorWatcher) clearInterval(sponsorWatcher);

  // Create iframe for privacy-first YouTube
  const iframe = document.createElement('iframe');
  const autoplay = options.autoplay ? 1 : 0;
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1`;
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

  // Fetch SponsorBlock segments
  try {
    currentSegments = (await window.LibreUltra.sponsor(videoId)) || [];
    currentSegments.sort((a,b) => a.segment[0]-b.segment[0]);
  } catch(e) {
    console.warn('SponsorBlock fetch failed', e);
    currentSegments = [];
  }

  // SponsorBlock automatic skip loop
  sponsorWatcher = setInterval(() => {
    if (!iframe.contentWindow || !iframe.contentWindow.YT || !iframe.contentWindow.YT.getPlayers) return;
    const ytPlayers = iframe.contentWindow.YT.getPlayers?.();
    const ytPlayer = ytPlayers?.[0];
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;

    const t = ytPlayer.getCurrentTime();
    for (const seg of currentSegments) {
      const [start, end] = seg.segment;
      if (t >= start && t < end) {
        ytPlayer.seekTo(end, true);
        break;
      }
    }
  }, 300);

  return iframe;
}

export function getSponsorSegments() { return currentSegments; }

export function destroyPlayer() {
  if (sponsorWatcher) clearInterval(sponsorWatcher);
  if (currentPlayer) currentPlayer.remove();
  currentPlayer = null;
  currentSegments = [];
}
