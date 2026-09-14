import { IsIn, IsUUID } from 'class-validator';

export const OPS_FOLLOW_UP_STATUSES = [
  'new',
  'replied',
  'awaiting_customer',
  'confirmed',
  'closed',
] as const;

export type OpsFollowUpStatus = (typeof OPS_FOLLOW_UP_STATUSES)[number];

export class GetOpsFollowUpDto {
  @IsUUID()
  recordId!: string;
}

export class UpdateOpsFollowUpDto extends GetOpsFollowUpDto {
  @IsIn(OPS_FOLLOW_UP_STATUSES)
  status!: OpsFollowUpStatus;

  @IsUUID()
  updatedByUserId!: string;
}

export class UpdateOpsFollowUpHttpDto {
  @IsIn(OPS_FOLLOW_UP_STATUSES)
  status!: OpsFollowUpStatus;
}

export type OpsFollowUpDto = {
  recordId: string;
  status: OpsFollowUpStatus;
  updatedByUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
