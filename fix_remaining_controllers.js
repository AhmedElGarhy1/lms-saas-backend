const fs = require('fs');

// Fix remaining ControllerResponse calls in user-profile and user controllers
const files = [
  'src/modules/user-profile/controllers/user-profile-actions.controller.ts',
  'src/modules/user-profile/controllers/user-profile.controller.ts', 
  'src/modules/user/controllers/user-access.controller.ts'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Fix bulk operation ControllerResponse calls
    content = content.replace(
      /ControllerResponse\.success\(result,\s*\{\s*key:\s*['"]t\.messages\.bulkOperationSuccess['"],?\s*args:\s*\{\s*count:\s*result\.success\.toString\(\),\s*item:\s*['"][^'"]+['"]\s*\}\s*\}\s*\)/g,
      "ControllerResponse.success(result, 'Bulk operation completed successfully')"
    );
    
    // Fix other ControllerResponse calls with translation objects
    content = content.replace(
      /ControllerResponse\.success\(([^,]+),\s*\{\s*key:\s*['"]([^'"]+)['"],?\s*args:\s*([^}]+)\s*\}\s*\)/g,
      (match, data, key, args) => {
        let message = 'Operation completed successfully';
        
        if (key.includes('updated')) message = 'Resource updated successfully';
        else if (key.includes('deleted')) message = 'Resource deleted successfully';
        else if (key.includes('restored')) message = 'Resource restored successfully';
        
        return `ControllerResponse.success(${data}, '${message}')`;
      }
    );
    
    if (content !== fs.readFileSync(file, 'utf8')) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed ${file}`);
      changed = true;
    }
    
    if (!changed) {
      console.log(`No changes needed in ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log('Remaining controllers fixed');
