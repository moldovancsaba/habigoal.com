export type EdgeSessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  expires: number;
  accessToken?: string;
  exp?: number;
  iat?: number;
};

function base64UrlToUint8Array(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(input: string): T | null {
  try {
    const bytes = base64UrlToUint8Array(input);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function importSecret(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

export async function decryptEdgeSession(input: string, secret: string): Promise<EdgeSessionPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = input.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    const header = decodeBase64UrlJson<{ alg?: string; typ?: string }>(encodedHeader);
    if (!header || header.alg !== "HS256") {
      return null;
    }

    const key = await importSecret(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToUint8Array(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!valid) {
      return null;
    }

    const payload = decodeBase64UrlJson<EdgeSessionPayload>(encodedPayload);
    if (!payload) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < nowSeconds) {
      return null;
    }

    if (typeof payload.expires === "number" && payload.expires < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
