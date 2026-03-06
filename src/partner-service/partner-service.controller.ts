import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PartnerServiceService } from './partner-service.service';
import { CreatePartnerServiceDto } from './dto/create-partner-service.dto';

@Controller('partner-services')
export class PartnerServiceController {
  constructor(private readonly service: PartnerServiceService) {}

  @Post()
  create(@Body() dto: CreatePartnerServiceDto) {
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
