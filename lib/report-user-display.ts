import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";

function mapCsvEmailsToNames(value: string, users: User[]): string {
  if (!value) return value;
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), (u.name || "").trim()]));
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const name = byEmail.get(entry.toLowerCase());
      return name || entry;
    })
    .join(", ");
}

export function withDisplayNamesForReport(record: AssessmentRecord, users: User[]): AssessmentRecord {
  return {
    ...record,
    session: {
      ...record.session,
      conductor: mapCsvEmailsToNames(record.session.conductor, users),
      observers: mapCsvEmailsToNames(record.session.observers, users)
    }
  };
}
