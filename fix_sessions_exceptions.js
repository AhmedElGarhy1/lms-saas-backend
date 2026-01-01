const fs = require('fs');

// Fix BusinessLogicException calls in sessions service
let content = fs.readFileSync('src/modules/sessions/services/sessions.service.ts', 'utf8');

// Replace BusinessLogicException calls with translation objects
content = content.replace(
  /throw new BusinessLogicException\('t\.messages\.validationFailed',\s*\{\s*[^}]*\}\s*as\s*any\);/g,
  "throw new BusinessLogicException('Validation failed');"
);

content = content.replace(
  /throw new BusinessLogicException\('t\.messages\.cannotUpdateSession',\s*\{\s*[^}]*\}\s*\);/g,
  "throw new BusinessLogicException('Cannot update session');"
);

// Replace other BusinessLogicException calls with translation objects
content = content.replace(
  /throw new BusinessLogicException\('t\.messages\.validationFailed',\s*\{\s*resource:\s*'t\.resources\.[^']+'\s*\}\s*as\s*any\);/g,
  "throw new BusinessLogicException('Validation failed');"
);

fs.writeFileSync('src/modules/sessions/services/sessions.service.ts', content, 'utf8');
console.log('Fixed sessions service exceptions');
