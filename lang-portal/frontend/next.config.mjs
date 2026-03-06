import { withSentryConfig } from '@sentry/nextjs';

async function getUserConfig() {
  try {
    return await import('./v0-user-next.config');
  } catch (e) {
    return undefined; // Ignore error
  }
}

const userConfig = await getUserConfig();
const LOCAL_SERVICE_REWRITES = [
  { source: '/api/quiz-gen/:path*', destination: 'http://localhost:8004/api/quiz-gen/:path*' },
  { source: '/api/agent/:path*', destination: 'http://localhost:8002/api/agent/:path*' },
  { source: '/api/vocab-importer/:path*', destination: 'http://localhost:8000/api/vocab-importer/:path*' },
  { source: '/api/writing/:path*', destination: 'http://localhost:8001/api/writing/:path*' },
];

function normalizePathPrefix(path) {
  if (!path) {
    return '';
  }

  const trimmed = path.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function trimTrailingSlashes(value) {
  return value.replace(/\/+$/, '');
}

function resolvePostHogProxyPath() {
  const explicitProxyPath = process.env.POSTHOG_PROXY_PATH;
  if (explicitProxyPath) {
    return normalizePathPrefix(explicitProxyPath);
  }

  const publicHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (publicHost?.startsWith('/')) {
    return normalizePathPrefix(publicHost);
  }

  return '';
}

function resolvePostHogAssetsHost(proxyTarget) {
  const explicitAssetsHost = process.env.POSTHOG_PROXY_ASSETS_HOST;
  if (explicitAssetsHost) {
    return trimTrailingSlashes(explicitAssetsHost);
  }

  if (proxyTarget === 'https://eu.i.posthog.com') {
    return 'https://eu-assets.i.posthog.com';
  }
  if (proxyTarget === 'https://us.i.posthog.com') {
    return 'https://us-assets.i.posthog.com';
  }

  return proxyTarget;
}

function getPostHogRewrites() {
  const proxyPath = resolvePostHogProxyPath();
  const proxyTarget = trimTrailingSlashes(process.env.POSTHOG_PROXY_TARGET || '');
  if (!proxyPath || !proxyTarget) {
    return [];
  }

  const assetsHost = resolvePostHogAssetsHost(proxyTarget);
  return [
    {
      source: `${proxyPath}/static/:path*`,
      destination: `${assetsHost}/static/:path*`,
    },
    {
      source: `${proxyPath}/:path*`,
      destination: `${proxyTarget}/:path*`,
    },
  ];
}

function normalizeRewrites(rewrites) {
  if (!rewrites) {
    return { beforeFiles: [], afterFiles: [], fallback: [] };
  }

  if (Array.isArray(rewrites)) {
    return { beforeFiles: [], afterFiles: rewrites, fallback: [] };
  }

  return {
    beforeFiles: rewrites.beforeFiles || [],
    afterFiles: rewrites.afterFiles || [],
    fallback: rewrites.fallback || [],
  };
}

function collapseRewrites(rewrites) {
  if (rewrites.beforeFiles.length === 0 && rewrites.fallback.length === 0) {
    return rewrites.afterFiles;
  }

  return rewrites;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {},
  productionBrowserSourceMaps: false,
  skipTrailingSlashRedirect: Boolean(resolvePostHogProxyPath()),
  experimental: {
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    viewTransition: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'require-in-the-middle',
  ],
};

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return nextConfig;
  }

  const mergedConfig = { ...nextConfig };

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      mergedConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      mergedConfig[key] = userConfig[key];
    }
  }

  return mergedConfig;
}

const finalConfig = mergeConfig(nextConfig, userConfig);
const existingRewrites = finalConfig.rewrites;
const postHogRewrites = getPostHogRewrites();

finalConfig.rewrites = async () => {
  const baseRewrites = normalizeRewrites({
    afterFiles: [
      ...postHogRewrites,
      ...(process.env.NODE_ENV === 'development' ? LOCAL_SERVICE_REWRITES : []),
    ],
  });
  const userRewrites = normalizeRewrites(
    await (typeof existingRewrites === 'function' ? existingRewrites() : existingRewrites)
  );

  return collapseRewrites({
    beforeFiles: [...baseRewrites.beforeFiles, ...userRewrites.beforeFiles],
    afterFiles: [...baseRewrites.afterFiles, ...userRewrites.afterFiles],
    fallback: [...baseRewrites.fallback, ...userRewrites.fallback],
  });
};

const isCiBuild = process.env.CI === 'true';
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
const shouldUploadSourcemaps = isCiBuild && hasSentryAuthToken;

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  
  silent: !isCiBuild,
  org: 'sorami',
  project: 'lang-portal-frontend',
  dryRun: !shouldUploadSourcemaps,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  errorHandler(error) {
    throw error;
  },
  ...(process.env.SENTRY_RELEASE
    ? {
        release: {
          name: process.env.SENTRY_RELEASE,
        },
      }
    : {}),
};

// Skip Sentry wrapper in development to avoid webpack configuration conflicts with Turbopack
// Sentry will still work via its SDK, just without the webpack plugin for source maps
export default process.env.NODE_ENV === 'development' 
  ? finalConfig 
  : withSentryConfig(finalConfig, sentryWebpackPluginOptions);
