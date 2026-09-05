/**
 * Sparar filändringar till GitHub så GitHub Pages uppdateras.
 * Kräver miljövariabler: GITHUB_TOKEN, valfritt GITHUB_REPO / GITHUB_BRANCH
 */
const GITHUB_API = 'https://api.github.com';

function getRepoConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'nRn-World/ribegatan';
  const branch = process.env.GITHUB_BRANCH || 'main';
  return { token, repo, branch };
}

async function githubRequest(path, options = {}) {
  const { token } = getRepoConfig();
  if (!token) {
    throw new Error('GITHUB_TOKEN saknas på servern');
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `GitHub API ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Uppdatera (eller skapa) en fil i repot.
 * @param {string} filePath - sökväg i repo, t.ex. index.html
 * @param {string} content - filinnehåll (utf8)
 * @param {string} message - commit-meddelande
 */
async function commitFile(filePath, content, message) {
  const { repo, branch, token } = getRepoConfig();
  if (!token) {
    return { skipped: true, reason: 'GITHUB_TOKEN saknas' };
  }

  const encodedPath = filePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  let sha;
  try {
    const existing = await githubRequest(
      `/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
    );
    sha = existing.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const body = {
    message: message || `Update ${filePath} via admin`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;

  const result = await githubRequest(`/repos/${repo}/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

  return {
    skipped: false,
    commit: result.commit && result.commit.sha,
    path: filePath
  };
}

module.exports = {
  getRepoConfig,
  commitFile
};
