import { expect, it } from "vitest";
import { runBulkJobs, type BulkJob } from "../src/bulk-commands";

it("stops after an uncertain result, preserves exact retry identity and skips completed records", async () => {
  const jobs: BulkJob[] = [1,2,3].map(n => ({ id: String(n), label: String(n), path: `records/${n}`, key: `key-${n}`, body: { expectedVersion: n } }));
  const calls: BulkJob[] = [];
  const partial = await runBulkJobs(jobs, async job => { calls.push({...job}); if(job.id === "2") throw new Error("Network interrupted"); }, () => {});
  expect(calls.map(job=>job.id)).toEqual(["1","2"]);
  expect(partial[0].saved).toBe(true);
  expect(partial[1].error).toBe("Network interrupted");
  expect(partial[2].saved).toBeUndefined();
  const complete = await runBulkJobs(partial, async job => { calls.push({...job}); }, () => {});
  expect(calls.map(job=>job.id)).toEqual(["1","2","2","3"]);
  expect(calls[1].key).toBe(calls[2].key);
  expect(calls[1].body).toEqual(calls[2].body);
  expect(complete.every(job=>job.saved)).toBe(true);
  expect(jobs.every(job=>!job.saved)).toBe(true);
});
