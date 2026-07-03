"use strict";

const CLEAR_URLS_RULES_API = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";
let compiledRules = [];
let rulesLoaded = false;

/**
 * Dynamically fetches and parses the global ClearURLs ruleset
 */
async function initClearUrls() {
  try {
    const res = await fetch(CLEAR_URLS_RULES_API);
    const data = await res.json();
    
    compiledRules = Object.values(data.providers).map(provider => ({
      urlPattern: provider.urlPattern ? new RegExp(provider.urlPattern, "i") : null,
      queryRules: provider.rules?.map(r => new RegExp(r, "i")).filter(Boolean),
      rawRules: provider.rawRules?.map(r => new RegExp(r, "i")).filter(Boolean),
      exceptions: provider.exceptions?.map(e => new RegExp(e, "i")).filter(Boolean)
    })).filter(p => p.urlPattern);
    
    rulesLoaded = true;
  } catch (err) {
    console.error("Failed to dynamically populate ClearURLs ruleset:", err);
  }
}

// Fire off the rule engine configuration asynchronously on load
initClearUrls();

/**
 * Scrubs trackers using the global ClearURLs structure
 */
function cleanTrackingParams(urlString) {
  let urlObj;
  try {
    urlObj = new URL(urlString);
  } catch {
    return urlString;
  }

  if (!rulesLoaded || !urlObj.searchParams.toString()) return urlString;

  for (const rule of compiledRules) {
    if (!rule.urlPattern.test(urlObj.href)) continue;
    if (rule.exceptions?.some(exc => exc.test(urlObj.href))) continue;

    // Remove query matches
    if (rule.queryRules) {
      [...urlObj.searchParams].forEach(([key]) => {
        if (rule.queryRules.some(rx => rx.test(key))) {
          urlObj.searchParams.delete(key);
        }
      });
    }

    // Process deep regex replacement rules
    if (rule.rawRules) {
      rule.rawRules.forEach(rx => {
        try {
          urlObj = new URL(urlObj.href.replace(rx, ""));
        } catch {}
      });
    }

    // Scrub generic target definitions
    if (urlObj.hash && /utm_|fbclid|gclid/i.test(urlObj.hash)) {
      urlObj.hash = "";
    }
  }

  return urlObj.toString();
}

/**
 * Sanitizes input text using the full ClearURLs algorithm and isolates the 11-char ID
 */
export function extractVideoID(input) {
  if (!input) return null;
  
  // Clean using the restored ruleset engine
  let cleanStr = cleanTrackingParams(input.trim());

  // Direct 11-char checking fallback
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanStr)) {
    return cleanStr;
  }

  // Production-grade regex matching standard IDs, Shorts, embeds, and privacy alternative instances
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=)|(?:piped|invidious)[^/]*\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/i;
  const match = cleanStr.match(regex);
  
  return match ? match[1] : null;
}
