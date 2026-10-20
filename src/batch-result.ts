import { ApiError } from "./auth-api";

export type PendingBatchCommand = { path: string; body: { importId: string; semesterId: string; items: unknown[] } & Record<string, unknown>; key: string };
// Memory only: a session refresh may unmount the workspace. Never put scholar
// details, attestations, authentication tokens or retry payloads in web storage.
const pendingCommands = new Map<string, PendingBatchCommand>();
// Keep the native leave-page warning during sign-in recovery too, when the
// dialog/workspace has been unmounted but its exact command still awaits resolution.
if (typeof window !== "undefined") window.addEventListener("beforeunload", event => {
  if (pendingCommands.size) { event.preventDefault(); event.returnValue = ""; }
});
export const hasPendingBatch = (actor: string) => pendingCommands.has(actor);
export const retainedBatch = (actor: string) => {
  const pending = pendingCommands.get(actor);
  return pending ? structuredClone(pending) : null;
};
export function retainBatch(actor: string, command: PendingBatchCommand | null) {
  if (command) pendingCommands.set(actor, structuredClone(command));
  else pendingCommands.delete(actor);
}

/** Access/validation failures on a retry cannot establish whether its earlier request committed. */
export function batchResultUncertain(error: unknown, retrying: boolean) {
  if (!(error instanceof ApiError) || error.status >= 500) return true;
  // This conflict is emitted only after the completed-command lookup found no result.
  if (retrying) return !(error.status === 409 && error.code === "BATCH_SOURCE_CHANGED");
  return false;
}
