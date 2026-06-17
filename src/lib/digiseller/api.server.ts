import { createHash } from "crypto";

const BASE = "https://api.digiseller.ru";
const DEFAULT_SELLER_ID = "1022102";

type TokenCache = { token: string; valid_thru: number };
let cached: TokenCache | null = null;

export function getSellerId(): string {
  const id = process.env.DIGISELLER_SELLER_ID;
  if (id && /^\d+$/.test(id.trim())) return id.trim();
  return DEFAULT_SELLER_ID;
}

export async function getDigisellerToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.valid_thru - 60 > now) return cached.token;
  const seller_id = getSellerId();
  const apiKey = process.env.DIGISELLER_API_KEY;
  if (!apiKey) throw new Error("DIGISELLER_API_KEY is not configured");
  const timestamp = now;
  const sign = createHash("sha256").update(apiKey + timestamp).digest("hex");
  const res = await fetch(`${BASE}/api/apilogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seller_id: Number(seller_id), timestamp, sign }),
  });
  if (!res.ok) throw new Error(`apilogin ${res.status}`);
  const json = (await res.json()) as { retval: number; token?: string; valid_thru?: string; desc?: string };
  if (json.retval !== 0 || !json.token) throw new Error(`apilogin retval=${json.retval} ${json.desc ?? ""}`);
  const validThru = json.valid_thru ? Math.floor(new Date(json.valid_thru).getTime() / 1000) : now + 60 * 110;
  cached = { token: json.token, valid_thru: validThru };
  return json.token;
}

function withTokenQuery(path: string, token: string) {
  return path + (path.includes("?") ? "&" : "?") + `token=${token}`;
}

async function doFetch<T>(method: "GET" | "POST", path: string, body: Record<string, unknown> | undefined, withToken: boolean, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  let finalPath = path;
  if (withToken) {
    const token = await getDigisellerToken();
    finalPath = withTokenQuery(path, token);
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${finalPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && withToken && retry) {
      cached = null;
      return doFetch<T>(method, path, body, withToken, false);
    }
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function digisellerPost<T>(path: string, body: Record<string, unknown>, withToken = false): Promise<T> {
  return doFetch<T>("POST", path, body, withToken);
}

export async function digisellerGet<T>(path: string, withToken = false): Promise<T> {
  return doFetch<T>("GET", path, undefined, withToken);
}