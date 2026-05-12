import { getFormValue } from "./state";
import type { FormFieldDefinition, FormRenderContext } from "../../types/form-system";

export function isFieldVisible(field: FormFieldDefinition, values: unknown, context: FormRenderContext) {
  const rule = field.visibility;

  if (!rule) {
    return true;
  }

  if (rule.roles && !rule.roles.includes(context.role)) {
    return false;
  }

  if (rule.requiresLinkedAthlete && !context.hasLinkedAthlete) {
    return false;
  }

  if (rule.requiresTeamMembership && !context.hasTeamMembership) {
    return false;
  }

  if (rule.dependsOn) {
    return getFormValue(values, rule.dependsOn) === rule.equals;
  }

  return true;
}
