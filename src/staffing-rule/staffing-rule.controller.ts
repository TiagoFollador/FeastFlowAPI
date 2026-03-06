import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { StaffingRuleService } from './staffing-rule.service';
import { CreateStaffingRuleDto } from './dto/create-staffing-rule.dto';

@Controller('staffing-rules')
export class StaffingRuleController {
  constructor(private readonly service: StaffingRuleService) {}

  @Post()
  create(@Body() dto: CreateStaffingRuleDto) {
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
