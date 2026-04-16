import User from './models/User.js';

console.log('--- Verificação do Modelo User ---');
const paths = Object.keys(User.schema.paths);
console.log('Campos encontrados:', paths.filter(p => p.startsWith('recovery_')));

const recoveryTokenPath = User.schema.paths.recovery_token;
const recoveryExpiresPath = User.schema.paths.recovery_token_expires_at;

if (recoveryTokenPath && recoveryExpiresPath) {
  console.log('✅ Campos de recuperação adicionados com sucesso.');
  
  const index = recoveryTokenPath._index;
  if (index) {
    console.log('✅ recovery_token indexado.');
    console.log('   - Único:', index.unique ? 'Sim' : 'Não');
    console.log('   - Esparso (sparse):', index.sparse ? 'Sim' : 'Não');
  } else {
    console.log('❌ recovery_token NÃO está indexado.');
  }

  if (recoveryExpiresPath.instance === 'Date') {
    console.log('✅ recovery_token_expires_at é do tipo Date.');
  }
} else {
  console.log('❌ Falha ao encontrar os novos campos.');
}

process.exit(0);
