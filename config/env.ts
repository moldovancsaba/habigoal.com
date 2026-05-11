function readBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function readAppBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return undefined;
}

const appBaseUrl = readAppBaseUrl();

export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "survey",
  mongodbAppName: process.env.MONGODB_APP_NAME || "habigoal-app",
  imgbbApiKey: process.env.IMGBB_API_KEY,
  appBaseUrl,
  surveyEnforceAuth: readBooleanEnv(process.env.SURVEY_ENFORCE_AUTH, false),
  ssoClientId: process.env.SSO_Client_ID || process.env.SSO_CLIENT_ID,
  ssoClientSecret: process.env.SSO_Client_Secret || process.env.SSO_CLIENT_SECRET,
  ssoBaseUrl: process.env.SSO_BASE_URL || "https://sso.doneisbetter.com",
  ssoRedirectUri: process.env.SSO_REDIRECT_URI || (appBaseUrl ? `${appBaseUrl}/api/oauth/callback` : undefined),
  ssoLogoutUrl: process.env.SSO_LOGOUT_URL,
  authSecret: process.env.AUTH_SECRET
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
