export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "kidex",
  imgbbApiKey: process.env.IMGBB_API_KEY
};

export function requireServerEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}
