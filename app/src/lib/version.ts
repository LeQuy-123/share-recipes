// Release shown in the footer: package.json version + the commit it was built from
// (both filled in by vite.config.ts at build time).
export const APP_VERSION = __APP_VERSION__
export const APP_COMMIT = __APP_COMMIT__
export const versionLabel = `v${APP_VERSION}${APP_COMMIT ? ` · ${APP_COMMIT}` : ''}`
