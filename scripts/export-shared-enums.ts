import * as fs from 'fs';
import * as path from 'path';

// Files to export to frontend/mobile
const SHARED_ENUMS = [
  'src/shared/common/enums/error-codes/common.codes.ts',
  'src/modules/auth/enums/auth.codes.ts',
  'src/modules/user/enums/user.codes.ts',
];

// Output directory for frontend/mobile
const OUTPUT_DIR = 'shared-frontend';

function extractEnum(content: string, enumName: string): string {
  const enumRegex = new RegExp(`export enum ${enumName} \\{([\\s\\S]*?)\\}`);
  const match = content.match(enumRegex);
  return match ? `export enum ${enumName} ${match[1]}` : '';
}

function createFrontendEnums() {
  const outputPath = path.join(process.cwd(), OUTPUT_DIR);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Create index file
  let indexContent = '// Auto-generated error codes for frontend/mobile\n';
  indexContent += '// Do not edit manually - generated from backend\n\n';

  for (const enumFile of SHARED_ENUMS) {
    const filePath = path.join(process.cwd(), enumFile);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract enum name from file path
    const enumName = path.basename(enumFile, '.codes.ts')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'ErrorCode';

    const enumContent = extractEnum(content, enumName);

    if (enumContent) {
      const outputFile = path.basename(enumFile).replace('.codes.ts', '.ts');
      fs.writeFileSync(path.join(outputPath, outputFile), enumContent);
      indexContent += `export * from './${outputFile.replace('.ts', '')}';\n`;
    }
  }

  // Create types file for frontend
  const typesContent = `// Auto-generated types for frontend/mobile
export interface DomainError {
  errorCode: string;
  type: 'domain_error' | 'system_error';
  timestamp: string;
  metadata?: {
    field?: string;
    value?: unknown;
    phone?: string;
    email?: string;
    userId?: string;
    sessionId?: string;
    userMessage?: string;
    [key: string]: any;
  };
}

export interface SystemError {
  errorCode: string;
  type: 'system_error';
  timestamp: string;
  metadata?: {
    component?: string;
    operation?: string;
    retryable?: boolean;
    [key: string]: any;
  };
}
`;

  fs.writeFileSync(path.join(outputPath, 'types.ts'), typesContent);
  fs.writeFileSync(path.join(outputPath, 'index.ts'), indexContent);

  console.log(`✅ Exported ${SHARED_ENUMS.length} enum files to ${OUTPUT_DIR}`);
}

createFrontendEnums();
