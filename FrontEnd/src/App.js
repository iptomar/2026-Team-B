import React from 'react';
import Toolbox from './components/Toolbox';
import FormCanvas from './components/FormCanvas';
import styles from './styles/App.module.css';

function App() {
  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <h1>Instituto Politécnico de Tomar</h1>
      </header>

      <main className={styles.mainContent}>
        {/* Left Sidebar for UI Components */}
        <Toolbox />

        {/* Middle Canvas for Form Building */}
        <FormCanvas />
      </main>
    </div>
  );
}

export default App;
