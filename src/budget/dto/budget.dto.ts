import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { EventNature } from '@prisma/client';

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsUUID()
  @IsNotEmpty()
  location_id: string;

  @IsEnum(EventNature)
  event_nature: EventNature;

  @IsInt()
  @Min(1)
  guest_count: number;
}

export class ApproveBudgetDto {
  /** Current version_token known by the client – used for OCC check. */
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  version_token: number;
}
