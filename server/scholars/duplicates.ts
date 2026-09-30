import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { digest } from "../auth/crypto.js";
import type {
  DuplicateCandidate,
  DuplicateCheck,
  ScholarFields,
} from "./model.js";

export const normalizeName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
const phone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return /^(?:63|0)9\d{9}$/.test(digits) ? "63" + digits.slice(-10) : digits;
};
const same = (a: string | null, b: string | null) => Boolean(a && b && a === b);
// One insertion, deletion, substitution or adjacent transposition; short names require equality.
export function nearName(a: string, b: string): boolean {
  if (same(a, b)) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1)
    return false;
  if (a.length > b.length) return nearName(b, a);
  let index = 0;
  while (index < a.length && a[index] === b[index]) index++;
  if (a.length < b.length) return a.slice(index) === b.slice(index + 1);
  return (
    a.slice(index + 1) === b.slice(index + 1) ||
    (a[index] === b[index + 1] &&
      a[index + 1] === b[index] &&
      a.slice(index + 2) === b.slice(index + 2))
  );
}
export function duplicateEvidence(input: ScholarFields, other: ScholarFields) {
  const first = normalizeName(input.firstName),
    last = normalizeName(input.lastName);
  const otherFirst = normalizeName(other.firstName),
    otherLast = normalizeName(other.lastName);
  const exact = same(first, otherFirst) && same(last, otherLast);
  const similar =
    !exact && nearName(first, otherFirst) && nearName(last, otherLast);
  const dob = same(input.birthDate, other.birthDate);
  const email = same(
    input.contact.email.trim().toLowerCase(),
    other.contact.email.trim().toLowerCase(),
  );
  const telephone = same(
    phone(input.contact.phone),
    phone(other.contact.phone),
  );
  const address = same(
    normalizeName(input.contact.addressLine),
    normalizeName(other.contact.addressLine),
  );
  if (!(
    exact ||
    similar ||
    email ||
    telephone ||
    (dob && (same(first, otherFirst) || same(last, otherLast) || address))
  ))
    return null;
  const reasons = [
    exact && "Same first and last name",
    similar && "Similar first and last name",
    dob && "Same birth date",
    same(input.barangayId, other.barangayId) && "Same barangay",
    email && "Same email",
    telephone && "Same phone",
    address && "Same address",
  ].filter((reason): reason is string => Boolean(reason));
  return {
    likelihood: ((exact || similar) && (dob || email || telephone)
      ? "likely"
      : "possible") as "likely" | "possible",
    reasons,
  };
}

/** Called under the configuration writer guard for creation. A current read sees committed competitors. */
export async function checkDuplicates(
  db: PoolConnection,
  fields: ScholarFields,
): Promise<DuplicateCheck> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT s.id,s.version,s.first_name,s.middle_name,s.last_name,s.suffix,DATE_FORMAT(s.birth_date,'%Y-%m-%d') AS birth_date,s.academic_year_id,s.barangay_id,i.human_id,c.email,c.phone,c.address_line FROM scholars s JOIN scholar_identifiers i ON i.scholar_id=s.id JOIN scholar_contacts c ON c.scholar_id=s.id ORDER BY s.id LOCK IN SHARE MODE",
  );
  const candidates: DuplicateCandidate[] = [];
  for (const row of rows) {
    const evidence = duplicateEvidence(fields, {
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      suffix: row.suffix,
      birthDate: row.birth_date,
      academicYearId: row.academic_year_id,
      barangayId: row.barangay_id,
      contact: {
        email: row.email,
        phone: row.phone,
        addressLine: row.address_line,
      },
    });
    if (evidence)
      candidates.push({
        id: row.id,
        scholarId: row.human_id,
        displayName: [
          row.last_name + ",",
          row.first_name,
          row.middle_name,
          row.suffix,
        ]
          .filter(Boolean)
          .join(" "),
        version: row.version,
        ...evidence,
      });
  }
  // Fingerprint binds review to these inputs and every candidate version, including omitted rows.
  const snapshot = digest(
    JSON.stringify({ algorithm: "f05-v1", fields, candidates }),
  );
  return {
    candidates: candidates.slice(0, 100),
    total: candidates.length,
    snapshot,
  };
}
