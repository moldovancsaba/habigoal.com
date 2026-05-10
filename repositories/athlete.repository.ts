export type { ChildProfile as AthleteProfile } from "@/repositories/child.repository";
export {
  deleteChildById as deleteAthleteById,
  getChildById as getAthleteById,
  listChildren as listAthletes,
  listChildrenWithMetrics as listAthletesWithMetrics,
  listDeletedChildren as listDeletedAthletes,
  restoreChildById as restoreAthleteById,
  updateChildById as updateAthleteById,
  upsertChild as upsertAthlete
} from "@/repositories/child.repository";

