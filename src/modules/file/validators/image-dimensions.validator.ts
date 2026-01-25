import { FileValidator } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageDimensionsValidatorOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export class ImageDimensionsValidator extends FileValidator<ImageDimensionsValidatorOptions> {
  private readonly minWidth: number;
  private readonly minHeight: number;
  private readonly maxWidth: number;
  private readonly maxHeight: number;

  constructor(
    options: ImageDimensionsValidatorOptions = {},
    validationOptions?: any,
  ) {
    super(validationOptions);
    this.minWidth = options.minWidth || 50; // Minimum 50px
    this.minHeight = options.minHeight || 50; // Minimum 50px
    this.maxWidth = options.maxWidth || 4000; // Maximum 4000px
    this.maxHeight = options.maxHeight || 4000; // Maximum 4000px
  }

  async isValid(file: Express.Multer.File): Promise<boolean> {
    if (!file || !file.buffer) return false;

    try {
      const metadata = await sharp(file.buffer).metadata();

      // Check if it's actually a valid image that Sharp can process
      if (!metadata.width || !metadata.height) return false;

      return (
        metadata.width >= this.minWidth &&
        metadata.height >= this.minHeight &&
        metadata.width <= this.maxWidth &&
        metadata.height <= this.maxHeight
      );
    } catch (error) {
      // If Sharp can't process it, it's not a valid image
      return false;
    }
  }

  buildErrorMessage(): string {
    return `Image dimensions must be between ${this.minWidth}x${this.minHeight} and ${this.maxWidth}x${this.maxHeight} pixels`;
  }
}
