/**
 * Jest Configuration for Admin Portal Unit Tests
 * Testing library: React Testing Library
 * Runner: Jest
 */

module.exports = {
  displayName: 'admin-portal-tests',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Module resolution
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/app/**/*.tsx', // Exclude app directory (Next.js pages)
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
