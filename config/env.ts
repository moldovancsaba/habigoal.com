export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "kidex",
  imgbbApiKey: process.env.IMGBB_API_KEY,
  kidexEnforceAuth: process.env.KIDEX_ENFORCE_AUTH === "true"
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
