import { test, expect } from '@playwright/test';

/**
 * T012 — commit-pinning cross-check. The live beta bundle bakes in its
 * channel-aware version string `vX.Y.Z-beta+<short-sha>` (infrastructure.md
 * — App Versioning). When the CI job knows which sha it deployed and is
 * testing (passed as `E2E_EXPECTED_SHA`), this asserts the version the
 * running bundle REPORTS contains that sha — failing the job on a mismatch,
 * so a stale-artifact race (testing a different build than the one just
 * deployed) can never masquerade as a green run.
 *
 * Skipped when `E2E_EXPECTED_SHA` is unset (local runs against a dev build,
 * which reports `-dev` and has no sha to match).
 */
const expectedSha = process.env.E2E_EXPECTED_SHA;

test.skip(!expectedSha, 'no E2E_EXPECTED_SHA to cross-check (local/dev run)');

test('the live beta bundle reports the sha under test', async ({ page }) => {
  await page.goto('/');
  const version = page.getByTestId('app-version');
  await expect(version).toBeVisible();
  const text = (await version.innerText()).trim();
  // e.g. v0.2.2-beta+1a2b3c4 — must carry the sha the job deployed.
  expect(text).toContain(`+${expectedSha}`);
});
