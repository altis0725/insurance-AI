const DEV_COOKIE_SECRET = "dev_secret_key_for_testing_only";

export const ENV = {
  appId: process.env.VITE_APP_ID || "dev-app-id",
  // プロダクションでは必須設定。開発時のみ既定のダミー値を許可する。
  cookieSecret: process.env.JWT_SECRET
    ?? (process.env.NODE_ENV === "development" ? DEV_COOKIE_SECRET : ""),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

export const isDevCookieSecret = (secret: string | undefined): boolean =>
  secret === DEV_COOKIE_SECRET;
