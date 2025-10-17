export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: {
    "^.+\\.vue$": "@vue/vue3-jest",
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        module: "esnext",
        moduleResolution: "node",
        verbatimModuleSyntax: false
      }
    }],
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testMatch: [
    "<rootDir>/src/tests/**/*.(test|spec).(ts|js)",
    "<rootDir>/src/**/__tests__/**/*.(ts|js)"
  ],
  moduleFileExtensions: ["vue", "js", "ts", "jsx", "tsx", "json"],
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  collectCoverageFrom: ["src/**/*.{ts,vue}", "!src/**/*.d.ts", "!src/**/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
}
