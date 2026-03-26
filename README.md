# Construtor de Formulários - IPT

Este projeto é um **Construtor de Formulários** personalizado (tipo *drag-and-drop*) desenvolvido especificamente para os professores e funcionários do **Instituto Politécnico de Tomar (IPT)**.

> **Nota de Estado Atual:** Atualmente, o projeto encontra-se na sua fase inicial (scaffolding). A interface de utilizador (UI) visual base foi construída, no entanto, é puramente estática. Funcionalidades de arrastar e soltar (*drag-and-drop*), lógica de formulários e integração com a base de dados ainda não estão implementadas.

---

## 📂 Estrutura do Projeto

O repositório está dividido em duas partes principais:

- `/FrontEnd` - Contém a aplicação Web construída em React.
- `/BackEnd` - Contém a API e o servidor desenvolvido em Node.js com Express (com preparação para integração com MongoDB através de Mongoose).

## 🛠️ Pré-requisitos

Para correres este projeto na tua máquina local, necessitas de ter o seguinte software instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- `npm` (geralmente instalado com o Node.js) ou `yarn`.

## ⚙️ Passos de Instalação

Abre o teu terminal na raiz deste repositório e executa os seguintes comandos para instalar as dependências de cada um dos módulos (FrontEnd e BackEnd):

**Opção 1: Usando o comando configurado na raiz**
Podes instalar todas as dependências de uma só vez (na raiz, FrontEnd e BackEnd) correndo na pasta principal do projeto:
```bash
npm run install:all
```

**Opção 2: Instalação manual passo a passo**
```bash
# Instalar dependências do Frontend
cd FrontEnd
npm install
cd ..

# Instalar dependências do Backend
cd BackEnd
npm install
cd ..
```

## 🚀 Iniciar a Aplicação

Para iniciar o servidor de desenvolvimento (que irá correr tanto o **FrontEnd** na porta 3000 como o **BackEnd** na porta 5000 em simultâneo), corre o seguinte comando a partir da pasta **raiz** do projeto:

```bash
npm run dev
```

### Em Terminais Separados (Alternativa)

Se preferires correr os ambientes em terminais separados, podes fazê-lo da seguinte forma:

**Terminal 1 (BackEnd):**
```bash
cd BackEnd
npm run dev
```

**Terminal 2 (FrontEnd):**
```bash
cd FrontEnd
npm run dev
```