import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextCoreWebVitals,
  {
    ignores: ['playwright-report/**', 'test-results/**'],
  },
];

export default config;
