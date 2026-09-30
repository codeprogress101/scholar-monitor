import { describe, expect, it } from "vitest";
import {
  duplicateEvidence,
  nearName,
  normalizeName,
} from "../server/scholars/duplicates.js";
import type { ScholarFields } from "../server/scholars/model.js";
const person: ScholarFields = {
  firstName: "María",
  middleName: "",
  lastName: "Dela Cruz",
  suffix: "",
  birthDate: "2005-01-02",
  academicYearId: "year",
  barangayId: "barangay",
  contact: {
    email: "person@example.invalid",
    phone: "+63 912 345 6789",
    addressLine: "12 Example Street",
  },
};
const unknown = {
  ...person,
  firstName: "Unrelated",
  lastName: "Other",
  birthDate: null,
  barangayId: null,
  contact: { email: "", phone: "", addressLine: "" },
};
describe("Duplicate-person evidence", () => {
  it("normalizes case, accents, spaces and punctuation without discarding Unicode letters", () => {
    expect(normalizeName(" MARÍA Dela-Cruz ")).toBe("mariadelacruz");
    expect(normalizeName("李 明")).toBe("李明");
    expect(
      duplicateEvidence(person, {
        ...person,
        firstName: "Maria",
        lastName: "dela-cruz",
      })?.likelihood,
    ).toBe("likely");
  });
  it("warns for matching names despite different DOB or middle names", () => {
    expect(
      duplicateEvidence(person, {
        ...unknown,
        firstName: person.firstName,
        lastName: person.lastName,
        middleName: "Different",
      })?.likelihood,
    ).toBe("possible");
  });
  it("supports one-character mistakes and transpositions while protecting short names", () => {
    for (const name of ["maria", "mariaa", "mara", "marai", "marie"])
      expect(nearName("maria", name)).toBe(true);
    expect(nearName("ann", "ana")).toBe(false);
    expect(nearName("maria", "mariela")).toBe(false);
  });
  it("never treats missing evidence as a match", () => {
    expect(duplicateEvidence(person, unknown)).toBeNull();
    expect(nearName("", "")).toBe(false);
  });
  it("recognizes Philippine local/international phone formats as warnings", () => {
    expect(
      duplicateEvidence(person, {
        ...unknown,
        contact: { ...unknown.contact, phone: "09123456789" },
      })?.reasons,
    ).toEqual(["Same phone"]);
  });
  it("treats shared email as evidence, not proof of identity", () => {
    expect(
      duplicateEvidence(person, {
        ...unknown,
        contact: { ...unknown.contact, email: "PERSON@example.invalid" },
      })?.likelihood,
    ).toBe("possible");
  });
  it("uses birth date plus surname but not birth date or barangay alone", () => {
    expect(
      duplicateEvidence(person, {
        ...unknown,
        birthDate: person.birthDate,
        barangayId: person.barangayId,
      }),
    ).toBeNull();
    expect(
      duplicateEvidence(person, {
        ...unknown,
        lastName: person.lastName,
        birthDate: person.birthDate,
      })?.reasons,
    ).toContain("Same birth date");
  });
});
