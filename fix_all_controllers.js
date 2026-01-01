const fs = require('fs');
const path = require('path');

// Get all TypeScript files in controllers
const getControllerFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
      files.push(...getControllerFiles(fullPath));
    } else if (item.endsWith('.controller.ts') && !item.includes('.spec.')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

const files = getControllerFiles('src');

let fixedCount = 0;

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Fix ControllerResponse.success calls with translation objects
    const successPattern = /ControllerResponse\.success\(([^,]+),\s*\{\s*key:\s*['"]([^'"]+)['"],?\s*args:\s*([^}]+)\s*\}\s*\)/g;
    content = content.replace(successPattern, (match, data, key, args) => {
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
      else if (action === 'completed') message = 'Operation completed successfully';
      else if (action === 'sent') message = 'Message sent successfully';
      
      return `ControllerResponse.success(${data}, '${message}')`;
    });
    
    // Fix ControllerResponse.message calls with translation objects
    const messagePattern = /ControllerResponse\.message\(\s*\{\s*key:\s*['"]([^'"]+)['"],?\s*args:\s*([^}]+)\s*\}\s*\)/g;
    content = content.replace(messagePattern, (match, key, args) => {
      const keyParts = key.split('.');
      const action = keyParts[keyParts.length - 1];
      let message = 'Operation completed successfully';
      
      if (action === 'updated') message = 'Resource updated successfully';
      else if (action === 'created') message = 'Resource created successfully';
      else if (action === 'deleted') message = 'Resource deleted successfully';
      
      return `ControllerResponse.message('${message}')`;
    });
    
    if (content !== fs.readFileSync(file, 'utf8')) {
      fs.writeFileSync(file, content, 'utf8');
      fixedCount++;
      console.log(`Fixed ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`Fixed ${fixedCount} controller files`);
