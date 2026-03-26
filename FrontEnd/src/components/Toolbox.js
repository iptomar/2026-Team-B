import React from 'react';
import styles from '../styles/Toolbox.module.css';

const toolboxItems = [
  { id: '1', type: 'text', label: 'Campo de Texto' },
  { id: '2', type: 'checkbox', label: 'Caixa de Seleção' },
  { id: '3', type: 'dropdown', label: 'Menu Suspenso' },
  { id: '4', type: 'date', label: 'Seletor de Data' }
];

const Toolbox = () => {
  return (
    <aside className={styles.toolboxSidebar}>
      <h2 className={styles.title}>Componentes</h2>
      <p className={styles.subtitle}>Arraste para adicionar</p>

      <div className={styles.componentsList}>
        {toolboxItems.map((item) => (
          <div key={item.id} className={styles.draggableItem}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* TODO: implementar drag-and-drop */}
    </aside>
  );
};

export default Toolbox;
