// youtubePlayer.js
// Full JS-driven, privacy-first YouTube player with SponsorBlock + DeArrow

let currentPlayer = null;
let currentSegments = [];
let sponsorWatcherInterval = null;

// --- Load Player Config ---
async function loadConfig() {
  const raw = await fetch('./Player/config.js', { cache: 'no-store' }).then(r => r.text());
  const sandbox = {};
  new Function('sandbox', `
    let config;
    ${raw}
    if(typeof config !== "undefined") sandbox.config = config;
  `)(sandbox);
  return Object.freeze(sandbox.config.Player.Misc);
}

// --- DOM Setup ---
function setupDOM() {
  const body = document.body;
  body.style.cssText = `
    font-family:sans-serif;
    background:#111;
    color:#eee;
    display:flex;
    flex-direction:column;
    align-items:center;
    padding:2rem;
  `;

  // Title
  const h1 = document.createElement('h1');
  h1.textContent = 'LibreWatch';
  body.appendChild(h1);

  // Input + Button
  const inputDiv = document.createElement('div');
  body.appendChild(inputDiv);

  const inputEl = document.createElement('input');
  inputEl.id = 'videoInput';
  inputEl.value = 'dQw4w9WgXcQ';
  inputDiv.appendChild(inputEl);

  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Load';
  inputDiv.appendChild(loadBtn);

  // Player container
  const playerDiv = document.createElement('div');
  playerDiv.id = 'player';
  playerDiv.style.cssText = 'width:640px;max-width:95vw;height:360px;margin-top:1rem;';
  body.appendChild(playerDiv);

  return { inputEl, loadBtn, playerDiv };
}

// --- Extract YouTube ID ---
function extractVideoID(input) {
  try {
    if(input.includes("youtube.com") || input.includes("youtu.be")){
      const url = new URL(input);
      return url.searchParams.get("v") || url.pathname.split("/").pop();
    }
    return input.trim();
  } catch {
    return input.trim();
  }
}

// --- Create Player ---
export async function createYouTubePlayer(containerId, videoId, options = {}) {
  if (!videoId) return console.error('Invalid video ID');
  const container = document.getElementById(containerId);
  if (!container) return console.error('Container not found');

  // Load config
  const CFG = await loadConfig();

  // Ensure LibreUltra is initialized
  if (!window.LibreUltra) {
    const script = document.createElement('script');
    script.src = './Player/playerCore.js';
    script.async = true;
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  // Clear old player
  container.innerHTML = '';
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);

  // Iframe creation
  const iframe = document.createElement('iframe');
  const autoplay = options.autoplay ? 1 : 0;
  iframe.src = `${CFG.dearrow.API}embed/${videoId}?autoplay=${autoplay}&rel=0&modestbranding=1&enablejsapi=1`;
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
    currentSegments.sort((a,b)=>a.segment[0]-b.segment[0]);
  } catch {
    currentSegments = [];
  }

  // Automatic segment skipping
  const playerWindow = iframe.contentWindow;
  sponsorWatcherInterval = setInterval(() => {
    if (!playerWindow || !playerWindow.YT || !playerWindow.YT.Player) return;
    const ytPlayer = playerWindow.YT && playerWindow.YT.Player && playerWindow.YT.getPlayers && playerWindow.YT.getPlayers()[0];
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;

    const currentTime = ytPlayer.getCurrentTime();
    for (const seg of currentSegments) {
      const [start, end] = seg.segment;
      if (currentTime >= start && currentTime < end) {
        ytPlayer.seekTo(end, true);
        break;
      }
    }
  }, 300);

  // Prefetch DeArrow branding
  window.LibreUltra.prefetch?.(videoId);

  return iframe;
}

// --- Utilities ---
export function getSponsorSegments() { return currentSegments; }
export function destroyPlayer() {
  if (sponsorWatcherInterval) clearInterval(sponsorWatcherInterval);
  if (currentPlayer) currentPlayer.remove();
  currentPlayer = null;
  currentSegments = [];
}

// --- Auto DOM + Event Binding ---
(async function init() {
  const { inputEl, loadBtn } = setupDOM();

  loadBtn.addEventListener('click', async () => {
    const videoId = extractVideoID(inputEl.value);
    if (videoId) await createYouTubePlayer('player', videoId, { autoplay: true });
  });

  inputEl.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      const videoId = extractVideoID(inputEl.value);
      if (videoId) await createYouTubePlayer('player', videoId, { autoplay: true });
    }
  });

  // Auto-load initial video
  await createYouTubePlayer('player', extractVideoID(inputEl.value), { autoplay: true });
})();
