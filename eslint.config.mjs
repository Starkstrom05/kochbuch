import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "prisma/migrations/**",
      "public/sw.js",
    ],
  },
  ...nextCoreWebVitals,
];

export default config;
