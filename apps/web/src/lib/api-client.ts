import type { ApiErrorBody } from "@workspace/shared/contracts/api"

export class ApiClientError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  })
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorBody | null
    if (response.status === 401)
      window.location.assign(
        `/auth?returnTo=${encodeURIComponent(window.location.pathname)}`
      )
    throw new ApiClientError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The API is unavailable. Please try again."
    )
  }
  return response.json() as Promise<T>
}
export async function mutate<T>(
  path: string,
  body: unknown,
  method = "POST"
): Promise<T> {
  const options = {
    method,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  }
  try {
    return await api<T>(path, options)
  } catch (error) {
    if (error instanceof TypeError) return api<T>(path, options)
    throw error
  }
}
