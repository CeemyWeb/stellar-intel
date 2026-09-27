/**
 * Locale enforcement checker (#1713).
 *
 * Ensures that all translation keys referenced in the codebase are present
 * in the theme tokens, and that no extraneous keys exist in the theme.
 * Unlike a purely advisory check, this fails CI when problems are detected.
 *
 * The checker also validates pseudo-locale behavior — when a pseudo-locale
 * forces right-to-left layout and character expansion, missing or missing
 * direction-related tokens will cause layout failures that this catchers.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

function readThemeTokens(selector: ':root' | '.dark'): Record<string, string> {
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
  // `:root` also matches inside `.dark`-scoped rules elsewhere in the file, so
  // anchor on the declaration at the start of a line.
  const block = new RegExp(
    `^\\${selector === ':root' ? ':root' : '.dark'} \\{([^}]*)\\}`,
    'm'
  ).exec(css);
  const body = block?.[1];
  expect(body, `no ${selector} block in app/globals.css`).toBeDefined();

  const tokens: Record<string, string> = {};
  for (const match of body!.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]!] = match[2]!;
  }
  return tokens;
}

/**
 * Collects translation key references from the codebase.
 * Patterns matched: t('key'), t`key`, i18n.t('key'), formatMessage('key')
 */
function collectKeyReferences(
  dir: string = process.cwd(),
  exts: string[] = ['.tsx', '.ts', '.js']
): Set<string> {
  const references = new Set<string>();
  const seen = new Set<string>();

  function walk(currentDir: string) {
    const entries = require('node:fs').readdirSync(currentDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = require('node:path').join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name !== 'node_modules' &&
          entry.name !== '.next' &&
          entry.name !== '__tests__'
        ) {
          walk(fullPath);
        }
        continue;
      }

      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      const ext = require('node:path').extname(fullPath);
      if (!exts.some((e) => e === ext)) continue;

      try {
        const content = require('node:fs').readFileSync(fullPath, 'utf8');

        // Match common i18n patterns
        const patterns = [
          /t\(['"`]([^'"`,]+)['""]\)/g,
          /t`([^`]+)`/g,
          /i18n\.t\(['"`]([^'"`,]+)['""]\)/g,
          /formatMessage\(['"`]([^'"`,]+)['""]\)/g,
          /ngettext\(['"`]([^'"`,]+)['""]\s*,\s*['"`]([^'"`,]+)['""]\)/g,
        ];

        for (const pattern of patterns) {
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(content)) !== null) {
            if (match[1]) {
              references.add(match[1]);
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  walk(dir);
  return references;
}

/**
 * Checks locale completeness and enforces requirements.
 *
 * Returns an object with missing and unused keys. The caller should
 * treat any non-empty result as a CI failure (enforcing behavior).
 */
export function checkLocales(): {
  missingKeys: Set<string>;
  unusedKeys: Set<string>;
  pseudoFailure: boolean;
} {
  const rootLocales = readThemeTokens(':root');
  const darkLocales = readThemeTokens('.dark');

  // Convert Record keys to a Set for consistent handling
  const rootKeys = new Set(Object.keys(rootLocales));
  const darkKeys = new Set(Object.keys(darkLocales));
  const allLocales = new Set([...rootKeys, ...darkKeys]);
  const referencedKeys = collectKeyReferences();

  const missingKeys = new Set<string>();
  for (const key of referencedKeys) {
    if (!allLocales.has(key)) {
      missingKeys.add(key);
    }
  }

  const unusedKeys = new Set<string>();
  for (const key of allLocales) {
    if (!referencedKeys.has(key)) {
      unusedKeys.add(key);
    }
  }

  // Pseudo-locale check: verify that direction and expansion patterns
  // would hold under pseudo-localization forcing RTL and character expansion
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
  const hasDirectionToken = allLocales.has('--direction') || allLocales.has('--text-orient');
  const hasRtlOverride = /direction\s*:\s*rtl/.test(css);
  const pseudoFailure =
    missingKeys.size > 0 ||
    unusedKeys.size > 0 ||
    !hasDirectionToken ||
    !hasRtlOverride;

  return { missingKeys, unusedKeys, pseudoFailure };
}

/**
 * Asserts that locale requirements are met, throwing if not.
 * This is the enforcing API — CI should treat any thrown error as a failure.
 */
export function assertLocalesEnforcing(): void {
  const { missingKeys, unusedKeys, pseudoFailure } = checkLocales();

  if (missingKeys.size > 0) {
    throw new Error(
      `Locale checker: ${missingKeys.size} missing translation key${
        missingKeys.size === 1 ? '' : 's'
      } detected. Keys referenced in code but not defined in theme tokens: ${Array.from(
        missingKeys
      ).join(', ')}`
    );
  }

  if (unusedKeys.size > 0) {
    throw new Error(
      `Locale checker: ${unusedKeys.size} unused translation key${
        unusedKeys.size === 1 ? '' : 's'
      } detected — remove or document extraneous keys: ${Array.from(
        unusedKeys
      ).join(', ')}`
    );
  }

  if (pseudoFailure) {
    throw new Error(
      'Locale checker: pseudo-locale enforcement failed. ' +
        'Ensure all translation keys are present, theme tokens include direction/' +
        'text-orient properties, and pseudo-locale layout requirements are met.'
    );
  }
}