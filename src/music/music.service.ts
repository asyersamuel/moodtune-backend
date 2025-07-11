import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MusicService {
  private baseUrl = 'https://api.spotify.com/v1';
  private token: string | null = null;
  constructor(private readonly config: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.token) return this.token;

    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );
      const { data } = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({ grant_type: 'client_credentials' }),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.token = data.access_token;

      if (this.token === null) {
        throw new Error('Token is null');
      }

      console.log('[Spotify Token]', this.token);
      return this.token;
    } catch (err: any) {
      console.error('[Spotify Token ERROR]', err.response?.data || err.message);
      throw new InternalServerErrorException('Failed to get Spotify token');
    }
  }

  async searchTracks(query: string) {
    const token = await this.getAccessToken();

    const { data } = await axios.get(`${this.baseUrl}/search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: query,
        type: 'track',
        market: 'ID',
        limit: 15,
      },
    });

    const tracks = data.tracks.items
      .filter((t: any) => !/instrumental|cover|remix/i.test(t.name))
      .map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists.map((a: any) => a.name).join(', '),
        preview: t.preview_url || null,
        cover: t.album.images?.[1]?.url || null,
        link: t.external_urls.spotify,
      }));

    console.log('[DEBUG] Final tracks:', tracks);
    return tracks;
  }
}
