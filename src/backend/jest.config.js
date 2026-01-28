// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require('../../tsconfig')

module.exports = {
  displayName: 'Backend',

  moduleDirectories: ['node_modules', '<rootDir>'],
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['./node_modules/'],
  resetMocks: true,

  rootDir: '../..',

  // The root of your source code, typically /src
  // `<rootDir>` is a token Jest substitutes
  roots: ['<rootDir>/src/backend'],

  testMatch: ['**/__tests__/**/*.test.ts'],
  // Jest transformations -- this adds support for TypeScript and JavaScript
  // using ts-jest. Pattern includes [tj]sx? to also transform JS files from
  // node_modules that use ESM syntax (like shlex)
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest'
  },
  // Transform ESM modules in node_modules (they're ignored by default)
  transformIgnorePatterns: ['node_modules/(?!(shlex)/)'],

  modulePaths: [compilerOptions.baseUrl]
}
