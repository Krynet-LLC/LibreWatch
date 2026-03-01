// Player/youtubePlayer.js
// GitHub Pages safe, IFrame API + SponsorBlock + DeArrow
window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;
  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      CFG = json.Player.Misc;
      CFG.UI = json.Player.UI; // include UI for completeness
      return CFG;
    } catch (e) { console.error('Failed to load config:', e); return null; }
  }

  function clearPlayer() {
    if (sponsorInterval) clearInterval(sponsorInterval);
    if (currentPlayer) {
      currentPlayer.destroy?.();
      currentPlayer = null;
    }
    sponsorSegments = [];
  }

  function startSponsorWatcher(player) {
    if (!player || !player.getCurrentTime) return;

    sponsorInterval = setInterval(() => {
      const t = player.getCurrentTime();
      if (t === undefined || t === null) return;

      for (const seg of sponsorSegments) {
        const [start, end] = seg.segment;
        if (t >= start && t < end) {
          player.seekTo(end, true);
          break;
        }
      }
    }, 300);
  }

  async function loadCore() {
    if (window.LibreUltra) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/LibreWatch/Player/playerCore.js';
      s.async = true;
      s.onload = () => window.LibreUltra ? resolve() : reject('LibreUltra failed');
      s.onerror = () => reject('Failed to load playerCore.js');
      document.head.appendChild(s);
    });
  }

  function loadYouTubeAPI() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = CFG?.APIs?.Google?.IFrame_API || 'https://www.youtube.com/iframe_api';
      tag.onload = () => {
        // Wait for YT API ready
        if (window.YT && window.YT.Player) resolve();
        else window.onYouTubeIframeAPIReady = () => resolve();
      };
      document.head.appendChild(tag);
    });
  }

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container not found');

    const config = await loadConfig();
    if (!config) return;

    try { await loadCore(); } catch (e) { console.error(e); return; }
    await loadYouTubeAPI();

    clearPlayer();

    const autoplay = options.autoplay ? 1 : 0;

    currentPlayer = new YT.Player(containerId, {
      height: options.height || '360',
      width: options.width || '640',
      videoId,
      playerVars: {
        autoplay,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
      },
      events: {
        onReady: async (evt) => {
          try {
            sponsorSegments = (await window.LibreUltra.sponsor(videoId)) || [];
            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
          } catch {
            sponsorSegments = [];
          }

          if (config.dearrow?.KEY) window.LibreUltra.prefetch(videoId);

          startSponsorWatcher(evt.target);
        }
      }
    });

    return currentPlayer;
  }

  function destroy() {
    clearPlayer();
  }

  return { create, destroy };
})();
