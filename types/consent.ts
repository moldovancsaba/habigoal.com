export type ConsentPurpose =
  | 'daily_check_in'
  | 'wearable_data'
  | 'media_upload'
  | 'ai_processing'
  | 'performance_device_data'
  | 'report_sharing';

export type ConsentStatus = 'active' | 'withdrawn' | 'pending_guardian' | 'expired';

export interface ConsentRecord {
  _id?: string;
  consentId: string;
  athleteId: string;
  organisationId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  privacyNoticeVersion: string;
  consentVersion: string;
  guardianRequired: boolean;
  guardianEmail?: string;
  guardianConsentedAt?: string;
  consentedAt?: string;
  withdrawnAt?: string;
  withdrawnBy?: string;
  method: 'web_form' | 'admin_grant' | 'api';
  ipAddress?: string;           // SHA-256 hashed, not raw
  createdAt: string;
  updatedAt: string;
}
