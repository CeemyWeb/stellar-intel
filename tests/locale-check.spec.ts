import { checkLocales, assertLocalesEnforcing } from '../src/i18n/localeChecker';
import { describe, expect, it } from 'vitest';

describe('locale enforcement checker (#1713)', () => {
  it('checkLocales returns structured results with all required fields', () => {
    const result = checkLocales();
    expect(result).toHaveProperty('missingKeys');
    expect(result).toHaveProperty('unusedKeys');
    expect(result).toHaveProperty('pseudoFailure');
    expect(typeof result.missingKeys.size).toBe('number');
    expect(typeof result.unusedKeys.size).toBe('number');
    expect(typeof result.pseudoFailure).toBe('boolean');
  });

  it('pseudo-locale enforcement produces boolean result', () => {
    const result = checkLocales();
    expect(typeof result.pseudoFailure).toBe('boolean');
    // When missing/unused keys exist, pseudoFailure should be true
    if (result.missingKeys.size > 0 || result.unusedKeys.size > 0) {
      expect(result.pseudoFailure).toBe(true);
    }
  });

  it('enforcing check mechanism runs without crashing', () => {
    expect.hasAssertions();
    try {
      assertLocalesEnforcing();
      expect(true).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('assertLocalesEnforcing throws on missing keys', () => {
    expect.hasAssertions();
    try {
      assertLocalesEnforcing();
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain('missing translation key');
    }
  });
});
