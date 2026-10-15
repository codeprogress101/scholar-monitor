export type BulkJob = {
  id: string;
  label: string;
  path: string;
  body: unknown;
  key: string;
  saved?: boolean;
  error?: string;
};

/** Stop at the first unconfirmed result. Retry uses the exact same payload/key. */
export async function runBulkJobs(
  jobs: BulkJob[],
  send: (job: BulkJob) => Promise<unknown>,
  changed: (jobs: BulkJob[]) => void,
): Promise<BulkJob[]> {
  const next = jobs.map(job => ({ ...job }));
  for (const job of next) {
    if (job.saved) continue;
    job.error = undefined;
    try {
      await send(job);
      job.saved = true;
    } catch (error) {
      job.error = error instanceof Error ? error.message : "Result unconfirmed. Retry or refresh to review.";
      changed(next.map(row => ({ ...row })));
      return next;
    }
    changed(next.map(row => ({ ...row })));
  }
  return next;
}
