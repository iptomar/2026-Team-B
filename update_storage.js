const fs = require('fs');
const path = require('path');

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
        // Find how many levels deep we are to import storage correctly
        const depth = file.split('/').length - 1;
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
