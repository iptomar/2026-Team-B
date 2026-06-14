const fs = require('fs');
const path = require('path');
/**
 * List of FrontEnd files that need to be updated.
 * These files contain direct localStorage calls that should be replaced
 * with the centralized storage utility functions.
 */
const filesToUpdate = [
	'src/pages/AdminBugReports.js',
	'src/pages/Dashboard.js',
	'src/pages/SubmissionView.js',
	'src/pages/Settings.js',
	'src/pages/PendingReviews.js',
	'src/pages/BugReport.js',
	'src/pages/FillForm.js',
	'src/pages/AdminBugReportDetail.js',
	'src/components/FormBuilder.jsx',
	'src/pages/MySubmissions.js'
];

/**
 * Migration script to replace direct localStorage calls with centralized storage utility functions.
 * 
 * WHAT IT DOES
 * ────────────
 * 1. Finds direct localStorage.getItem() calls in specific FrontEnd files
 * 2. Replaces them with getStorageItem() from the storage utility
 * 3. Automatically adds the necessary import statements
 * 4. Calculates correct relative import paths based on file depth
 * 
 * WHY THIS MIGRATION IS NEEDED
 * ────────────────────────────
 * The application previously used direct localStorage access scattered throughout components.
 * This was refactored to use a centralized storage utility module for:
 *   - Consistent error handling
 *   - Centralized key management
 *   - Easier migration to different storage mechanisms (e.g., sessionStorage, AsyncStorage)
 *   - Better testability (can mock the utility)
 *   - Type safety (if using TypeScript)
 * 
 * BEFORE MIGRATION (Direct localStorage)
 * * ──────────────────────────────────────
 * const token = localStorage.getItem('accessToken');
 * const user = localStorage.getItem('user');
 * 
 * AFTER MIGRATION (Centralized utility)
 * ─────────────────────────────────────
 * import { getStorageItem } from '../utils/storage';
 * const token = getStorageItem('accessToken');
 * const user = getStorageItem('user');
 */
filesToUpdate.forEach(file => {
	const fullPath = path.join(__dirname, 'FrontEnd', file);
	if (!fs.existsSync(fullPath)) return;

	let content = fs.readFileSync(fullPath, 'utf8');
	let hasChanges = false;

	if (content.includes("localStorage.getItem('accessToken')") || content.includes('localStorage.getItem("accessToken")')) {
		content = content.replace(/localStorage\.getItem\(['"]accessToken['"]\)/g, "getStorageItem('accessToken')");
		hasChanges = true;
	}
	if (content.includes("localStorage.getItem('user')") || content.includes('localStorage.getItem("user")')) {
		content = content.replace(/localStorage\.getItem\(['"]user['"]\)/g, "getStorageItem('user')");
		hasChanges = true;
	}

	if (hasChanges) {
// Calculate how many levels deep the file is to determine correct relative path
		// Example:
		//   src/pages/Dashboard.js → depth = 2 → import from '../../utils/storage'
		//   src/components/FormBuilder.jsx → depth = 2 → import from '../../utils/storage'
		//   src/App.js (not in list) would be depth = 1 → import from './utils/storage'		const depth = file.split('/').length - 1;
		const relativePath = depth === 2 ? '../../utils/storage' : '../utils/storage';

		// Add import
		if (!content.includes('getStorageItem')) {
			// Find last import
			const lines = content.split('\n');
			let lastImportIndex = 0;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].startsWith('import ')) {
					lastImportIndex = i;
				}
			}
			lines.splice(lastImportIndex + 1, 0, `import { getStorageItem } from '${relativePath}';`);
			content = lines.join('\n');
		}

		fs.writeFileSync(fullPath, content);
		console.log(`Updated ${file}`);
	}
});
