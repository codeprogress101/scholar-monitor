import type { ConfigList, ConfigRecord } from "../server/configuration/model";
import { configurationRequest } from "./configuration-api";
import { defaultReceivingYear, receivingToday } from "./receiving-selection";

export async function academicYears(signal: AbortSignal) {
  const years: ConfigRecord[] = [];
  for (;;) {
    const page = await configurationRequest<ConfigList>(`configuration/academic-years?includeArchived=true&limit=100&offset=${years.length}`, { signal });
    years.push(...page.items);
    if (!page.items.length || years.length >= page.total) return years;
  }
}
export function newRecordYear(years: ConfigRecord[], usedYearIds: string[], requested: string, registration: string, day = receivingToday()) {
  const available = years.filter(y => y.working !== false && !y.locked && !y.archived && !usedYearIds.includes(y.id));
  if (requested) return available.some(y => y.id === requested) ? requested : "";
  const working = available.find(y => y.working);
  if (working) return working.id;
  return defaultReceivingYear(available.map(y => ({ id: y.id, academicYearId: y.id })), years, registration, day);
}
