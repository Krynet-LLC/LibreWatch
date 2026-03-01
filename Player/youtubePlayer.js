// plain JS, GitHub Pages-safe, minimal
window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;

  function clearPlayer() {
    if (sponsorInterval) clearInterval(sponsorInterval);
    if (currentPlayer) { currentPlayer.remove(); currentPlayer = null; }
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
        if (t >= start && t < end) { ytPlayer.seekTo(end, true); break; }
      }
    }, 300);
  }

  async function create(containerId, videoId, options = {}) {
    if (!videoId) return console.error('Invalid video ID');
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container not found');
    const CFG = window.LibreWatchConfig?.Player?.Misc;
    if (!CFG) return console.error('Config missing');

    // Load LibreUltra if not already
    if (!window.LibreUltra) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/LibreWatch/Player/playerCore.js';
        s.onload = () => window.LibreUltra ? resolve() : reject('LibreUltra failed');
        s.onerror = () => reject('Failed to load playerCore.js');
        document.head.appendChild(s);
      }).catch(e => { console.error(e); return; });
    }

    clearPlayer();

    const autoplay = options.autoplay ? 1 : 0;
    const iframe = document.createElement('iframe');
    const baseURL = window.LibreWatchConfig?.Player?.UI?.default || 'https://www.youtube-nocookie.com/embed/';
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

    try {
      sponsorSegments = (await window.LibreUltra.sponsor(videoId)) || [];
      sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
    } catch { sponsorSegments = []; }

    startSponsorWatcher(iframe);

    if (CFG.dearrow?.KEY) window.LibreUltra.prefetch(videoId);

    return iframe;
  }

  function destroy() { clearPlayer(); }

  return { create, destroy };
})();
