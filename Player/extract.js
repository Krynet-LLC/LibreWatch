/**
 * Sanitizes URLs from corporate telemetry and extracts the 11-char YouTube Video ID
 */
export function extractVideoID(input) {
  let cleanStr = input.trim();

  // If it's already just a raw 11-character video ID, return it
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanStr)) {
    return cleanStr;
  }

  try {
    const url = new URL(cleanStr);
    // Strip common tracking parameters using native web URL APIs
    const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackers.forEach(param => url.searchParams.delete(param));
    cleanStr = url.toString();
  } catch (e) {
    // Not a valid URL, treat as string fallback
  }

  // High-performance extraction array matching shorts, embeds, piping engines, and redirects
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=)|(?:piped|invidious)[^/]*\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/i;
  const match = cleanStr.match(regex);
  
  return match ? match[1] : null;
}
