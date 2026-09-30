import { z } from "zod";
import { AuthError } from "../auth/service.js";
import {
  CONFIG_KINDS,
  isPeriod,
  type ConfigKind,
  type ConfigCommand,
} from "./model.js";
const date = z.iso
  .date()
  .refine(
    (value) => value >= "1900-01-01" && value <= "9999-12-31",
    "Use a date from 1900 onward.",
  );
const code = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Use letters, numbers, periods, underscores, or hyphens.",
  )
  .transform((value) => value.toUpperCase());
const basic = { code, name: z.string().trim().min(2).max(160) };
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "Input"}: ${issue.message}`)
        .join(" ")
        .slice(0, 800),
    );
  return result.data;
}
export const parseKind = (value: unknown) => parse(z.enum(CONFIG_KINDS), value);
export const parseId = (value: unknown) => parse(z.uuid(), value);
export const parseKey = (value: unknown) => parse(z.uuid(), value);
export const parseQuery = (value: unknown) =>
  parse(
    z
      .object({
        includeArchived: z
          .enum(["true", "false"])
          .default("false")
          .transform((v) => v === "true"),
        q: z.string().trim().max(160).default(""),
        offset: z.coerce.number().int().min(0).max(1000000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .strict(),
    value,
  );
export function parseCommand(kind: ConfigKind, value: unknown): ConfigCommand {
  const command = parse(
    z
      .object({
        action: z.enum(["create", "update", "archive", "restore", "lock"]),
        expectedVersion: z.number().int().min(0),
        reason: z.string().trim().min(5).max(500),
        fields: z.unknown().optional(),
      })
      .strict(),
    value,
  );
  if (
    (command.action === "create" && command.expectedVersion !== 0) ||
    (command.action !== "create" && command.expectedVersion < 1)
  )
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Use version zero for new records and the current version for existing records.",
    );
  if (command.action === "lock" && !isPeriod(kind))
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "Only academic periods can be locked.",
    );
  if (!["create", "update"].includes(command.action)) {
    if (command.fields !== undefined)
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "This action does not accept record fields.",
      );
    return { ...command, fields: undefined };
  }
  const schema = isPeriod(kind)
    ? z
        .object({
          ...basic,
          startsOn: date,
          endsOn: date,
          ...(kind === "semesters" ? { academicYearId: z.uuid() } : {}),
        })
        .strict()
    : kind === "settings"
      ? z
          .object({
            ...basic,
            valueType: z.enum(["text", "date"]),
            value: z.string().trim().min(1).max(1000),
          })
          .strict()
      : z.object(basic).strict();
  const fields = parse(schema, command.fields) as NonNullable<
    ConfigCommand["fields"]
  >;
  if (isPeriod(kind) && fields.startsOn! > fields.endsOn!)
    throw new AuthError(
      422,
      "VALIDATION_FAILED",
      "End date must be on or after start date.",
    );
  if (kind === "settings" && fields.valueType === "date")
    parse(date, fields.value);
  return { ...command, fields };
}
