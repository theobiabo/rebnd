import { betterAuth, type BetterAuthOptions } from "better-auth"
import type { Pool } from "pg"
import type { Environment } from "../config/env"

export function authOptions(database: Pool, env: Environment) {
  return {
    appName: "rebnd",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: { enabled: false },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: ["read:user", "user:email"],
      },
    },
    account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    onAPIError: { errorURL: `${env.WEB_ORIGIN}/auth?error=oauth_failed` },
  } satisfies BetterAuthOptions
}
export function createAuth(database: Pool, env: Environment) {
  return betterAuth(authOptions(database, env))
}
export type Auth = ReturnType<typeof createAuth>
