import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';
import { withSentryConfig } from '@sentry/nextjs';

async function getUserConfig() {
  try {
    return await import('./v0-user-next.config');
  } catch (e) {
    return undefined; // Ignore error
  }
}

const userConfig = await getUserConfig();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {},
  productionBrowserSourceMaps: true,
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

if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => [
    { source: '/api/quiz-gen/:path*', destination: 'http://localhost:8004/api/quiz-gen/:path*' },
    { source: '/api/agent/:path*', destination: 'http://localhost:8002/api/agent/:path*' },
    { source: '/api/vocab-importer/:path*', destination: 'http://localhost:8000/api/vocab-importer/:path*' },
    { source: '/api/writing/:path*', destination: 'http://localhost:8001/api/writing/:path*' },
  ];
}

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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  
  // Upload source maps during build step
  silent: true,
  org: 'sorami',
  project: 'lang-portal-frontend',
  
  // Only upload source maps in production
  dryRun: process.env.NODE_ENV !== 'production',
  
  // Automatically inject release information
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Suppress source map upload errors to prevent build failures
  errorHandler: (err, invokeErr, compilation) => {
    console.warn('Sentry source map upload warning:', err.message);
  },
  
  // Wipe source maps from public directory after upload
  widenClientFileUpload: true,
  
  // Disable source map deletion for debugging if needed
  hideSourceMaps: true,
};

// Skip Sentry wrapper in development to avoid webpack configuration conflicts with Turbopack
// Sentry will still work via its SDK, just without the webpack plugin for source maps
export default process.env.NODE_ENV === 'development' 
  ? finalConfig 
  : withSentryConfig(finalConfig, sentryWebpackPluginOptions);
