import { Module } from '@nestjs/common';
import { EventLocationController } from './event-location.controller';
import { EventLocationService } from './event-location.service';

@Module({
  controllers: [EventLocationController],
  providers: [EventLocationService],
})
export class EventLocationModule {}
