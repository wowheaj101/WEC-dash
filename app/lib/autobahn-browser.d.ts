import type * as ab from 'autobahn'

declare module 'autobahn-browser' {
  export const Connection: typeof ab.Connection
  export const Session:    typeof ab.Session
  export default ab
}
