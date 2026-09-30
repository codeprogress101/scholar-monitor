import { z } from "zod";

const schema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    APP_ORIGIN: z.url().optional(),
    DB_HOST: z.string().min(1).default("127.0.0.1"),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_NAME: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .default("ldss_scholar_monitor_dev"),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().optional(),
    SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).max(120).default(30),
    SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === "staging" || value.APP_ENV === "production") {
      if (!value.APP_ORIGIN?.startsWith("https://")) {
        context.addIssue({
          code: "custom",
          path: ["APP_ORIGIN"],
          message: "HTTPS origin required",
        });
      }
      if (!value.DB_USER || value.DB_USER === "root" || !value.DB_PASSWORD) {
        context.addIssue({
          code: "custom",
          path: ["DB_USER"],
          message: "Dedicated database credentials required",
        });
      }
    }
  });

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ];
    // Report field names only: invalid values may contain secrets.
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }
  if (env.NODE_ENV === "production" && result.data.APP_ENV === "development") {
    throw new Error("APP_ENV must be explicitly set for a production runtime");
  }
  return result.data;
}
