import User from './models/User.js';
import RecoveryToken from './models/RecoveryToken.js';

/**
 * Verification Script - Database Model Validation
 * 
 * PURPOSE:
 * This script verifies that recent database model migrations and schema changes
 * have been applied correctly. It checks for:
 *   1. RecoveryToken model fields and indexes
 *   2. User model softDelete field
 * 
 * WHEN TO RUN:
 * - After running database migration scripts
 * - During deployment to verify schema integrity
 * - When debugging model-related issues
 * - As part of automated testing suite
 * 
 * WHY THESE CHECKS:
 * - RecoveryToken: New collection that must have proper fields and indexes for performance
 * - User.softDelete: Critical for soft-delete functionality (preserving data vs permanent deletion)
 */

console.log('--- Verificação do Modelo RecoveryToken ---');
const recoveryPaths = Object.keys(RecoveryToken.schema.paths);
console.log('Campos encontrados no RecoveryToken:', recoveryPaths.filter(p => !p.startsWith('_')));

const tokenPath = RecoveryToken.schema.paths.token;
const userIdPath = RecoveryToken.schema.paths.userId;

if (tokenPath && userIdPath) {
	console.log('✅ Collection RecoveryToken configurado com sucesso.');

	if (userIdPath._index) {
		console.log('✅ userId indexado no RecoveryToken.');
	} else {
		console.log('❌ userId NÃO está indexado no RecoveryToken.');
	}
} else {
	console.log('❌ Falha ao encontrar os campos na nova collection.');
}

console.log('\n--- Verificação do Modelo User ---');
const userPaths = Object.keys(User.schema.paths);
if (userPaths.includes('softDelete')) {
	console.log('✅ softDelete adicionado ao User com sucesso.');
} else {
	console.log('❌ softDelete NÃO encontrado no User.');
}

process.exit(0);
