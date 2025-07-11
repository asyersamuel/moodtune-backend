import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { MusicService } from '../music/music.service';
import { DummyService } from '../dummy/dummy.service';
import { CreateAnalyzeDto } from './dto/create-analyze.dto';

@Controller('api/analyze')
export class AnalyzeController {
  constructor(
    private readonly llmService: LlmService,
    private readonly musicService: MusicService,
    private readonly dummyService: DummyService,
  ) {}

  @Post()
  async analyzeAndSearch(@Body() dto: CreateAnalyzeDto) {
    const { text, favouriteArtist, favouriteSong, favouriteGenre } = dto;
    if (!text?.trim()) {
      throw new BadRequestException('Text empty');
    }

    try {
      const emotion = await this.llmService.analyze(
        text.trim(),
        favouriteArtist,
        favouriteSong,
        favouriteGenre,
      );

      const music = await this.musicService.searchTracks(emotion.query);
      return { emotion, music };
    } catch (err) {
      console.warn('[WARN] fallback to dummy because:', err.message || err);
      return this.dummyService.getFallback();
    }
  }
}
