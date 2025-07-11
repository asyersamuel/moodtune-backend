import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmModule } from './llm/llm.module';
import { MusicModule } from './music/music.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { DummyModule } from './dummy/dummy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env',
      expandVariables: true, 
    }),
    LlmModule,
    MusicModule,
    AnalyzeModule,
    DummyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
