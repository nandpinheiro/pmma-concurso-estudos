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
- ✅ **Modo simulado** com cronômetro, navegação, respostas em branco e pontuação líquida CEBRASPE
- ✅ **Persistência local** em IndexedDB, com migração do estado legado
- ✅ **Importação validada** e exportação versionada de backup, questões, histórico e progresso
- ✅ **PWA** com manifesto e cache offline dos recursos já carregados
- ✅ **Testes unitários** para revisão, prioridade, recomendação, seleção, desempenho, CEBRASPE e armazenamento
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
│   ├── reviewAlgorithm.ts
│   ├── priorityAlgorithm.ts
│   ├── recommendation.ts
│   ├── questionSelectionAlgorithm.ts
│   ├── performanceAlgorithm.ts
│   ├── cebraspeAlgorithm.ts
│   └── notebookAlgorithm.ts
├── services/        # Importação, exportação e validação
│   └── importExportService.ts
├── data/            # Dados e questões de exemplo
│   ├── sampleQuestions.ts
│   └── disciplines.ts
├── types.ts         # Tipos TypeScript
├── index.css        # Estilos globais com Tailwind
├── main.tsx         # Ponto de entrada
└── App.tsx          # Componente raiz

public/
├── manifest.webmanifest
├── sw.js
└── icon.svg
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
  active?: boolean;              // false desativa a questão
  pegadinha?: string;            // Observação opcional
  year?: number;
  organization?: string;
  isDemo?: boolean;              // Marca questões de exemplo
}
```

### Importar Questões

1. Vá para **Configurações** → **Importar**
2. Selecione um JSON com uma lista de questões ou um objeto com `questions`
3. Questões são validadas e mescladas por ID; duplicatas e inválidas aparecem no relatório
4. Um backup completo restaura questões, tentativas, marcas e configurações

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

## Revisão Adaptativa

O agendamento deriva os níveis do histórico de tentativas:

- **Nível 0**: Não vista
- **Nível 1**: Erro (revisar em 1 dia)
- **Nível 2**: Acerto após erro (3 dias)
- **Nível 3**: Primeiro domínio (7 dias)
- **Nível 4**: Domínio consolidado (15 dias)
- **Nível 5**: Domínio forte (30 dias)

O nível e a próxima revisão são derivados do histórico. A prioridade por assunto combina desempenho, erros recentes e recorrentes, revisões vencidas, tendência, dificuldade e questões não vistas. A confiança cresce com o tamanho da amostra; uma resposta isolada não basta para indicar domínio.

Treinos excluem questões respondidas nas últimas 24 horas e informam quando não há conteúdo suficiente para completar a quantidade pedida. O modo de revisão seleciona apenas itens vencidos.

## 📊 Algoritmo de Prioridade

Pontuação de 0 a 100, com pesos declarados em `priorityAlgorithm.ts`:

- 25%: fraqueza de desempenho
- 20%: erros recentes
- 20%: erros recorrentes
- 15%: revisões vencidas
- 10%: tendência recente
- 5%: dificuldade
- 5%: questões não vistas

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

# Testes unitários
npm test
```

## Armazenamento e Backup

O app salva localmente no navegador, sem enviar dados para servidores:

- **IndexedDB**: questões, tentativas, marcas e configurações em object stores separados
- O estado existente no `localStorage` é migrado na primeira abertura; em navegadores sem IndexedDB, há fallback local

Em **Configurações**, é possível exportar questões, histórico, progresso derivado ou backup completo. Para transferir o estado para outro computador, use **Backup completo** e importe o JSON no outro navegador.

O service worker é registrado em builds de produção. A disponibilidade offline depende de abrir o app online ao menos uma vez e de o navegador manter o cache; o modo de desenvolvimento não registra o service worker.

## Testes

Execute `npm test`. Os testes cobrem os intervalos de revisão, amostra pequena, erro recorrente, prioridade que muda com novas respostas, seleção sem repetição, janelas de desempenho, cálculo CEBRASPE, validação de importação e persistência IndexedDB em memória.

## Limitações atuais

- A hidratação ainda carrega questões e tentativas no estado React; IndexedDB tem índices, mas não há paginação/consultas por demanda para bancos de 10 mil ou mais itens.
- O modo simulado não tem distribuição por assunto/dificuldade, pausa ou resumo por assunto; a penalidade é configurável e o relatório apresenta desempenho por disciplina.
- O desempenho recente cobre as janelas de 10, 20, 30, 50, 100 e histórico; gráficos temporais de 7/30/90 dias não foram implementados.
- Preferência de tema oferece claro/escuro, sem opção “sistema”.
- Os dados de exemplo são demonstrativos e marcados como fictícios; não incluem questões oficiais.

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
