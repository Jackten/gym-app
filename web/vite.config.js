import { defineConfig } from 'vite';

function normalizeBasePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '/') return '/';

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function detectBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return normalizeBasePath(process.env.VITE_BASE_PATH);
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
    if (repoName) return normalizeBasePath(repoName);
  }

  return '/';
}

export default defineConfig({
  base: detectBasePath(),
});
