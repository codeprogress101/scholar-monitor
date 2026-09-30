import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import {
  csrfToken,
  digest,
  hashPassword,
  newToken,
  validPassword,
  validToken,
  verifyPassword,
} from "./crypto.js";

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Actor = { id: string; email: string; fullName: string };
export type Session = { user: Actor; csrfToken: string; expiresAt: string };
type UserRow = RowDataPacket & {
  id: string;
  email: string;
  full_name: string;
  password_hash: string | null;
  disabled_at: Date | null;
  version: number;
};
type SessionRow = RowDataPacket & {
  user_id: string;
  expires_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
};
export type AuthApi = Pick<
  AuthService,
  "login" | "session" | "logout" | "resetPassword"
>;
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class AuthService {
  constructor(
    private pool: Pool | undefined,
    private idleMinutes = 30,
    private absoluteHours = 8,
  ) {}
  private async transaction<T>(
    operation: (db: PoolConnection) => Promise<T>,
  ): Promise<T> {
    if (!this.pool)
      throw new AuthError(
        503,
        "AUTH_UNAVAILABLE",
        "Account service is temporarily unavailable.",
      );
    const db = await this.pool.getConnection();
    try {
      await db.query("SET time_zone = '+00:00'");
      await db.beginTransaction();
      const result = await operation(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }
  private async audit(
    db: PoolConnection,
    userId: string,
    event: string,
    requestId: string,
    options: { operator?: string; reason?: string; details?: object } = {},
  ) {
    await db.execute(
      "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),?,?,?)",
      [
        randomUUID(),
        event,
        "user",
        userId,
        event,
        options.operator ? null : userId,
        options.operator ? "local_operator" : "user",
        options.operator ?? null,
        requestId,
        options.reason ?? null,
        JSON.stringify(options.details ?? {}),
      ],
    );
  }
  private async user(db: PoolConnection, id: string) {
    const [rows] = await db.execute<UserRow[]>(
      "SELECT * FROM users WHERE id = ? FOR UPDATE",
      [id],
    );
    return rows[0];
  }
  private active(user: UserRow | undefined): asserts user is UserRow {
    if (!user) throw new AuthError(401, "AUTH_REQUIRED", "Please sign in.");
    if (user.disabled_at)
      throw new AuthError(
        403,
        "ACCOUNT_DISABLED",
        "This account is disabled. Contact your administrator.",
      );
  }
  private async throttle(keys: { key: string; max: number }[]) {
    const permitted = await this.transaction(async (db) => {
      let allowed = true;
      for (const bucket of keys
        .map((value) => ({ ...value, hash: digest(value.key) }))
        .sort((a, b) => a.hash.localeCompare(b.hash))) {
        await db.execute(
          "INSERT INTO auth_rate_limits (bucket_hash,attempts,window_started_at) VALUES (?,1,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE attempts=IF(window_started_at < UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE,1,attempts+1), window_started_at=IF(window_started_at < UTC_TIMESTAMP(6) - INTERVAL 15 MINUTE,UTC_TIMESTAMP(6),window_started_at)",
          [bucket.hash],
        );
        const [rows] = await db.execute<RowDataPacket[]>(
          "SELECT attempts FROM auth_rate_limits WHERE bucket_hash = ? FOR UPDATE",
          [bucket.hash],
        );
        if (rows[0].attempts > bucket.max) allowed = false;
      }
      return allowed;
    });
    if (!permitted)
      throw new AuthError(
        429,
        "AUTH_RATE_LIMITED",
        "Too many attempts. Please try again in 15 minutes.",
      );
  }
  async login(
    email: string,
    password: string,
    ip: string,
    requestId: string,
    previousToken?: string,
  ) {
    email = normalizeEmail(email);
    await this.throttle([
      { key: `login-email:${email}`, max: 10 },
      { key: `login-ip:${ip}`, max: 50 },
    ]);
    // Read for expensive verification outside the row lock, then recheck the hash under lock.
    const snapshot = await this.transaction(async (db) => {
      const [rows] = await db.execute<UserRow[]>(
        "SELECT * FROM users WHERE email = ?",
        [email],
      );
      return rows[0];
    });
    const matched = await verifyPassword(
      password,
      snapshot?.password_hash ?? null,
    );
    if (!snapshot || !matched)
      throw new AuthError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    return this.transaction(async (db) => {
      const user = await this.user(db, snapshot.id);
      this.active(user);
      if (user.password_hash !== snapshot.password_hash)
        throw new AuthError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      const token = newToken();
      const expires = new Date(Date.now() + this.absoluteHours * 3600_000);
      if (previousToken)
        await db.execute(
          "UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE token_hash=? AND user_id=? AND revoked_at IS NULL",
          [digest(previousToken), user.id],
        );
      await db.execute(
        "INSERT INTO auth_sessions (token_hash,user_id,created_at,last_seen_at,expires_at) VALUES (?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)",
        [digest(token), user.id, expires],
      );
      await this.audit(db, user.id, "auth.login", requestId);
      return {
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        csrfToken: csrfToken(token),
        expiresAt: expires.toISOString(),
      };
    });
  }
  async session(token: string | undefined, touch = true): Promise<Session> {
    if (!token) throw new AuthError(401, "AUTH_REQUIRED", "Please sign in.");
    if (!validToken(token))
      throw new AuthError(
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please sign in again.",
      );
    return this.transaction(async (db) => {
      const [ids] = await db.execute<RowDataPacket[]>(
        "SELECT user_id FROM auth_sessions WHERE token_hash=?",
        [digest(token)],
      );
      if (!ids[0])
        throw new AuthError(
          401,
          "SESSION_EXPIRED",
          "Your session has expired. Please sign in again.",
        );
      const user = await this.user(db, ids[0].user_id);
      this.active(user);
      const [sessions] = await db.execute<SessionRow[]>(
        "SELECT * FROM auth_sessions WHERE token_hash=? FOR UPDATE",
        [digest(token)],
      );
      const session = sessions[0];
      if (
        !session ||
        session.revoked_at ||
        session.expires_at.getTime() <= Date.now() ||
        session.last_seen_at.getTime() + this.idleMinutes * 60000 <= Date.now()
      )
        throw new AuthError(
          401,
          "SESSION_EXPIRED",
          "Your session has expired. Please sign in again.",
        );
      if (touch)
        await db.execute(
          "UPDATE auth_sessions SET last_seen_at=UTC_TIMESTAMP(6) WHERE token_hash=?",
          [digest(token)],
        );
      return {
        user: { id: user.id, email: user.email, fullName: user.full_name },
        csrfToken: csrfToken(token),
        expiresAt: session.expires_at.toISOString(),
      };
    });
  }
  async logout(token: string, actor: Actor, requestId: string) {
    await this.transaction(async (db) => {
      await this.user(db, actor.id);
      await db.execute(
        "UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE token_hash=? AND user_id=?",
        [digest(token), actor.id],
      );
      await this.audit(db, actor.id, "auth.logout", requestId);
    });
  }
  async createAccount(fullName: string, email: string, operator: string) {
    return this.transaction(async (db) => {
      const id = randomUUID();
      await db.execute(
        "INSERT INTO users (id,email,full_name,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
        [id, normalizeEmail(email), fullName.trim()],
      );
      await this.audit(db, id, "account.created", randomUUID(), {
        operator,
        reason: "Individual account provisioned; password activation required.",
      });
      return id;
    });
  }
  async setDisabled(
    email: string,
    disabled: boolean,
    operator: string,
    reason: string,
  ) {
    return this.transaction(async (db) => {
      const [rows] = await db.execute<UserRow[]>(
        "SELECT * FROM users WHERE email=? FOR UPDATE",
        [normalizeEmail(email)],
      );
      const user = rows[0];
      if (!user)
        throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
      if (Boolean(user.disabled_at) === disabled) return;
      await db.execute(
        "UPDATE users SET disabled_at=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
        [disabled ? new Date() : null, user.id],
      );
      await db.execute(
        "UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=?",
        [user.id],
      );
      await db.execute(
        "UPDATE password_resets SET consumed_at=COALESCE(consumed_at,UTC_TIMESTAMP(6)) WHERE user_id=?",
        [user.id],
      );
      await this.audit(
        db,
        user.id,
        disabled ? "account.disabled" : "account.enabled",
        randomUUID(),
        {
          operator,
          reason,
          details: {
            from: user.disabled_at ? "disabled" : "active",
            to: disabled ? "disabled" : "active",
          },
        },
      );
    });
  }
  async issueReset(email: string, operator: string, reason: string) {
    return this.transaction(async (db) => {
      const [rows] = await db.execute<UserRow[]>(
        "SELECT * FROM users WHERE email=? FOR UPDATE",
        [normalizeEmail(email)],
      );
      const user = rows[0];
      this.active(user);
      const token = newToken();
      await db.execute(
        "UPDATE password_resets SET consumed_at=COALESCE(consumed_at,UTC_TIMESTAMP(6)) WHERE user_id=?",
        [user.id],
      );
      await db.execute(
        "INSERT INTO password_resets (token_hash,user_id,created_at,expires_at) VALUES (?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6) + INTERVAL 15 MINUTE)",
        [digest(token), user.id],
      );
      await this.audit(db, user.id, "account.reset_issued", randomUUID(), {
        operator,
        reason,
      });
      return token;
    });
  }
  async resetPassword(
    token: string,
    password: string,
    ip: string,
    requestId: string,
  ) {
    await this.throttle([{ key: `reset-ip:${ip}`, max: 20 }]);
    if (!validToken(token))
      throw new AuthError(
        400,
        "RESET_INVALID",
        "This link is invalid or expired. Ask your administrator for a new link.",
      );
    if (!validPassword(password))
      throw new AuthError(
        422,
        "PASSWORD_TOO_WEAK",
        "Use a password between 15 and 128 characters.",
      );
    const hash = await hashPassword(password);
    return this.transaction(async (db) => {
      const [ids] = await db.execute<RowDataPacket[]>(
        "SELECT user_id FROM password_resets WHERE token_hash=?",
        [digest(token)],
      );
      if (!ids[0])
        throw new AuthError(
          400,
          "RESET_INVALID",
          "This link is invalid or expired. Ask your administrator for a new link.",
        );
      const user = await this.user(db, ids[0].user_id);
      this.active(user);
      const [rows] = await db.execute<RowDataPacket[]>(
        "SELECT consumed_at,expires_at FROM password_resets WHERE token_hash=? FOR UPDATE",
        [digest(token)],
      );
      if (rows[0].consumed_at || rows[0].expires_at.getTime() <= Date.now())
        throw new AuthError(
          400,
          "RESET_INVALID",
          "This link is invalid or expired. Ask your administrator for a new link.",
        );
      await db.execute(
        "UPDATE users SET password_hash=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
        [hash, user.id],
      );
      await db.execute(
        "UPDATE password_resets SET consumed_at=COALESCE(consumed_at,UTC_TIMESTAMP(6)) WHERE user_id=?",
        [user.id],
      );
      await db.execute(
        "UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE user_id=?",
        [user.id],
      );
      await this.audit(db, user.id, "account.password_reset", requestId);
    });
  }
}
