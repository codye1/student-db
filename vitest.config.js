import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
      include: [
        'helpers/**/*.js',
        'services/**/*.js',
        'src/**/*.js',
        'controllers/**/*.js',
        'router.js',
        'db/**/*.js',
      ],
      exclude: [
        'tests/**',
        '**/*.test.js',
        'data/**',
        'db/migrations/**',
      ],
    },
  },
});
