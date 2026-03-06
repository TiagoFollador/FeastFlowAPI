import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { EventLocationService } from './event-location.service';
import { CreateEventLocationDto } from './dto/create-event-location.dto';

@Controller('event-locations')
export class EventLocationController {
  constructor(private readonly service: EventLocationService) {}

  @Post()
  create(@Body() dto: CreateEventLocationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
