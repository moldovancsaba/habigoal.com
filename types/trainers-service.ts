export type TrainersServicePayload = {
  id: string;
  draftId: string;
  entityKind: string;
  draftPayload: Record<string, unknown>;
  adapterVersion: string;
  workflowMetadata: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};
