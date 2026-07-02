export interface ServerConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  user: string;
  password: string;
  /** FTPサーバー上の検索を許可するルートディレクトリ（この外へは出られない） */
  baseDir: string;
  /** FTPS (明示的TLS) を使うかどうか */
  secure: boolean;
}

export interface PublicServerInfo {
  id: string;
  label: string;
}

const MAX_SERVERS = 10;

function readServerConfig(index: number): ServerConfig | null {
  const prefix = `SAKURA_SERVER_${index}_`;
  const host = process.env[`${prefix}HOST`];
  if (!host) return null;

  const user = process.env[`${prefix}USER`] ?? "";
  const password = process.env[`${prefix}PASSWORD`] ?? "";
  const baseDirRaw = process.env[`${prefix}BASE_DIR`] ?? "/";
  const label = process.env[`${prefix}LABEL`] ?? `サーバー${index}`;
  const portRaw = process.env[`${prefix}PORT`];
  const port = portRaw ? Number(portRaw) : 21;
  const secure = (process.env[`${prefix}SECURE`] ?? "true").toLowerCase() !== "false";

  return {
    id: String(index),
    label,
    host,
    port: Number.isFinite(port) ? port : 21,
    user,
    password,
    baseDir: baseDirRaw.replace(/\/+$/, "") || "/",
    secure,
  };
}

let cachedServers: ServerConfig[] | null = null;

export function getServers(): ServerConfig[] {
  if (cachedServers) return cachedServers;
  const servers: ServerConfig[] = [];
  for (let i = 1; i <= MAX_SERVERS; i++) {
    const cfg = readServerConfig(i);
    if (cfg) servers.push(cfg);
  }
  cachedServers = servers;
  return servers;
}

export function getServerById(id: string): ServerConfig | null {
  return getServers().find((s) => s.id === id) ?? null;
}

export function getPublicServers(): PublicServerInfo[] {
  return getServers().map(({ id, label }) => ({ id, label }));
}
