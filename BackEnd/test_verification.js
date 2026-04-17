import User from './models/User.js';

console.log('--- Verificação do Modelo User ---');
const paths = Object.keys(User.schema.paths);
console.log('Campos encontrados:', paths.filter(p => p.startsWith('recoveryToken')));

const recoveryTokenPath = User.schema.paths.recoveryToken;
const recoveryExpiresPath = User.schema.paths.recoveryTokenExpiresAt;

if (recoveryTokenPath && recoveryExpiresPath) {
  console.log('✅ Campos de recuperação adicionados com sucesso.');
  
  const index = recoveryTokenPath._index;
  if (index) {
    console.log('✅ recoveryToken indexado.');
    console.log('   - Único:', index.unique ? 'Sim' : 'Não');
    console.log('   - Esparso (sparse):', index.sparse ? 'Sim' : 'Não');
  } else {
    console.log('❌ recoveryToken NÃO está indexado.');
  }

  if (recoveryExpiresPath.instance === 'Date') {
    console.log('✅ recoveryTokenExpiresAt é do tipo Date.');
  }
} else {
  console.log('❌ Falha ao encontrar os novos campos.');
}

process.exit(0);
