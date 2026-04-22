import User from './models/User.js';
import RecoveryToken from './models/RecoveryToken.js';

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
