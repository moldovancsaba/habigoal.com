import { env, requireServerEnv } from "@/config/env";

export type SSOUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

export function resolveAppBaseUrl(request?: Request) {
  if (env.appBaseUrl) {
    return env.appBaseUrl.replace(/\/$/, "");
  }

  if (request) {
    return new URL(request.url).origin;
  }

  throw new Error("APP_URL is not configured");
}

export function resolveRedirectUri(request?: Request) {
  return env.ssoRedirectUri || `${resolveAppBaseUrl(request)}/api/oauth/callback`;
}

export function getAuthorizationUrl(state: string, request?: Request) {
  const baseUrl = env.ssoBaseUrl;
  const clientId = requireServerEnv("ssoClientId");
  const redirectUri = resolveRedirectUri(request);

  const url = new URL(`${baseUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);

  return url.toString();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function exchangeCodeForToken(code: string, request?: Request) {
  const baseUrl = env.ssoBaseUrl;
  const clientId = requireServerEnv("ssoClientId");
  const clientSecret = requireServerEnv("ssoClientSecret");
  const redirectUri = resolveRedirectUri(request);

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error_description || errorData.error || await response.text();
      throw new Error(`SSO Token Exchange Error: ${errorMsg}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("SSO Token Exchange timed out");
    }
    throw error;
  }
}

export async function getUserInfo(accessToken: string): Promise<SSOUser> {
  const baseUrl = env.ssoBaseUrl;

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SSO UserInfo Error: ${errorData.error || "Unknown error"}`);
    }

    const data = await response.json();
    
    if (!data.sub && !data.id) {
      throw new Error("Invalid SSO UserInfo response: Missing user ID");
    }

    return {
      id: data.sub || data.id,
      email: data.email || "",
      name: data.name || data.preferred_username || data.email || "Unknown User",
      role: data.role
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("SSO UserInfo request timed out");
    }
    throw error;
  }
}
