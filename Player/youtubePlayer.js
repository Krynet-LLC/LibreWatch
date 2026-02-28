// youtubePlayer.js
import { config } from './config.js';

let currentPlayer = null;
let currentSegments = [];
let segmentCheckInterval = null;

export async function createYouTubePlayer(containerId, videoId, options = {}) {
  if (!videoId) return console.error('Invalid video ID');
  const container = document.getElementById(containerId);
  if (!container) return console.error('Container not found');

  container.innerHTML = ''; // clear old player

  // Create iframe using Piped (privacy-first)
  const iframe = document.createElement('iframe');
  iframe.src = `${config.UI}watch?v=${videoId}${options.autoplay ? '&autoplay=1' : ''}`;
  iframe.width = options.width || '560';
  iframe.height = options.height || '315';
  iframe.frameBorder = '0';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.sandbox = 'allow-scripts allow-same-origin allow-presentation';
  iframe.referrerPolicy = 'no-referrer';
  iframe.loading = 'lazy';
  iframe.style.borderRadius = '12px';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.title = 'Privacy-first YouTube Player';

  container.appendChild(iframe);
  currentPlayer = iframe;

  // Fetch SponsorBlock segments for auto-skip
  try {
    const res = await fetch(`${config.sponsorBlock}api/skipSegments?videoID=${videoId}`);
    currentSegments = res.ok ? (await res.json()).sort((a,b)=>a.segment[0]-b.segment[0]) : [];
  } catch (e) {
    console.warn('SponsorBlock fetch failed:', e);
    currentSegments = [];
  }

  // Segment check loop placeholder
  if (segmentCheckInterval) clearInterval(segmentCheckInterval);
  segmentCheckInterval = setInterval(() => {
    // For iframe embeds like Piped, skipping requires extra APIs or HTML5 player
  }, 500);

  return iframe;
}

export function getSponsorSegments() {
  return currentSegments;
}
