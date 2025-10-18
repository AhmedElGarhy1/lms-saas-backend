import fs from 'fs';

const basePath = 'src/i18n/en.json';
const targetPath = 'src/i18n/ar.json';

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((res, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null) {
      Object.assign(res, flatten(val, newKey));
    } else {
      res[newKey] = val;
    }
    return res;
  }, {});
}

function compareKeys(baseFile, targetFile) {
  const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const target = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

  const baseKeys = Object.keys(flatten(base));
  const targetKeys = Object.keys(flatten(target));

  const missingInTarget = baseKeys.filter((k) => !targetKeys.includes(k));
  const extraInTarget = targetKeys.filter((k) => !baseKeys.includes(k));

  console.log('🌍 Translation check:');
  console.log(`- Base file:   ${baseFile}`);
  console.log(`- Target file: ${targetFile}\n`);

  if (missingInTarget.length === 0 && extraInTarget.length === 0) {
    console.log('✅ All translation keys match!');
    return;
  }

  if (missingInTarget.length) {
    console.log('⚠️  Missing keys in target file:');
    missingInTarget.forEach((key) => console.log(`   - ${key}`));
  }

  if (extraInTarget.length) {
    console.log('\n⚠️  Extra keys in target file:');
    extraInTarget.forEach((key) => console.log(`   - ${key}`));
  }

  process.exit(1);
}

compareKeys(basePath, targetPath);
