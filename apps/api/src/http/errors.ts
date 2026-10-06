export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 503,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
  }
}
export function notFound(): never {
  throw new ApiError(404, "NOT_FOUND", "The requested resource does not exist.")
}
