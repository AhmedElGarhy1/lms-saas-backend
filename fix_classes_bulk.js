const fs = require('fs');

const files = [
  'src/modules/classes/controllers/class-staff-access.controller.ts',
  'src/modules/classes/controllers/classes-actions.controller.ts',
  'src/modules/classes/controllers/groups-actions.controller.ts',
  'src/modules/classes/controllers/groups-students-access.controller.ts'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Fix bulk operation ControllerResponse calls
    const bulkPattern = /ControllerResponse\.success\(result,\s*\{\s*key:\s*['"]t\.messages\.bulkOperationSuccess['"],?\s*args:\s*\{\s*count:\s*result\.success\.toString\(\),\s*item:\s*['"][^'"]+['"]\s*\}\s*\}\s*\)/g;
    content = content.replace(bulkPattern, "ControllerResponse.success(result, 'Bulk operation completed successfully')");
    
    if (content !== fs.readFileSync(file, 'utf8')) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed bulk operations in ${file}`);
      changed = true;
    }
    
    if (!changed) {
      console.log(`No changes needed in ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log('Classes bulk operation fixes completed');
