'use strict';

const https = require('https');

const LATEST_RELEASE_URL = 'https://api.github.com/repos/FunplayAI/funplay-cocos-mcp/releases/latest';

function normalizeVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[+-]/)[0];
}

function parseVersion(value) {
  return normalizeVersion(value)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}

function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'funplay-cocos-mcp-update-checker',
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GitHub returned HTTP ${response.statusCode}: ${body.slice(0, 160)}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Failed to parse GitHub response: ${error.message}`));
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Update check timed out after ${timeoutMs}ms.`));
    });
    request.on('error', reject);
  });
}

async function checkForUpdate(options = {}) {
  const currentVersion = normalizeVersion(options.currentVersion || '0.0.0');
  const checkedAt = new Date().toISOString();

  try {
    const release = await fetchJson(options.url || LATEST_RELEASE_URL, options.timeoutMs || 5000);
    const latestVersion = normalizeVersion(release.tag_name || release.name || '');
    const comparison = latestVersion ? compareVersions(latestVersion, currentVersion) : 0;
    return {
      ok: true,
      checkedAt,
      currentVersion,
      latestVersion,
      updateAvailable: comparison > 0,
      releaseUrl: release.html_url || '',
      publishedAt: release.published_at || '',
      source: options.url || LATEST_RELEASE_URL,
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      currentVersion,
      latestVersion: '',
      updateAvailable: false,
      releaseUrl: '',
      publishedAt: '',
      source: options.url || LATEST_RELEASE_URL,
      error: error.message,
    };
  }
}

module.exports = {
  LATEST_RELEASE_URL,
  checkForUpdate,
  compareVersions,
  normalizeVersion,
};
