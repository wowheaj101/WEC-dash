// Type shim for `autobahn-browser` (browser build of AutobahnJS).
// Keep this as a pure .d.ts (no top-level imports) so Next/Vercel typecheck always picks it up.
declare module 'autobahn-browser' {
  const ab: typeof import('autobahn')
  export = ab
}

