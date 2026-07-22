/**
 * The channel-aware app version string, baked into the bundle at build time
 * by the Vite `define` (see infrastructure.md — App Versioning). Re-exported
 * from one module so components import a plain value rather than referencing
 * the `__APP_VERSION__` global directly.
 */
export const APP_VERSION: string = __APP_VERSION__;
