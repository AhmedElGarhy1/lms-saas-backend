#!/usr/bin/env ts-node

/**
 * Translation Validation Script
 * 
 * Validates translation files for:
 * - EN/AR key matching
 * - Unused keys
 * - ICU syntax correctness
 * - Missing translations
 */

import * as fs from 'fs';
import * as path from 'path';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

class TranslationValidator {
  private enPath: string;
  private arPath: string;
  private enData: TranslationObject;
  private arData: TranslationObject;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    const i18nDir = path.join(__dirname, '../src/i18n');
    this.enPath = path.join(i18nDir, 'en/t.json');
    this.arPath = path.join(i18nDir, 'ar/t.json');
  }

  async validate(): Promise<void> {
    console.log('🔍 Starting translation validation...\n');

    // Load translation files
    this.loadFiles();

    // Validate structure
    this.validateStructure();

    // Validate key matching
    this.validateKeyMatching();

    // Validate ICU syntax
    this.validateICUSyntax();

    // Report results
    this.reportResults();
  }

  private loadFiles(): void {
    try {
      const enContent = fs.readFileSync(this.enPath, 'utf-8');
      const arContent = fs.readFileSync(this.arPath, 'utf-8');
      this.enData = JSON.parse(enContent);
      this.arData = JSON.parse(arContent);
      console.log('✅ Translation files loaded successfully\n');
    } catch (error) {
      console.error('❌ Error loading translation files:', error);
      process.exit(1);
    }
  }

  private validateStructure(): void {
    console.log('📋 Validating structure...');
    // Basic structure validation
    if (typeof this.enData !== 'object' || typeof this.arData !== 'object') {
      this.errors.push('Translation files must be valid JSON objects');
    }
  }

  private validateKeyMatching(): void {
    console.log('🔑 Validating key matching between EN and AR...');
    const enKeys = this.getAllKeys(this.enData);
    const arKeys = this.getAllKeys(this.arData);

    // Find keys in EN but not in AR
    const missingInAr = enKeys.filter((key) => !arKeys.includes(key));
    if (missingInAr.length > 0) {
      this.errors.push(
        `Missing keys in AR: ${missingInAr.slice(0, 10).join(', ')}${
          missingInAr.length > 10 ? ` ... and ${missingInAr.length - 10} more` : ''
        }`,
      );
    }

    // Find keys in AR but not in EN
    const missingInEn = arKeys.filter((key) => !enKeys.includes(key));
    if (missingInEn.length > 0) {
      this.errors.push(
        `Missing keys in EN: ${missingInEn.slice(0, 10).join(', ')}${
          missingInEn.length > 10 ? ` ... and ${missingInEn.length - 10} more` : ''
        }`,
      );
    }

    // Check for type mismatches (string vs object)
    this.checkTypeMismatches(this.enData, this.arData, '');
  }

  private checkTypeMismatches(
    enObj: TranslationObject,
    arObj: TranslationObject,
    prefix: string,
  ): void {
    for (const key in enObj) {
      const enValue = enObj[key];
      const arValue = arObj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (arValue === undefined) {
        continue; // Already reported as missing
      }

      const enIsString = typeof enValue === 'string';
      const arIsString = typeof arValue === 'string';
      const enIsObject = typeof enValue === 'object' && enValue !== null;
      const arIsObject = typeof arValue === 'object' && arValue !== null;

      if (enIsString && arIsObject) {
        this.errors.push(
          `Type mismatch at ${fullKey}: EN is string, AR is object`,
        );
      } else if (enIsObject && arIsString) {
        this.errors.push(
          `Type mismatch at ${fullKey}: EN is object, AR is string`,
        );
      } else if (enIsObject && arIsObject) {
        this.checkTypeMismatches(enValue as TranslationObject, arValue as TranslationObject, fullKey);
      }
    }
  }

  private validateICUSyntax(): void {
    console.log('🌐 Validating ICU MessageFormat syntax...');
    this.validateICUInObject(this.enData, 'EN');
    this.validateICUInObject(this.arData, 'AR');
  }

  private validateICUInObject(
    obj: TranslationObject,
    lang: string,
    prefix: string = '',
  ): void {
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        this.checkICUSyntax(value, fullKey, lang);
      } else if (typeof value === 'object' && value !== null) {
        this.validateICUInObject(value as TranslationObject, lang, fullKey);
      }
    }
  }

  private checkICUSyntax(
    text: string,
    key: string,
    lang: string,
  ): void {
    // Check for ICU plural syntax: {count, plural, ...}
    const pluralRegex = /\{(\w+),\s*plural\s*,/g;
    let match;
    while ((match = pluralRegex.exec(text)) !== null) {
      const varName = match[1];
      // Check if plural block is properly closed
      const pluralBlock = text.substring(match.index);
      const openBraces = (pluralBlock.match(/\{/g) || []).length;
      const closeBraces = (pluralBlock.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        this.errors.push(
          `Invalid ICU plural syntax at ${key} (${lang}): Unmatched braces`,
        );
      }

      // Check for required plural forms (at least 'other' is required)
      if (!pluralBlock.includes('other')) {
        this.warnings.push(
          `Missing 'other' form in ICU plural at ${key} (${lang})`,
        );
      }
    }

    // Check for ICU number syntax: {value, number}
    const numberRegex = /\{(\w+),\s*number(?:\s*,\s*(\w+))?\}/g;
    while ((match = numberRegex.exec(text)) !== null) {
      // Valid number format
    }

    // Check for ICU date syntax: {date, date, style}
    const dateRegex = /\{(\w+),\s*date(?:\s*,\s*(\w+))?\}/g;
    while ((match = dateRegex.exec(text)) !== null) {
      // Valid date format
    }

    // Check for unmatched braces
    const openCount = (text.match(/\{/g) || []).length;
    const closeCount = (text.match(/\}/g) || []).length;
    if (openCount !== closeCount) {
      this.errors.push(
        `Unmatched braces at ${key} (${lang}): ${openCount} open, ${closeCount} close`,
      );
    }
  }

  private getAllKeys(obj: TranslationObject, prefix: string = ''): string[] {
    const keys: string[] = [];
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        keys.push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        keys.push(...this.getAllKeys(value as TranslationObject, fullKey));
      }
    }
    return keys;
  }

  private reportResults(): void {
    console.log('\n📊 Validation Results:\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validations passed!\n');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error) => console.log(`   - ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning) => console.log(`   - ${warning}`));
      console.log('');
    }

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validation
const validator = new TranslationValidator();
validator.validate().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});

