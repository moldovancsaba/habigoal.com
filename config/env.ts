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
  mongodbDb: process.env.MONGODB_DB || "habigoal",
  mongodbAppName: process.env.MONGODB_APP_NAME || "habigoal-app",
  imgbbApiKey: process.env.IMGBB_API_KEY,
  appBaseUrl,
  habigoalEnforceAuth: readBooleanEnv(process.env.HABIGOAL_ENFORCE_AUTH ?? process.env.SURVEY_ENFORCE_AUTH, false),
  ssoClientId: process.env.SSO_Client_ID || process.env.SSO_CLIENT_ID,
  ssoClientSecret: process.env.SSO_Client_Secret || process.env.SSO_CLIENT_SECRET,
  ssoBaseUrl: process.env.SSO_BASE_URL || "https://sso.doneisbetter.com",
  ssoRedirectUri: process.env.SSO_REDIRECT_URI || (appBaseUrl ? `${appBaseUrl}/api/oauth/callback` : undefined),
  ssoLogoutUrl: process.env.SSO_LOGOUT_URL,
  authSecret: process.env.AUTH_SECRET,
  sessionDurationDays: Number(process.env.SESSION_DURATION_DAYS) > 0 ? Number(process.env.SESSION_DURATION_DAYS) : 30,
  trainersIngestApiKey: process.env.TRAINERS_INGEST_API_KEY,
  cronSecret: process.env.CRON_SECRET,
  ouraClientId: process.env.OURA_CLIENT_ID,
  ouraClientSecret: process.env.OURA_CLIENT_SECRET,
  ouraApiBaseUrl: process.env.OURA_API_BASE_URL || "https://api.ouraring.com",
  whoopClientId: process.env.WHOOP_CLIENT_ID,
  whoopClientSecret: process.env.WHOOP_CLIENT_SECRET,
  whoopApiBaseUrl: process.env.WHOOP_API_BASE_URL || "https://api.prod.whoop.com",
  garminClientId: process.env.GARMIN_CLIENT_ID,
  garminClientSecret: process.env.GARMIN_CLIENT_SECRET,
  garminAuthorizeUrl: process.env.GARMIN_AUTHORIZE_URL || "https://connect.garmin.com/oauth2Confirm",
  garminTokenUrl: process.env.GARMIN_TOKEN_URL || "https://diauth.garmin.com/di-oauth2-service/oauth/token",
  garminApiBaseUrl: process.env.GARMIN_API_BASE_URL || "https://apis.garmin.com",
  valdWebhookSecret: process.env.VALD_WEBHOOK_SECRET,
  // Capability flags (#440). Default OFF: a capability is only ON once its real
  // implementation exists. UI uses these to render real features or an honest
  // "not available yet" state — never fabricated data.
  capabilities: {
    visionAi: readBooleanEnv(process.env.CAPABILITY_VISION_AI, false),
    gpsIngestion: readBooleanEnv(process.env.CAPABILITY_GPS_INGESTION, false),
    forecasting: readBooleanEnv(process.env.CAPABILITY_FORECASTING, false),
    aiCoachNudges: readBooleanEnv(process.env.CAPABILITY_AI_COACH_NUDGES, false),
    cogLeague: readBooleanEnv(process.env.CAPABILITY_COGLEAGUE, false),
    gameFlow: readBooleanEnv(process.env.CAPABILITY_GAMEFLOW, false),
  },
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
