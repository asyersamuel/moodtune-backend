import { Module } from '@nestjs/common';
import { DummyService } from './dummy.service';
import { DummyController } from './dummy.controller';

@Module({
  providers: [DummyService],
  controllers: [DummyController],
  exports: [DummyService],
})
export class DummyModule {}
