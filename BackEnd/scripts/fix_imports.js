const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const srcDir = path.join(__dirname, 'FrontEnd', 'src');

walkDir(srcDir, function(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it uses getStorageItem but doesn't import it
    if (content.includes('getStorageItem(') && !content.includes("import { getStorageItem }") && !content.includes('import { setStorageItem, getStorageItem, removeStorageItem }')) {
        
        // Calculate relative path
        const relativeToSrc = path.relative(srcDir, filePath);
        const depth = relativeToSrc.split(path.sep).length - 1;
        let importPath = '../utils/storage';
        if (depth === 0) importPath = './utils/storage';
        else if (depth === 2) importPath = '../../utils/storage';
        else if (depth === 3) importPath = '../../../utils/storage';
        
        let importStmt = `import { getStorageItem } from '${importPath}';`;
        
        // Insert after the last import statement
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, importStmt);
            fs.writeFileSync(filePath, lines.join('\n'));
            console.log(`Fixed import in ${filePath}`);
        }
    }
});
