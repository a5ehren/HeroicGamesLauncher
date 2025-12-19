/**
 * Test utilities shared across test files
 */

/**
 * Override process.platform for testing
 * @param os - The OS platform to set
 * @returns The original platform value
 */
export function overrideProcessPlatform(os: string): string {
  const original_os = process.platform

  // override process.platform
  Object.defineProperty(process, 'platform', {
    value: os
  })

  return original_os
}
