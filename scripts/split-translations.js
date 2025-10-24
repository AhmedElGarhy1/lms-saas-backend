import fs from 'fs';
import path from 'path';

const i18nDir = './scripts/i18n'; // where your source JSON files (en.json, ar.json, etc.) are
const outDir = './src/i18n'; // where the split output will go

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Read all JSON files in the source directory
const files = fs.readdirSync(i18nDir).filter((file) => file.endsWith('.json'));

if (files.length === 0) {
  console.log('⚠️ No JSON files found in', i18nDir);
  process.exit(0);
}

for (const file of files) {
  const lang = path.basename(file, '.json');
  const inputPath = path.join(i18nDir, file);
  const langOutDir = path.join(outDir, lang);

  fs.mkdirSync(langOutDir, { recursive: true });

  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(rawData);

    if (typeof data !== 'object' || Array.isArray(data)) {
      console.warn(`⚠️ Skipping ${file}: not a valid translation object`);
      continue;
    }

    const keys = Object.keys(data);
    for (const key of keys) {
      const outFile = path.join(langOutDir, `${key}.json`);
      fs.writeFileSync(outFile, JSON.stringify(data[key], null, 2), 'utf8');
      console.log(`✅ Wrote ${path.relative('.', outFile)}`);
    }

    console.log(`🎉 Done splitting ${file} → ${keys.length} files`);
  } catch (err) {
    console.error(`❌ Failed to process ${file}: ${err.message}`);
  }
}
