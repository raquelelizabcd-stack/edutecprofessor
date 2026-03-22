export interface BnccSuggestion {
  codigo: string;
  atividades: {
    titulo: string;
    descricao: string;
    objetivo: string;
  }[];
}

export const bnccSuggestions: BnccSuggestion[] = [
  {
    codigo: 'EI01EO01',
    atividades: [
      {
        titulo: 'Espelho Mágico',
        descricao: 'Colocar o bebê em frente ao espelho e incentivar a exploração de sua própria imagem e movimentos.',
        objetivo: 'Perceber que suas ações têm efeitos nas outras pessoas e nos objetos.'
      },
      {
        titulo: 'Brincadeira de Esconder',
        descricao: 'Cobrindo o rosto com as mãos ou um paninho, estimulando a interação social e a permanência do objeto.',
        objetivo: 'Interagir com crianças da mesma faixa etária e adultos.'
      }
    ]
  },
  {
    codigo: 'EI02EO01',
    atividades: [
      {
        titulo: 'Roda de Conversa com Fotos',
        descricao: 'Trazer fotos da família e dos colegas para trabalhar a identidade e o reconhecimento do outro.',
        objetivo: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.'
      }
    ]
  },
  {
    codigo: 'EF01LP01',
    atividades: [
      {
        titulo: 'Caça ao Nome',
        descricao: 'Espalhar fichas com nomes pela sala e pedir que cada um encontre o seu.',
        objetivo: 'Reconhecer que textos são lidos e escritos da esquerda para a direita.'
      },
      {
        titulo: 'Leitura Compartilhada',
        descricao: 'Leitura de um livro de imagens acompanhando o texto com o dedo.',
        objetivo: 'Identificar a função social de textos que circulam em campos da vida cotidiana.'
      }
    ]
  },
  {
    codigo: 'EF03MA01',
    atividades: [
      {
        titulo: 'Mercadinho na Sala',
        descricao: 'Simular compras e vendas usando dinheiro de brinquedo para trabalhar numeração e operações.',
        objetivo: 'Ler, escrever e comparar números naturais de até a ordem de grandeza das centenas.'
      }
    ]
  }
];

export const getSuggestionByCode = (code: string) => {
  return bnccSuggestions.find(s => s.codigo === code);
};
