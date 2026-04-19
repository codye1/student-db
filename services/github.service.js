const GITHUB_API_BASE = 'https://api.github.com';
const REPO_PATH_PATTERN = /^[^/\s]+\/[^/\s]+$/;

const normalizeRepoPath = (repoPath) => {
  const value = String(repoPath || '').trim();

  if (!REPO_PATH_PATTERN.test(value)) {
    const error = new Error('Invalid repo format. Use owner/repository');
    error.statusCode = 400;
    throw error;
  }

  return value;
};

const githubFetch = async (
  url,
  { token, method = 'GET', body, extraHeaders = {} } = {}
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'student-db-lab',
    ...extraHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      let githubMessage = '';
      try {
        const payload = await response.json();
        githubMessage = payload?.message || '';
      } catch {
        githubMessage = '';
      }

      const remaining = response.headers.get('x-ratelimit-remaining');
      const isRateLimit =
        response.status === 403 &&
        (remaining === '0' || /rate limit/i.test(githubMessage));

      const error = new Error(
        githubMessage || `GitHub API error: HTTP ${response.status}`
      );
      error.statusCode = response.status;
      error.isRateLimit = isRateLimit;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const getContributors = async (repo, token) => {
  const logins = [];

  for (let page = 1; page <= 10; page++) {
    const contributors = await githubFetch(
      `${GITHUB_API_BASE}/repos/${repo}/contributors?per_page=100&page=${page}`,
      { token }
    );

    if (!Array.isArray(contributors) || contributors.length === 0) {
      break;
    }

    for (const contributor of contributors) {
      if (contributor?.type === 'User' && contributor.login) {
        logins.push(contributor.login);
      }
    }

    if (contributors.length < 100) {
      break;
    }
  }

  return [...new Set(logins)];
};

const getTopSharedRepos = (repo, counts, links) => {
  const source = repo.toLowerCase();

  return [...counts.entries()]
    .filter(([fullName]) => fullName.toLowerCase() !== source)
    .map(([fullName, sharedContributors]) => ({
      fullName,
      sharedContributors,
      url: links.get(fullName) || null,
    }))
    .sort((a, b) => {
      if (b.sharedContributors !== a.sharedContributors) {
        return b.sharedContributors - a.sharedContributors;
      }
      return a.fullName.localeCompare(b.fullName);
    })
    .slice(0, 5);
};

const aggregateByContributors = async (
  repo,
  token,
  contributors,
  listReposForContributor,
  variant
) => {
  const counts = new Map();
  const links = new Map();
  let analyzedContributors = 0;

  for (const login of contributors) {
    try {
      const repos = await listReposForContributor(login, token);
      const seenInUser = new Set();

      for (const relatedRepo of repos) {
        if (!relatedRepo?.fullName || seenInUser.has(relatedRepo.fullName)) {
          continue;
        }

        seenInUser.add(relatedRepo.fullName);
        counts.set(relatedRepo.fullName, (counts.get(relatedRepo.fullName) || 0) + 1);

        if (relatedRepo.url && !links.get(relatedRepo.fullName)) {
          links.set(relatedRepo.fullName, relatedRepo.url);
        }
      }

      analyzedContributors++;
    } catch {
      // Ignore one contributor failure to keep the endpoint resilient.
    }
  }

  return {
    repo,
    variant,
    totalContributors: contributors.length,
    analyzedContributors,
    relatedRepos: getTopSharedRepos(repo, counts, links),
  };
};

const listContributorReposV1 = async (login, token) => {
  const events = await githubFetch(
    `${GITHUB_API_BASE}/users/${login}/events/public?per_page=100`,
    { token }
  );

  if (!Array.isArray(events)) return [];

  const unique = new Map();
  for (const event of events) {
    const fullName = event?.repo?.name;
    if (!fullName || unique.has(fullName)) continue;

    unique.set(fullName, {
      fullName,
      url: `https://github.com/${fullName}`,
    });
  }

  return [...unique.values()];
};

const listContributorReposV2Rest = async (login, token) => {
  const repos = await githubFetch(
    `${GITHUB_API_BASE}/users/${login}/repos?per_page=100&type=owner&sort=updated`,
    { token }
  );

  if (!Array.isArray(repos)) return [];

  return repos
    .filter((repo) => repo?.full_name)
    .map((repo) => ({
      fullName: repo.full_name,
      url: repo.html_url || null,
    }));
};

export const getSharedReposV1 = async (repoPath, token) => {
  const repo = normalizeRepoPath(repoPath);
  const contributors = await getContributors(repo, token);

  return aggregateByContributors(
    repo,
    token,
    contributors,
    listContributorReposV1,
    'v1-rest'
  );
};

export const getSharedReposV2 = async (repoPath, token) => {
  const repo = normalizeRepoPath(repoPath);
  const contributors = await getContributors(repo, token);

  return aggregateByContributors(
    repo,
    token,
    contributors,
    listContributorReposV2Rest,
    'v2-rest-alt'
  );
};
