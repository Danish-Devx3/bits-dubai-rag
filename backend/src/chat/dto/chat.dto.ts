import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDto {
    @IsString()
    role: 'user' | 'assistant';

    @IsString()
    content: string;

    @IsBoolean()
    @IsOptional()
    hasError?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    recommendations?: string[];

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}

export class CreateChatSessionDto {
    @IsString()
    title: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateMessageDto)
    @IsOptional()
    messages?: CreateMessageDto[];
}

export class UpdateChatSessionDto {
    @IsString()
    @IsOptional()
    title?: string;
}

export class AddMessageDto {
    @IsString()
    role: 'user' | 'assistant';

    @IsString()
    content: string;

    @IsBoolean()
    @IsOptional()
    hasError?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    recommendations?: string[];

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
