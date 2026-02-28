import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { EventCatalogsService } from './event-catalogs.service';
import { CreateEventCatalogDto, UpdateEventCatalogDto } from './dto/event-catalog.dto';

@Controller('event-catalogs')
export class EventCatalogsController {
  constructor(private readonly eventCatalogsService: EventCatalogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventCatalogDto) {
    return this.eventCatalogsService.create(dto);
  }

  @Get()
  findAll() {
    return this.eventCatalogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventCatalogsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventCatalogDto) {
    return this.eventCatalogsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventCatalogsService.remove(id);
  }
}
