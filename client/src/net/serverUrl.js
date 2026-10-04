// In dev, the server runs on :3001 while Vite serves the client on :5173.
// Override with a .env file (VITE_SERVER_URL=...) when deploying the two
// separately - see README. Shared by the socket connection and the plain
// HTTP auth calls so they always agree on where the server is.
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `http://${location.hostname}:3001`;
