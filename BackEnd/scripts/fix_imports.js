const fs = require('fs');
const path = require('path');

/**
 * Recursively walks through a directory and executes a callback for each file.
 * 
 * @param dir - Directory path to traverse
 * @param callback - Function to execute for each file found
 */
function walkDir(dir, callback) {
	fs.readdirSync(dir).forEach(f => {
		let dirPath = path.join(dir, f);
		let isDirectory = fs.statSync(dirPath).isDirectory();
		if (isDirectory) {
						// Recursively traverse subdirectories

			walkDir(dirPath, callback);
		} else {
						// Process the file

			callback(dirPath);
		}
	});
}
// Target directory: FrontEnd source code

const srcDir = path.join(__dirname, 'FrontEnd', 'src');
/**
 * Migration script to automatically add missing import statements for `getStorageItem`
 * in FrontEnd JavaScript/JSX files.
 * 
 * USE CASE: 
 * After refactoring the storage utility module, some files started using `getStorageItem()`
 * but didn't have the corresponding import statement. This script automatically adds
 * the missing import to prevent runtime errors like "getStorageItem is not defined".
 * 
 * PROBLEM SOLVED:
 * - During code refactoring, developers might forget to add imports for newly used functions
 * - The script automatically detects usage of `getStorageItem()` and adds the import if missing
 * - Calculates the correct relative path based on file depth in the directory structure
 */
walkDir(srcDir, function (filePath) {
		// Only process JavaScript and JSX files

	if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
	// Read the file content

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
