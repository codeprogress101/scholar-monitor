export type AcademicRecord = {
  id: string;
  scholarId: string;
  academicYearId: string;
  schoolId: string;
  courseId: string;
  yearLevel: string;
  academicYear: { code: string; name: string };
  school: { code: string; name: string };
  course: { code: string; name: string };
  reason: string;
  reference: string;
  actorName: string;
  createdAt: string;
  periodUnavailable: boolean;
};
