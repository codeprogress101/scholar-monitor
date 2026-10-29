// B1 discovery is evidence of annual association, not scholarship approval.
// Keep the older associatedYearId contract separate for legacy callers.
export const registryYearAssociation = ` AND (
 EXISTS(SELECT 1 FROM scholar_intakes biy WHERE biy.scholar_id=s.id AND biy.academic_year_id=?)
 OR EXISTS(SELECT 1 FROM academic_records bay WHERE bay.scholar_id=s.id AND bay.academic_year_id=?)
 OR EXISTS(SELECT 1 FROM scholarship_records bry WHERE bry.scholar_id=s.id AND bry.academic_year_id=?)
 OR EXISTS(SELECT 1 FROM scholar_semesters bss JOIN semesters bst ON bst.id=bss.semester_id WHERE bss.scholar_id=s.id AND bst.academic_year_id=?)
)`;
