import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { MusicService } from './music.service';

@Controller('api/music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  async searchMusic(@Query('q') query: string) {
    return this.musicService.searchTracks(query);
  }
}
