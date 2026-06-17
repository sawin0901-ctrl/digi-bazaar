import { createHash } from "crypto";

const BASE = "https://api.digiseller.com";

type TokenCache = { token: string; valid_thru: number };
let cached: TokenCache | null = null;

export function getSellerId(): string {
  const id = process.env.DIGISELLER_SELLER_ID;
  if (!id) throw new Error("DIGISELLER_SELLER_ID is not configured");
  return id;
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

export async function digisellerPost<T>(path: string, body: Record<string, unknown>, withToken = false): Promise<T> {
  let url = `${BASE}${path}`;
  if (withToken) {
    const token = await getDigisellerToken();
    url += (path.includes("?") ? "&" : "?") + `token=${token}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function digisellerGet<T>(path: string, withToken = false): Promise<T> {
  let url = `${BASE}${path}`;
  if (withToken) {
    const token = await getDigisellerToken();
    url += (path.includes("?") ? "&" : "?") + `token=${token}`;
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return (await res.json()) as T;
}