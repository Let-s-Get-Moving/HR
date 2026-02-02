/**
 * i18n Smoke Test
 * 
 * Detects leaked translation keys in rendered DOM content.
 * Leaked keys look like "namespace.keyName" (e.g., "settings.save").
 * 
 * This test helps catch cases where:
 * - A translation key is missing from locale files
 * - The t() function returns the key instead of the translation
 * - A developer accidentally hardcoded a key-like string
 */

import { describe, it, expect } from 'vitest';

// Pattern to detect leaked i18n keys in rendered text
// Matches patterns like: nav.dashboard, settings.mfaSetup.title, common.save
const LEAKED_KEY_PATTERN = /\b(nav|app|dashboard|employees|timeTracking|leave|payroll|settings|common|benefits|bonuses|compliance|login|employeeProfile|employeeOnboarding|employeeOffboarding|testing)\.[a-z][a-zA-Z0-9_]*(\.[a-z][a-zA-Z0-9_]*)*/g;

/**
 * Check if a string contains what looks like a leaked translation key.
 * Returns an array of matched key-like strings.
 */
export function detectLeakedKeys(text: string): string[] {
  const matches = text.match(LEAKED_KEY_PATTERN);
  if (!matches) return [];
  
  // Filter out common false positives
  const falsePositives = [
    // API endpoints or URLs
    'api.example',
    // CSS classes that might look like keys
    'nav.active',
    // Environment variables or config
    'import.meta',
  ];
  
  return matches.filter(match => {
    // Skip if it's a known false positive
    if (falsePositives.some(fp => match.includes(fp))) {
      return false;
    }
    // Skip if it looks like a CSS class (has hyphen)
    if (match.includes('-')) {
      return false;
    }
    // Skip if it looks like a file path
    if (match.includes('/') || match.includes('\\')) {
      return false;
    }
    return true;
  });
}

describe('i18n Key Leak Detection', () => {
  it('should detect leaked translation keys', () => {
    const testCases = [
      { text: 'settings.save', expected: ['settings.save'] },
      { text: 'nav.dashboard is missing', expected: ['nav.dashboard'] },
      { text: 'Error: common.unknownError', expected: ['common.unknownError'] },
      { text: 'Multiple: nav.home and settings.title', expected: ['nav.home', 'settings.title'] },
      { text: 'settings.mfaSetup.title nested key', expected: ['settings.mfaSetup.title'] },
    ];
    
    for (const { text, expected } of testCases) {
      const detected = detectLeakedKeys(text);
      expect(detected).toEqual(expected);
    }
  });
  
  it('should not flag normal text', () => {
    const safeTexts = [
      'Save',
      'Dashboard',
      'Hello world',
      'Employee Profile',
      '123.456', // Numbers
      'user@example.com', // Emails
      'https://api.example.com', // URLs
      'import.meta.env', // Known false positive
    ];
    
    for (const text of safeTexts) {
      const detected = detectLeakedKeys(text);
      expect(detected).toEqual([]);
    }
  });
  
  it('should handle edge cases', () => {
    // Empty string
    expect(detectLeakedKeys('')).toEqual([]);
    
    // String with only spaces
    expect(detectLeakedKeys('   ')).toEqual([]);
    
    // String with special characters
    expect(detectLeakedKeys('!@#$%^&*()')).toEqual([]);
  });
});

/**
 * Utility to check DOM element for leaked keys.
 * Use this in component tests to ensure no keys leak.
 * 
 * Example:
 * ```ts
 * const { container } = render(<MyComponent />);
 * assertNoLeakedKeys(container.textContent);
 * ```
 */
export function assertNoLeakedKeys(text: string | null): void {
  if (!text) return;
  
  const leaked = detectLeakedKeys(text);
  if (leaked.length > 0) {
    throw new Error(
      `Leaked translation keys detected in rendered content:\n` +
      leaked.map(key => `  - "${key}"`).join('\n') +
      `\n\nThis usually means a translation key is missing from the locale files.`
    );
  }
}
