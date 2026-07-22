/// <reference types="svelte" />
/// <reference types="vite/client" />

/**
 * The channel-aware app version string, baked into the client bundle at
 * build time by the `define` in `vite.config.ts` (see infrastructure.md —
 * App Versioning). Always a non-empty `vX.Y.Z…` string.
 */
declare const __APP_VERSION__: string;
