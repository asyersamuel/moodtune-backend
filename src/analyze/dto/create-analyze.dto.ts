import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAnalyzeDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsOptional()
    @IsString()
    favouriteArtist?: string;

    @IsOptional()
    @IsString()
    favouriteSong?: string;

    @IsOptional()
    @IsString()
    favouriteGenre?: string;
}

