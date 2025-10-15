export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.(ts|js)', '<rootDir>/src/**/*.(test|spec).(ts|js)'],
  moduleFileExtensions: ['vue', 'js', 'ts', 'jsx', 'tsx', 'json'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  collectCoverageFrom: ['src/**/*.{ts,vue}', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}
