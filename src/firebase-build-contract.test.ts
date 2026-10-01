import { describe, expect, it } from 'vitest';
import { assertFirebaseBuildConfig, FIREBASE_BUILD_ENV_KEYS } from './firebase-build-contract';

const complete = Object.fromEntries(FIREBASE_BUILD_ENV_KEYS.map((key) => [key, 'value']));

describe('Firebase build contract', () => {
  it('accepts all six public web variables', () => expect(assertFirebaseBuildConfig(complete)).toBe('configured'));
  it('requires explicit local-only mode for absent config', () => {
    expect(() => assertFirebaseBuildConfig({})).toThrow(/Cars build stopped/);
    expect(assertFirebaseBuildConfig({}, true)).toBe('local-only');
  });
  it('rejects partial config even with local-only mode', () => {
    expect(() => assertFirebaseBuildConfig({ VITE_FIREBASE_API_KEY: 'key' }, true)).toThrow(/VITE_FIREBASE_AUTH_DOMAIN/);
  });
});
