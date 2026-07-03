import { LibreUltraCore } from './playerCore.js';

// Inject Plyr scripts dynamically if not already loaded globally
if (!window.Plyr) {
  const script = document.createElement('script');
  script.src = "https://cdn.plyr.io/3.7.8/plyr.js";
  document.head.appendChild(script);
}

class PlayerManager {
  constructor() {
    this.player = null;
    this.core = new LibreUltraCore();
    this.segments = [];
    this.isSeeking = false;
  }

  init(selector) {
    // Configure production wrapper interface options 
    this.player = new window.Plyr(selector, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      youtube: { modestbranding: 1, rel: 0, iv_load_policy: 3 }
    });

    // Attach high-efficiency listener running directly inside Plyr animation ticks
    this.player.on('timeupdate', () => this.handleTimelineCheck());
    
    // Auto-fetch segments for initial video payload load
    this.player.on('ready', () => {
      const currentId = this.player.embed.getVideoData().video_id;
      if (currentId) this.loadSegments(currentId);
    });

    return this.player;
  }

  async load(videoId) {
    this.segments = []; // Clear current queue while loading source strings
    this.player.source = {
      type: 'video',
      sources: [{ src: videoId, provider: 'youtube' }]
    };
    await this.loadSegments(videoId);
  }

  async loadSegments(videoId) {
    try {
      const data = await this.core.getSponsorSegments(videoId);
      this.segments = data.sort((a, b) => a.segment[0] - b.segment[0]);
    } catch {
      this.segments = [];
    }
  }

  handleTimelineCheck() {
    if (this.segments.length === 0 || this.isSeeking) return;
    const currentTime = this.player.currentTime;

    for (const seg of this.segments) {
      const [start, end] = seg.segment;
      if (currentTime >= start && currentTime < end) {
        this.isSeeking = true;
        this.player.currentTime = end;
        
        // Brief threshold release to avoid race conditions
        setTimeout(() => { this.isSeeking = false; }, 50);
        break;
      }
    }
  }
}

export const LibreWatchPlayer = new PlayerManager();
