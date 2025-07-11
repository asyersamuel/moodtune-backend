import { Module } from '@nestjs/common';
import { AnalyzeController } from './analyze.controller';
import { LlmModule } from '../llm/llm.module';
import { MusicModule } from '../music/music.module';
import { DummyModule } from '../dummy/dummy.module';

@Module({
  imports: [LlmModule, MusicModule, DummyModule],
  controllers: [AnalyzeController],
})
export class AnalyzeModule {}
