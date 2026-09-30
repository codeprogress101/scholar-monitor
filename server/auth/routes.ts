import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { AuthError, type AuthApi, type Session } from "./service.js";
import { sameToken } from "./crypto.js";

declare module "fastify" {
  interface FastifyRequest {
    authSession: Session | null;
  }
}

export function registerAuth(
  app: FastifyInstance,
  config: AppConfig,
  auth: AuthApi,
) {
  const secure = ["staging", "production"].includes(config.APP_ENV);
  const cookieName = secure ? "__Host-ldss_session" : "ldss_session";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
  };
  const origins = new Set(
    [config.APP_ORIGIN].filter((origin): origin is string => Boolean(origin)),
  );
  if (!secure)
    for (const host of ["127.0.0.1", "localhost"])
      for (const port of [5173, config.PORT])
        origins.add(`http://${host}:${port}`);
  app.decorateRequest("authSession", null);
  const publicRoutes = new Set([
    "/api/v1/health",
    "/api/v1/ready",
    "/api/v1/auth/login",
    "/api/v1/auth/reset-password",
  ]);
  const clear = (reply: FastifyReply) =>
    reply.clearCookie(cookieName, cookieOptions);

  app.addHook("preHandler", async (request, reply) => {
    const path = request.routeOptions.url ?? request.url.split("?")[0];
    if (!path.startsWith("/api/")) return;
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (!publicRoutes.has(path)) {
      try {
        request.authSession = await auth.session(
          request.cookies[cookieName],
          !["/api/v1/auth/me", "/api/v1/me/permissions"].includes(path),
        );
      } catch (error) {
        if (error instanceof AuthError && [401, 403].includes(error.status))
          clear(reply);
        throw error;
      }
    }
    if (mutation) {
      if (
        !request.headers.origin ||
        !origins.has(request.headers.origin) ||
        request.headers["sec-fetch-site"] === "cross-site"
      )
        throw new AuthError(
          403,
          "ORIGIN_NOT_ALLOWED",
          "This request did not originate from the application.",
        );
      if (
        !request.headers["content-type"]
          ?.toLowerCase()
          .startsWith("application/json")
      )
        throw new AuthError(415, "JSON_REQUIRED", "Use a JSON request.");
      if (
        request.authSession &&
        !sameToken(
          request.headers["x-csrf-token"],
          request.authSession.csrfToken,
        )
      )
        throw new AuthError(
          403,
          "CSRF_INVALID",
          "Refresh the page and try again.",
        );
    }
  });

  app.post(
    "/api/v1/auth/login",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const input = z
        .object({
          email: z
            .email()
            .max(254)
            .regex(/^[\x20-\x7E]+$/),
          password: z.string().min(1).max(512),
        })
        .strict()
        .safeParse(request.body);
      if (!input.success)
        throw new AuthError(
          422,
          "VALIDATION_FAILED",
          "Enter a valid email and password.",
        );
      const result = await auth.login(
        input.data.email,
        input.data.password,
        request.ip,
        request.id,
        request.cookies[cookieName],
      );
      reply.setCookie(cookieName, result.token, {
        ...cookieOptions,
        maxAge: config.SESSION_ABSOLUTE_HOURS * 3600,
      });
      return {
        user: result.user,
        csrfToken: result.csrfToken,
        expiresAt: result.expiresAt,
      };
    },
  );
  app.get(
    "/api/v1/auth/me",
    { config: { access: "authenticated" } },
    async (request) => request.authSession,
  );
  app.post(
    "/api/v1/auth/logout",
    { config: { access: "authenticated" } },
    async (request, reply) => {
      await auth.logout(
        request.cookies[cookieName]!,
        request.authSession!.user,
        request.id,
      );
      clear(reply);
      return reply.code(204).send();
    },
  );
  app.post(
    "/api/v1/auth/reset-password",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const input = z
        .object({ token: z.string().max(100), password: z.string().max(512) })
        .strict()
        .safeParse(request.body);
      if (!input.success)
        throw new AuthError(
          422,
          "VALIDATION_FAILED",
          "Provide a valid reset link and password.",
        );
      await auth.resetPassword(
        input.data.token,
        input.data.password,
        request.ip,
        request.id,
      );
      clear(reply);
      return reply.code(204).send();
    },
  );
}

export function authFailure(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!(error instanceof AuthError)) return false;
  if (error.status === 429) reply.header("Retry-After", "900");
  reply.code(error.status).send({
    error: {
      code: error.code,
      message: error.message,
      request_id: request.id,
    },
  });
  return true;
}
