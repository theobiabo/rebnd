import { dashClient } from "@better-auth/infra/client"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({ plugins: [dashClient()] })

export function authReturnPath() {
  const path = new URLSearchParams(window.location.search).get("returnTo")
  return path && /^\/dashboard(?:\/[a-zA-Z0-9/-]*)?$/.test(path)
    ? path
    : "/dashboard"
}
