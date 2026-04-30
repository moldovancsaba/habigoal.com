export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "kidex",
  imgbbApiKey: process.env.IMGBB_API_KEY,
  kidexEnforceAuth: process.env.KIDEX_ENFORCE_AUTH === "true",
  ssoClientId: process.env.SSO_Client_ID || process.env.SSO_CLIENT_ID,
  ssoClientSecret: process.env.SSO_Client_Secret || process.env.SSO_CLIENT_SECRET,
  ssoBaseUrl: process.env.SSO_BASE_URL || "https://sso.doneisbetter.com",
  ssoRedirectUri: process.env.SSO_REDIRECT_URI || "https://kidex.messmass.com/api/oauth/callback",
  authSecret: process.env.AUTH_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "https://kidex.messmass.com/api/auth/google/callback"
};

type StringEnvKey = {
  [K in keyof typeof env]: (typeof env)[K] extends string | undefined ? K : never
}[keyof typeof env];

export function requireServerEnv(key: StringEnvKey): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}
