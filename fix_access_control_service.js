const fs = require('fs');

let content = fs.readFileSync('src/modules/access-control/services/access-control.service.ts', 'utf8');

// Replace all exception calls with translation objects and resource property
content = content.replace(
  /throw new (BusinessLogicException|InsufficientPermissionsException)\(\s*'[^']*',\s*\{\s*resource:\s*'[^']+'\s*\}\s*\);/g,
  (match, exceptionType) => {
    let message = 'Access denied';
    if (exceptionType === 'BusinessLogicException') {
      message = 'Operation not allowed';
    } else if (exceptionType === 'InsufficientPermissionsException') {
      message = 'Insufficient permissions';
    }
    return `throw new ${exceptionType}('${message}');`;
  }
);

// Also fix cases with action and resource
content = content.replace(
  /throw new (BusinessLogicException|InsufficientPermissionsException)\(\s*'[^']*',\s*\{\s*(action|resource):\s*'[^']+'\s*(,\s*(action|resource):\s*'[^']+'\s*)?\}\s*\);/g,
  (match, exceptionType) => {
    let message = 'Access denied';
    if (exceptionType === 'BusinessLogicException') {
      message = 'Operation not allowed';
    } else if (exceptionType === 'InsufficientPermissionsException') {
      message = 'Insufficient permissions';
    }
    return `throw new ${exceptionType}('${message}');`;
  }
);

fs.writeFileSync('src/modules/access-control/services/access-control.service.ts', content, 'utf8');
console.log('Fixed access control service exceptions');
