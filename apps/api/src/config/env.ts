import { z } from "zod"

const origin = z
  .url()
  .refine((value) => {
    const url = new URL(value)
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    )
  }, "Use an HTTP origin without a path")
  .transform((value) => new URL(value).origin)
const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          ["postgres:", "postgresql:"].includes(new URL(value).protocol),
        "Use a PostgreSQL connection URL"
      ),
    WEB_ORIGIN: origin.default("http://localhost:5173"),
    BETTER_AUTH_URL: origin.default("http://localhost:5173"),
    BETTER_AUTH_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).optional()
    ),
    BETTER_AUTH_SECRET: z.string().min(32),
    GITHUB_APP_ID: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().regex(/^\d+$/).optional()
    ),
    GITHUB_APP_SLUG: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .optional()
    ),
    GITHUB_APP_PRIVATE_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).optional()
    ),
    GITHUB_APP_WEBHOOK_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional()
    ),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.WEB_ORIGIN !== value.BETTER_AUTH_URL)
      ctx.addIssue({
        code: "custom",
        message:
          "WEB_ORIGIN and BETTER_AUTH_URL must match; proxy /api to the backend",
      })
    if (
      value.NODE_ENV === "production" &&
      (!value.WEB_ORIGIN.startsWith("https:") ||
        !value.BETTER_AUTH_URL.startsWith("https:"))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Production origins must use HTTPS",
      })
    }
  })
export type Environment = z.infer<typeof schema>
export function readEnvironment(
  source: NodeJS.ProcessEnv = process.env
): Environment {
  const result = schema.safeParse(source)
  if (!result.success)
    throw new Error(
      `Invalid server configuration: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`
    )
  return result.data
}
