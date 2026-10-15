export type RosterEntry = { scholarId: string; humanId: string; name: string; version: number; sourceRow: number; originalName: string };
export type Roster = { id: string; code: string; sourceReference: string; actorId: string; state: "pending" | "accepted" | "rejected"; revision: number };
export type RosterDetail = Roster & { entries: RosterEntry[]; decision: null | { reason: string; effectiveOn: string; issuer: string; reference: string; actorName: string } };
