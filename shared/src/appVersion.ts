/**
 * The app's channel-aware version string (see infrastructure.md — App
 * Versioning). Pure and dependency-free so it can be imported both by the
 * client build (`client/vite.config.ts`'s `define`) and by tests without a
 * build-order dependency.
 *
 * The single source of truth for `version` is the root `package.json`; the
 * `channel` and `sha` are supplied by the deploying workflow as build args.
 */
export type BuildChannel = 'prod' | 'beta' | 'dev';

export interface VersionInputs {
  /** Semantic version, e.g. `0.1.0` (no leading `v`). */
  version: string;
  /** Build channel. Absent / unrecognized is treated as `dev`. */
  channel?: string;
  /** Short commit sha — only used (and only meaningful) on beta. */
  sha?: string;
}

/**
 * Compose the displayed version string:
 *   - prod → `vX.Y.Z`
 *   - beta → `vX.Y.Z-beta+<sha>` (or `vX.Y.Z-beta` when sha is absent)
 *   - dev / absent / anything else → `vX.Y.Z-dev`
 */
export function composeVersionString(_inputs: VersionInputs): string {
  // Not implemented (T001 red stub — real logic lands in T002).
  return '';
}
