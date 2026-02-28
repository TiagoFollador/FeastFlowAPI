import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  findAll(
    @Query('spaceId', new ParseIntPipe({ optional: true })) spaceId?: number,
    @Query('status') status?: string,
    @Query('eventDate') eventDate?: string,
  ) {
    return this.reservationsService.findAll({
      spaceId,
      status,
      eventDate: eventDate ? new Date(eventDate) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id);
  }
}
