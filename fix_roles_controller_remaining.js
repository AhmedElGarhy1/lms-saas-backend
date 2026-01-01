const fs = require('fs');

let content = fs.readFileSync('src/modules/access-control/controllers/roles.controller.ts', 'utf8');

// Replace all remaining ControllerResponse.success calls with translation objects
content = content.replace(
  /ControllerResponse\.success\(([^,]+),\s*\{\s*key:\s*['"]([^'"]+)['"],?\s*args:\s*([^}]+)\s*\}\s*\)/g,
  (match, data, key, args) => {
    // Extract a simple message from the key
    const keyParts = key.split('.');
    const action = keyParts[keyParts.length - 1];
    let message = 'Operation completed successfully';
    
    if (action === 'found') message = 'Data retrieved successfully';
    else if (action === 'created') message = 'Resource created successfully';
    else if (action === 'updated') message = 'Resource updated successfully';
    else if (action === 'deleted') message = 'Resource deleted successfully';
    else if (action === 'assigned') message = 'Role assigned successfully';
    else if (action === 'removed') message = 'Role removed successfully';
    
    return `ControllerResponse.success(${data}, '${message}')`;
  }
);

// Also fix ControllerResponse.message calls
content = content.replace(
  /ControllerResponse\.message\(\s*\{\s*key:\s*['"]([^'"]+)['"],?\s*args:\s*([^}]+)\s*\}\s*\)/g,
  (match, key, args) => {
    const keyParts = key.split('.');
    const action = keyParts[keyParts.length - 1];
    let message = 'Operation completed successfully';
    
    if (action === 'updated') message = 'Resource updated successfully';
    else if (action === 'created') message = 'Resource created successfully';
    else if (action === 'deleted') message = 'Resource deleted successfully';
    
    return `ControllerResponse.message('${message}')`;
  }
);

fs.writeFileSync('src/modules/access-control/controllers/roles.controller.ts', content, 'utf8');
console.log('Fixed remaining roles controller issues');
