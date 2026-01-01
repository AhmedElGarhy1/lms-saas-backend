const fs = require('fs');
const path = require('path');

// Function to process a file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace ResourceNotFoundException calls
  content = content.replace(
    /new ResourceNotFoundException\('t\.messages\.[^']+', \{\s*resource:\s*'t\.resources\.[^']+'\s*\}\)/g,
    () => {
      changed = true;
      return "new ResourceNotFoundException('Resource not found')";
    }
  );
  
  // Replace ResourceAlreadyExistsException calls
  content = content.replace(
    /new ResourceAlreadyExistsException\('t\.messages\.[^']+', \{\s*resource:\s*'t\.resources\.[^']+'\s*\}\)/g,
    () => {
      changed = true;
      return "new ResourceAlreadyExistsException('Resource already exists')";
    }
  );
  
  // Replace InsufficientPermissionsException calls
  content = content.replace(
    /new InsufficientPermissionsException\('t\.messages\.[^']+', \{\s*resource:\s*'t\.resources\.[^']+'\s*\}\)/g,
    () => {
      changed = true;
      return "new InsufficientPermissionsException('Insufficient permissions')";
    }
  );
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

// Find all TypeScript files
const tsFiles = [];
function findTsFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      findTsFiles(filePath);
    } else if (file.endsWith('.ts')) {
      tsFiles.push(filePath);
    }
  }
}

findTsFiles('src');
console.log(`Found ${tsFiles.length} TypeScript files`);

tsFiles.forEach(processFile);
