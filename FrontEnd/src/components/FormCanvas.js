import React from 'react';
import styles from '../styles/FormCanvas.module.css';

const FormCanvas = () => {
  return (
    <section className={styles.canvasArea}>
      <div className={styles.documentPaper}>
        <div className={styles.emptyState}>
          <h3>Arraste componentes para aqui</h3>
          <p>Comece a construir o seu formulário</p>
        </div>

        {/* TODO: Renderizar componentes */}
        {/* TODO: Manusear eventos de drop e gerir o estado do formulário */}
      </div>
    </section>
  );
};

export default FormCanvas;
