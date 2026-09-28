# PMMA Estudos

Aplicativo responsivo de estudos para preparação do concurso PMMA/CEBRASPE com sistema inteligente de revisão espaçada.

## 🎯 Características

- ✅ **Dashboard inteligente** com resumo de desempenho e recomendações
- ✅ **Sistema de treino** com seleção de disciplina, assunto e quantidade
- ✅ **Questões CERTO/ERRADO** com feedback imediato e fundamentação
- ✅ **Caderno inteligente** com priorização automática
- ✅ **Revisão espaçada** com algoritmo de recomendação
- ✅ **Desempenho detalhado** por disciplina e período
- ✅ **Histórico completo** de respostas com análise temporal
- ✅ **Modo simulado** com cronômetro e distribuição de questões
- ✅ **Persistência local** com IndexedDB/localStorage
- ✅ **Import/export** de dados em JSON
- ✅ **Dark mode** com preferência salva
- ✅ **Responsivo** para computador, tablet e celular
- ✅ **Sem login** - funciona 100% local

## 🚀 Quick Start

### Instalação

```bash
# Clone o repositório
git clone https://github.com/nandpinheiro/pmma-concurso-estudos.git
cd pmma-concurso-estudos

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no seu navegador.

### Build para produção

```bash
npm run build
```

Os arquivos compilados estarão em `dist/`.

## 📋 Estrutura do Projeto

```
src/
├── components/       # Componentes React reutilizáveis
│   ├── StatCard.tsx
│   └── Layout.tsx
├── hooks/           # Hooks personalizados
│   └── useStudyApp.ts
├── storage/         # Serviço de persistência
│   └── storageService.ts
├── algorithms/      # Lógica de negócios
│   └── recommendation.ts
├── data/            # Dados e questões de exemplo
│   ├── sampleQuestions.ts
│   └── disciplines.ts
├── types.ts         # Tipos TypeScript
├── index.css        # Estilos globais com Tailwind
├── main.tsx         # Ponto de entrada
└── App.tsx          # Componente raiz
```

## 📚 Banco de Questões

### Formato de Questão

```typescript
interface Question {
  id: string;                    // ID único
  disciplina: string;            // Ex: "História do Maranhão"
  assunto: string;               // Ex: "França Equinocial"
  subassunto: string;            // Ex: "Fundação de São Luís"
  enunciado: string;             // Texto da questão
  respostaCorreta: 'CERTO' | 'ERRADO';
  comentario: string;            // Explicação da resposta
  fundamento: string;            // Base legal ou fonte
  pontoChave: string;            // Síntese para memorização
  dificuldade: 'fácil' | 'média' | 'difícil';
  fonte: string;                 // Origem da questão
  tags: string[];                // Palavras-chave
  isDemo?: boolean;              // Marca questões de exemplo
}
```

### Importar Questões

1. Vá para **Configurações** → **Importar dados**
2. Selecione um arquivo JSON com suas questões
3. Os dados serão mesclados com o banco local

**Exemplo de arquivo JSON:**

```json
{
  "questions": [
    {
      "id": "q-001",
      "disciplina": "Informática",
      "assunto": "Segurança",
      "subassunto": "Criptografia",
      "enunciado": "A criptografia é um método de proteger dados.",
      "respostaCorreta": "CERTO",
      "comentario": "Explicação detalhada aqui.",
      "fundamento": "Conceitos de segurança da informação.",
      "pontoChave": "Criptografia protege confidencialidade.",
      "dificuldade": "média",
      "fonte": "CEBRASPE",
      "tags": ["segurança", "criptografia"]
    }
  ],
  "attempts": [],
  "marks": {},
  "settings": {}
}
```

## 🔄 Sistema de Revisão

O app usa um algoritmo simples de revisão espaçada:

- **Nível 0**: Não vista
- **Nível 1**: Errou (revisar em 1 dia)
- **Nível 2**: Acertou após erro (revisar em 3 dias)
- **Nível 3**: Acertou novamente (revisar em 7 dias)
- **Nível 4**: Domínio (revisar em 15 dias)

O sistema sugere automaticamente o próximo treino baseado no histórico.

## 📊 Algoritmo de Prioridade

As disciplinas são priorizadas considerando:

- Percentual de acertos
- Quantidade de erros recentes
- Quantidade total de questões respondidas
- Tempo desde última revisão
- Dificuldade das questões

## 🛠️ Desenvolvimento

### Dependências

- React 18.3+
- TypeScript 5.6+
- Vite 5.4+
- Tailwind CSS 3.4+

### Scripts

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview do build
npm run preview
```

## 💾 Persistência de Dados

Todos os dados são salvos automaticamente no navegador:

- **localStorage**: Pequenas estruturas de dados
- **IndexedDB**: Volumes maiores (questões, histórico)

Os dados **não são enviados para nenhum servidor**. Tudo funciona offline.

## 📱 Responsividade

- **Desktop (>1024px)**: Sidebar lateral + navegação completa
- **Tablet (768px-1024px)**: Layout ajustado com barra inferior
- **Mobile (<768px)**: Navegação em abas na base, questão em fullscreen

## 🔐 Privacidade

- ✅ Sem login necessário
- ✅ Sem registro de usuários
- ✅ Sem coleta de dados pessoais
- ✅ Sem conexão com servidores
- ✅ Dados salvos apenas localmente

## 📄 Licença

Este projeto é de uso pessoal para estudos.

## 🤝 Contribuições

Contribuições são bem-vindas! Abra uma issue ou pull request.

---

**Desenvolvido com ❤️ para candidatos do concurso PMMA**
