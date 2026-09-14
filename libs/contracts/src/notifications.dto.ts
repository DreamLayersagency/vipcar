import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const OPS_NOTIFICATION_KINDS = [
  'new_quote',
  'new_contact',
  'new_reservation',
] as const;

export type OpsNotificationKind = (typeof OPS_NOTIFICATION_KINDS)[number];

export class ListOpsNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ListOpsNotificationsDto extends ListOpsNotificationsQueryDto {
  @IsUUID()
  userId!: string;
}

export class MarkOpsNotificationsReadHttpDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  notificationIds!: string[];
}

export class MarkOpsNotificationsReadDto extends MarkOpsNotificationsReadHttpDto {
  @IsUUID()
  userId!: string;
}

export type OpsNotificationDto = {
  id: string;
  kind: OpsNotificationKind;
  entityId: string;
  href: string;
  payload: Record<string, unknown>;
  createdAt: string;
  isRead: boolean;
};
