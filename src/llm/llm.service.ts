import { Injectable, BadGatewayException } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { ConfigService } from '@nestjs/config';

const RESET_INTERVAL_MS = 60 * 60 * 1000;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    label: {
      type: Type.STRING,
      enum: ['happy', 'calm', 'sad', 'angry', 'anxious', 'tired'],
    },
    emoji: { type: Type.STRING, enum: ['😄', '😌', '😔', '😡', '😰', '😴'] },
    valence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
    energy: { type: Type.NUMBER, minimum: 0, maximum: 1 },
    query: { type: Type.STRING },
    advice: { type: Type.STRING },
  },
  required: ['label', 'emoji', 'valence', 'energy', 'query', 'advice'],
  propertyOrdering: ['label', 'emoji', 'valence', 'energy', 'query', 'advice'],
};

@Injectable()
export class LlmService {
  private apiKeys: string[];
  private currentKeyIndex = 0;
  private usageLog: number[];
  private lastReset = Date.now();

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('GEMINI_API_KEY');
    if (!raw) throw new Error('ENV GEMINI_API_KEY tidak ditemukan');
    this.apiKeys = raw.split(',').map((k) => k.trim());
    this.usageLog = Array(this.apiKeys.length).fill(0);
  }

  async analyze(
    text: string,
    favArtist?: string,
    favSong?: string,
    favGenre?: string,
  ) {
    console.debug('[DEBUG] ▶️ analyze() dipanggil dengan:', {
      text,
      favArtist,
      favSong,
      favGenre,
    });

    for (let i = 0; i < this.apiKeys.length; i++) {
      try {
        const result = await this.generate(
          text,
          0.7,
          favArtist,
          favSong,
          favGenre,
        );
        this.usageLog[this.currentKeyIndex]++;
        console.debug(
          `[DEBUG] ✔️ analyze() sukses dengan keyIndex=${this.currentKeyIndex}`,
        );
        return result;
      } catch (err: any) {
        console.warn(
          `[DEBUG] ❌ generate() gagal pada keyIndex=${this.currentKeyIndex}:`,
          err.message || err,
        );
        const status = err?.status || err?.response?.status;
        const exhausted =
          status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED');
        if (exhausted && this.currentKeyIndex < this.apiKeys.length - 1) {
          console.warn(
            `[WARN] 🔄 Kuota keyIndex=${this.currentKeyIndex} habis, pindah ke ${
              this.currentKeyIndex + 1
            }`,
          );
          this.currentKeyIndex++;
        } else {
          console.error('[ERROR] Semua API Key gagal:', err);
          throw new BadGatewayException('LLM_error');
        }
      }
    }
    throw new BadGatewayException('All API keys exhausted');
  }

  private async generate(
    text: string,
    temperature: number,
    favArtist?: string,
    favSong?: string,
    favGenre?: string,
  ) {
    this.resetIfNeeded();
    const apiKey = this.apiKeys[this.currentKeyIndex];
    console.debug(
      `[DEBUG] 🔑 Menggunakan API Key index=${this.currentKeyIndex}`,
    );
    const ai = new GoogleGenAI({ apiKey });
    const sysPrompt = this.buildSystemPrompt(favArtist, favSong, favGenre);

    console.debug('[DEBUG] 🚀 Memulai generateContent…');
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        { role: 'model', parts: [{ text: sysPrompt }] },
        { role: 'user', parts: [{ text }] },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature,
      },
    });
    console.debug('[DEBUG] ✅ Sukses generateContent.');

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
    console.debug('[DEBUG] ✉️ Raw response:', raw);
    if (!raw) throw new Error('No response text');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
      console.debug('[DEBUG] 🔄 Parsed JSON:', parsed);
    } catch (e) {
      console.error('[ERROR] 🧨 JSON Parsing gagal:', e);
      throw new Error('Invalid JSON');
    }

    if (!this.isValid(parsed)) {
      console.error('[ERROR] ⚠️ Struktur JSON tidak valid:', parsed);
      throw new Error('Invalid Structure');
    }
    return parsed;
  }

  //   private buildSystemPrompt(a?: string, s?: string, g?: string): string {
  //     return `
  // You are an emotion analyst & music‐query curator.

  // User favourites:
  // • artist: "${a || '-'}"
  // • song  : "${s || '-'}"
  // • genre : "${g || '-'}"

  // Return ONLY JSON:
  // {
  //   "label":   "<one of: happy|calm|sad|angry|anxious|tired>",
  //   "emoji":   "<😄😌😔😡😰😴>",
  //   "valence": <float 0–1>,
  //   "energy":  <float 0–1>,
  //   "query":   "<3–5 English words: mood + genre + 'songs' or 'vocal' + 'hits' or 'popular'; NEVER include: cover, remix, live, playlist, instrumental>",
  //   "advice":  "<positive tip ≤20 words in user language>"
  // }

  // Rules:
  // • Use favourite_genre or favourite_artist **only** if it helps match the detected mood.
  // • Emoji must match label (happy→😄, calm→😌, sad→😔, angry→😡, anxious→😰, tired→😴).
  // • Pick tracks that are well-known vocals, no instrumental, released ≤10 years if possible.
  // • Use mainstream genres (pop, acoustic, indie, rock, lo-fi, etc.) based on valence & energy:
  //   - low valence, low energy → acoustic / piano ballad
  //   - high valence, high energy → upbeat pop / dance
  //   - adjust otherwise.
  // • Output nothing outside JSON.
  //     `.trim();
  //   }

  private buildSystemPrompt(
    favArtist?: string,
    favSong?: string,
    favGenre?: string,
  ): string {
    return `
You are **MoodTune AI** — a top-tier emotion analyst and Spotify music curator.

### 1. User favourites  
• favourite_artist : "${favArtist || '-'}"  
• favourite_song   : "${favSong || '-'}"  
• favourite_genre  : "${favGenre || '-'}"  

### 2. Your single JSON reply  
Return **ONLY** one compact JSON object that matches this schema  
\`\`\`json
{
  "label":   "happy | calm | sad | angry | anxious | tired",
  "emoji":   "😄 | 😌 | 😔 | 😡 | 😰 | 😴",
  "valence": 0.0–1.0,
  "energy":  0.0–1.0,
  "query":   "exactly 3-5 lowercase words • pattern: <mood> <genre> (songs|vocal) (hits|popular)",
  "advice":  "≤20 words, positive, same language as user"
}
\`\`\`

### 3. How to pick **query**
1. Detect mood → choose *label* & *emoji* pair (mapping fixed, no others).  
2. Decide rough genre by valence/energy table:  
   | valence | energy | genre hint |  
   |---------|--------|------------|  
   | ≤0.3    | ≤0.4   | acoustic / piano |  
   | ≤0.3    | ≥0.6   | emo rock / alt  |  
   | 0.4-0.6 | any    | indie / lofi    |  
   | ≥0.7    | ≤0.4   | chill vocal     |  
   | ≥0.7    | ≥0.6   | upbeat pop / dance |
3. **If favourite_genre** fits the mood table → use it.  
4. **If favourite_artist** sings matching genre & mood → consider adding their name as *genre* (e.g. “sheeran pop songs hits”).  
5. Never include: cover, remix, live, playlist, instrumental.  
6. Keep the entire **query** lowercase, max 26 characters if possible.

### 4. Example ✅  
> User text: “Aku sedang sedih dan butuh semangat.”  
Return:  
\`\`\`json
{"label":"sad","emoji":"😔","valence":0.25,"energy":0.45,"query":"sad acoustic songs hits","advice":"Tarik napas, beri dirimu waktu. Kamu tidak sendiri."}
\`\`\`

### 5. Additional rules  
• Prefer tracks released in the last **5 years** and with vocals.  
• Output absolutely nothing except the JSON object (no markdown).  
`.trim();
  }

  private resetIfNeeded() {
    if (Date.now() - this.lastReset > RESET_INTERVAL_MS) {
      console.info('[INFO] ⏱️ Resetting keyIndex & usageLog (1h elapsed)');
      this.currentKeyIndex = 0;
      this.usageLog.fill(0);
      this.lastReset = Date.now();
    }
  }

  private isValid(data: any): boolean {
    return (
      data &&
      typeof data.label === 'string' &&
      typeof data.emoji === 'string' &&
      typeof data.valence === 'number' &&
      typeof data.energy === 'number' &&
      typeof data.query === 'string' &&
      typeof data.advice === 'string'
    );
  }
}
