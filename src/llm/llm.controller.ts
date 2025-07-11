import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { CreateLlmDto } from './dto/create-llm.dto';

@Controller('api/llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

    @Post()
    async create(@Body() dto: CreateLlmDto) {
        const { text, favouriteArtist, favouriteSong, favouriteGenre } = dto;
        if (!text?.trim()) {
        throw new BadRequestException('Text Empty');
        }
        return this.llmService.analyze(
        text.trim(),
        favouriteArtist,
        favouriteSong,
        favouriteGenre,
        );
    }
}
