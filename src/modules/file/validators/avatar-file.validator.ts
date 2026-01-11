import { FileValidator } from '@nestjs/common';

export interface AvatarFileValidatorOptions {
  maxSize?: number;
  allowedTypes?: string[];
}

export class AvatarFileValidator extends FileValidator<AvatarFileValidatorOptions> {
  private readonly maxSize: number;
  private readonly allowedTypes: string[];

  constructor(
    options: AvatarFileValidatorOptions = {},
    validationOptions?: any,
  ) {
    super(validationOptions);
    this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    this.allowedTypes = options.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
  }

  isValid(file: Express.Multer.File): boolean {
    // 1. Check if file exists
    if (!file) return false;

    // 2. Check file size
    if (file.size > this.maxSize) return false;

    // 3. Check MIME type
    if (!this.allowedTypes.includes(file.mimetype)) return false;

    // 4. Additional validation: Check if buffer exists
    if (!file.buffer) return false;

    // 5. Check magic bytes for image validation
    const magicBytes = file.buffer.subarray(0, 12); // Get first 12 bytes for validation
    const isValidImage = this.isValidImageMagicBytes(magicBytes, file.mimetype);
    if (!isValidImage) return false;

    return true;
  }

  buildErrorMessage(file: Express.Multer.File): string {
    if (!file) return 'Avatar file is required';

    if (file.size > this.maxSize) {
      return `Avatar file too large. Maximum size: ${(this.maxSize / (1024 * 1024)).toFixed(1)}MB`;
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      return `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`;
    }

    if (!file.buffer) {
      return 'Invalid file: missing file data';
    }

    return 'Invalid image file format';
  }

  private isValidImageMagicBytes(
    magicBytes: Buffer,
    mimeType: string,
  ): boolean {
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [
        [0xff, 0xd8, 0xff], // JPEG/JFIF
        [0xff, 0xd8, 0xff, 0xe0], // JPEG with EXIF
        [0xff, 0xd8, 0xff, 0xe1], // JPEG with EXIF
      ],
      'image/png': [
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
      ],
      'image/webp': [
        [
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ], // WebP
      ],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
      ],
    };

    const expectedSignatures = signatures[mimeType];
    if (!expectedSignatures) return false;

    return expectedSignatures.some((signature) => {
      return signature.every(
        (byte, index) => byte === null || magicBytes[index] === byte,
      );
    });
  }
}
