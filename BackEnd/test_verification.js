import User from './models/User.js';

console.log('--- User Model Verification ---');
const paths = Object.keys(User.schema.paths);
console.log('Found fields:', paths.filter(p => !p.startsWith('_')));

const requiredFields = ['username', 'email', 'password', 'role', 'failedAttempts', 'lockUntil'];
const missingFields = requiredFields.filter(f => !paths.includes(f));

if (missingFields.length === 0) {
  console.log('✅ All core English fields are present.');
} else {
  console.log('❌ Missing fields:', missingFields);
}

const rolePath = User.schema.paths.role;
if (rolePath && rolePath.options.ref === 'Role') {
  console.log('✅ Role field correctly references Role model.');
} else {
  console.log('❌ Role field is not a reference to Role.');
}

const recoveryTokenPath = User.schema.paths.recovery_token;
const recoveryExpiresPath = User.schema.paths.recovery_token_expires_at;

if (recoveryTokenPath && recoveryExpiresPath) {
  console.log('✅ Recovery fields are present.');
} else {
  console.log('❌ Recovery fields missing.');
}

process.exit(0);
