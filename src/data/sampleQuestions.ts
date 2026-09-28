import type { Question } from '../types';

export const sampleQuestions: Question[] = [
  {
    id: 'demo-1',
    disciplina: 'História do Maranhão',
    assunto: 'França Equinocial',
    subassunto: 'Fundação de São Luís',
    enunciado:
      'A cidade de São Luís foi fundada em 1612 por franceses, durante a presença da França Equinocial no Maranhão. A afirmação é:',
    respostaCorreta: 'ERRADO',
    comentario:
      'A cidade foi fundada oficialmente em 1612, mas a iniciativa foi da Companhia de Comércio do Maranhão e seus primeiros núcleos coloniais portugueses, não por franceses com base na França Equinocial.',
    fundamento:
      'A história da colonização do Maranhão envolve a tentativa francesa e, posteriormente, a presença portuguesa com a ocupação efetiva de São Luís.',
    pontoChave: 'São Luís foi fundada por portugueses em um contexto de disputa territorial.',
    dificuldade: 'média',
    fonte: 'Exemplo didático',
    tags: ['cronologia', 'capital', 'pegadinha'],
    isDemo: true,
  },
  {
    id: 'demo-2',
    disciplina: 'Informática',
    assunto: 'Segurança da Informação',
    subassunto: 'Malware',
    enunciado:
      'Um ransomware criptografa dados do usuário e exige pagamento para restauração, sendo um tipo de malware de ameaça direta à integridade e disponibilidade das informações.',
    respostaCorreta: 'CERTO',
    comentario:
      'A definição está correta: ransomware é software malicioso que bloqueia ou criptografa dados e exige resgate para devolução.',
    fundamento:
      'Malwares são classificados conforme ação e impacto; ransomware é um dos mais conhecidos pela ameaça à disponibilidade e integridade.',
    pontoChave: 'Ransomware bloqueia dados e exige pagamento para recuperação.',
    dificuldade: 'fácil',
    fonte: 'Exemplo didático',
    tags: ['segurança', 'malware'],
    isDemo: true,
  },
  {
    id: 'demo-3',
    disciplina: 'Língua Portuguesa',
    assunto: 'Interpretação de Texto',
    subassunto: 'Coerência',
    enunciado:
      'Em um texto, a coesão textual é suficiente para garantir a coerência da mensagem, independentemente do sentido pretendido pelo autor.',
    respostaCorreta: 'ERRADO',
    comentario:
      'Coesão e coerência não são sinônimos. A coesão diz respeito à ligação entre segmentos; a coerência refere-se ao sentido e à lógica do texto.',
    fundamento:
      'A coerência exige relação lógica e plausibilidade entre ideias e contexto, enquanto a coesão é a conexão linguística.',
    pontoChave: 'Texto pode ser coeso e, ainda assim, incoerente.',
    dificuldade: 'média',
    fonte: 'Exemplo didático',
    tags: ['interpretação', 'coesão'],
    isDemo: true,
  },
  {
    id: 'demo-4',
    disciplina: 'Raciocínio Lógico',
    assunto: 'Diagramas Lógicos',
    subassunto: 'Conjunção',
    enunciado:
      'Se todos os alunos da turma estudam e Maria é aluna da turma, então Maria estuda. Essa inferência é válida.',
    respostaCorreta: 'CERTO',
    comentario:
      'A regra é válida: se todo A é B e Maria pertence a A, então Maria pertence a B.',
    fundamento:
      'A lógica de predicados permite inferir que um elemento pertencente a um conjunto universal também pertence ao conjunto resultado da relação.',
    pontoChave: 'Todo membro de um conjunto que está em uma premissa universal herda a característica.',
    dificuldade: 'fácil',
    fonte: 'Exemplo didático',
    tags: ['lógica', 'inferência'],
    isDemo: true,
  },
  {
    id: 'demo-5',
    disciplina: 'Geografia do Brasil',
    assunto: 'Clima',
    subassunto: 'Zona Equatorial',
    enunciado:
      'O clima equatorial é caracterizado por altas temperaturas e chuvas bem distribuídas ao longo do ano durante a maior parte do território brasileiro.',
    respostaCorreta: 'CERTO',
    comentario:
      'O clima equatorial predominante na Amazônia apresenta elevada temperatura, elevada umidade e chuvas frequentes, embora o volume seja desigual em alguns períodos.',
    fundamento:
      'A localização geográfica e a massa de ar equatorial condicionam a intensa pluviosidade e a elevada temperatura.',
    pontoChave: 'Amazônia e equatorial têm alta umidade e chuvas frequentes.',
    dificuldade: 'fácil',
    fonte: 'Exemplo didático',
    tags: ['clima', 'amazônia'],
    isDemo: true,
  },
  {
    id: 'demo-6',
    disciplina: 'Lei Orgânica Nacional das PMs e CBMs',
    assunto: 'Estrutura',
    subassunto: 'Atuação administrativa',
    enunciado:
      'A responsabilidade pela administração dos órgãos de segurança pública, dentro do âmbito municipal, é atribuída exclusivamente ao Poder Executivo municipal.',
    respostaCorreta: 'ERRADO',
    comentario:
      'A organização da segurança pública envolve atribuições constitucionais e legais que não se limitam ao Poder Executivo, sobretudo quando se considera a atuação integrada entre União, Estados e Municípios.',
    fundamento:
      'A segurança pública é competência comum da União, Estados e Municípios, sob regime que envolve articulação e cooperação.',
    pontoChave: 'Não é exclusiva do Executivo municipal; a competência é comum e articulada.',
    dificuldade: 'difícil',
    fonte: 'Exemplo didático',
    tags: ['estrutura', 'competência'],
    isDemo: true,
  },
];
