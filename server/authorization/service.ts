import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { AuthError, normalizeEmail } from "../auth/service.js";
import { digest } from "../auth/crypto.js";
import {
  ROLE_CODES,
  isPermission,
  type Access,
  type Role,
  type RoleCode,
  type Permission,
  type PermissionCode,
} from "./policy.js";

type User = RowDataPacket & {
  id: string;
  email: string;
  full_name: string;
  disabled_at: Date | null;
  version: number;
};
export type AuthorizationApi = Pick<AuthorizationService, "access" | "catalog">;

export class AuthorizationService {
  constructor(private pool: Pool | undefined) {}
  private async transaction<T>(run: (db: PoolConnection) => Promise<T>) {
    if (!this.pool)
      throw new AuthError(
        503,
        "AUTHORIZATION_UNAVAILABLE",
        "Access permissions are temporarily unavailable.",
      );
    const db = await this.pool.getConnection();
    try {
      await db.query("SET time_zone = '+00:00'");
      await db.beginTransaction();
      const result = await run(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }
  private async snapshot(db: PoolConnection, id: string): Promise<Access> {
    // The same user-row lock is used by role assignment, account disable, and guarded mutations.
    const [users] = await db.execute<User[]>(
      "SELECT id,version,disabled_at FROM users WHERE id=? FOR UPDATE",
      [id],
    );
    const user = users[0];
    if (!user) throw new AuthError(401, "AUTH_REQUIRED", "Please sign in.");
    if (user.disabled_at)
      throw new AuthError(403, "ACCOUNT_DISABLED", "This account is disabled.");
    const [roles] = await db.execute<(RowDataPacket & Role)[]>(
      "SELECT r.code,r.label,r.description FROM roles r JOIN user_roles ur ON ur.role_code=r.code WHERE ur.user_id=? AND ur.revoked_at IS NULL ORDER BY r.code",
      [id],
    );
    const [permissions] = await db.execute<(RowDataPacket & Permission)[]>(
      "SELECT DISTINCT p.code,p.label,p.category FROM permissions p JOIN role_permissions rp ON rp.permission_code=p.code JOIN user_roles ur ON ur.role_code=rp.role_code WHERE ur.user_id=? AND ur.revoked_at IS NULL ORDER BY p.category,p.code",
      [id],
    );
    return {
      userId: id,
      version: user.version,
      roles: roles.filter((role) => ROLE_CODES.includes(role.code)),
      permissions: permissions.filter((permission) =>
        isPermission(permission.code),
      ),
    };
  }
  async access(id: string) {
    return this.transaction((db) => this.snapshot(db, id));
  }
  async catalog() {
    return this.transaction(async (db) => {
      const [roles] = await db.query<(RowDataPacket & Role)[]>(
        "SELECT code,label,description FROM roles ORDER BY code",
      );
      const [permissions] = await db.query<(RowDataPacket & Permission)[]>(
        "SELECT code,label,category FROM permissions ORDER BY category,code",
      );
      const [grants] = await db.query<RowDataPacket[]>(
        "SELECT role_code,permission_code FROM role_permissions ORDER BY role_code,permission_code",
      );
      return {
        roles,
        permissions,
        grants: grants.map((grant) => ({
          role: grant.role_code as RoleCode,
          permission: grant.permission_code as PermissionCode,
        })),
      };
    });
  }
  /** Required for future business mutations: authorization and mutation share this connection/transaction. */
  async withPermission<T>(
    id: string,
    permission: PermissionCode,
    run: (db: PoolConnection, actor: Access) => Promise<T>,
  ) {
    return this.transaction(async (db) => {
      const actor = await this.snapshot(db, id);
      if (
        !isPermission(permission) ||
        !actor.permissions.some((item) => item.code === permission)
      )
        throw new AuthError(
          403,
          "PERMISSION_DENIED",
          "Your account does not have permission for this action.",
        );
      return run(db, actor);
    });
  }
  async inspectByEmail(email: string) {
    return this.transaction(async (db) => {
      const [users] = await db.execute<User[]>(
        "SELECT id,email,full_name,version,disabled_at FROM users WHERE email=?",
        [normalizeEmail(email)],
      );
      const user = users[0];
      if (!user)
        throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
      const [rows] = await db.execute<RowDataPacket[]>(
        "SELECT role_code FROM user_roles WHERE user_id=? AND revoked_at IS NULL ORDER BY role_code",
        [user.id],
      );
      return {
        userId: user.id,
        fullName: user.full_name,
        email: user.email,
        version: user.version,
        disabled: Boolean(user.disabled_at),
        roles: rows.map((row) => row.role_code as RoleCode),
      };
    });
  }
  /** Local operator only. The web runtime has no INSERT/UPDATE rights on RBAC tables. */
  async setRoles(input: {
    email: string;
    roles: RoleCode[];
    expectedVersion: number;
    requestId: string;
    operator: string;
    reason: string;
  }) {
    const roles = [...new Set(input.roles)].sort();
    if (
      roles.some((role) => !ROLE_CODES.includes(role)) ||
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 1 ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        input.requestId,
      ) ||
      input.reason.trim().length < 5 ||
      input.reason.trim().length > 500 ||
      !input.operator.trim()
    )
      throw new AuthError(
        422,
        "VALIDATION_FAILED",
        "Provide valid roles, version, request ID, operator and reason.",
      );
    const payloadHash = digest(
      JSON.stringify({ ...input, email: normalizeEmail(input.email), roles }),
    );
    return this.transaction(async (db) => {
      const [users] = await db.execute<User[]>(
        "SELECT id,version,disabled_at FROM users WHERE email=? FOR UPDATE",
        [normalizeEmail(input.email)],
      );
      const user = users[0];
      if (!user)
        throw new AuthError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
      const [prior] = await db.execute<RowDataPacket[]>(
        "SELECT payload_hash,resulting_version FROM role_change_commands WHERE request_id=?",
        [input.requestId],
      );
      if (prior[0]) {
        if (prior[0].payload_hash !== payloadHash)
          throw new AuthError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This request ID was already used for a different role change.",
          );
        return {
          version: prior[0].resulting_version as number,
          replayed: true,
        };
      }
      if (user.disabled_at)
        throw new AuthError(
          403,
          "ACCOUNT_DISABLED",
          "Enable the account before assigning roles.",
        );
      if (user.version !== input.expectedVersion)
        throw new AuthError(
          409,
          "VERSION_CONFLICT",
          "The account changed. Inspect its latest version and retry.",
        );
      const [existing] = await db.execute<RowDataPacket[]>(
        "SELECT id,role_code FROM user_roles WHERE user_id=? AND revoked_at IS NULL ORDER BY role_code",
        [user.id],
      );
      const before = existing.map((row) => row.role_code as RoleCode);
      const changed = JSON.stringify(before) !== JSON.stringify(roles);
      for (const assignment of existing)
        if (!roles.includes(assignment.role_code))
          await db.execute(
            "UPDATE user_roles SET revoked_at=UTC_TIMESTAMP(6) WHERE id=? AND revoked_at IS NULL",
            [assignment.id],
          );
      for (const role of roles)
        if (!before.includes(role))
          await db.execute(
            "INSERT INTO user_roles (id,user_id,role_code,granted_at) VALUES (?,?,?,UTC_TIMESTAMP(6))",
            [randomUUID(), user.id, role],
          );
      const version = user.version + (changed ? 1 : 0);
      if (changed) {
        await db.execute(
          "UPDATE users SET version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",
          [version, user.id],
        );
        await db.execute(
          "INSERT INTO audit_logs (id,event_type,entity_type,entity_id,action,actor_id,actor_kind,operator_reference,occurred_at,request_id,reason,details) VALUES (?,'account.roles_changed','user',?,'roles.replace',NULL,'local_operator',?,UTC_TIMESTAMP(6),?,?,?)",
          [
            randomUUID(),
            user.id,
            input.operator,
            input.requestId,
            input.reason.trim(),
            JSON.stringify({
              before,
              after: roles,
              expected_version: input.expectedVersion,
              version,
            }),
          ],
        );
      }
      await db.execute(
        "INSERT INTO role_change_commands (request_id,payload_hash,user_id,resulting_version,occurred_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))",
        [input.requestId, payloadHash, user.id, version],
      );
      return { version, replayed: false };
    });
  }
}
