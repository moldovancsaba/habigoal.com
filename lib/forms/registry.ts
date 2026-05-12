import { athleteBaselineFormDefinition } from "./definitions/athlete-baseline";
import { dailyCheckinFormDefinition } from "./definitions/daily-checkin";
import { teamSetupFormDefinition } from "./definitions/team-setup";
import { userAccessFormDefinition } from "./definitions/user-access";
import type { FormDefinition } from "../../types/form-system";

export const formDefinitions = [
  dailyCheckinFormDefinition,
  athleteBaselineFormDefinition,
  userAccessFormDefinition,
  teamSetupFormDefinition
] as const satisfies readonly FormDefinition[];

const formDefinitionMap = new Map(formDefinitions.map((definition) => [definition.id, definition] as const));

export function listFormDefinitions() {
  return [...formDefinitions];
}

export function getFormDefinition(formId: string) {
  return formDefinitionMap.get(formId);
}
