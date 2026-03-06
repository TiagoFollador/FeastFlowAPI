import { Module } from '@nestjs/common';
import { StaffingRuleController } from './staffing-rule.controller';
import { StaffingRuleService } from './staffing-rule.service';

@Module({
  controllers: [StaffingRuleController],
  providers: [StaffingRuleService],
})
export class StaffingRuleModule {}
