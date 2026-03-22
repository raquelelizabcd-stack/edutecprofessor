export interface BnccCode {
    codigo: string;
    descricao: string;
}

export const bnccCodesList: BnccCode[] = [
    // Educação Infantil
    { codigo: 'EI01EO01', descricao: 'Perceber que suas ações têm efeitos nas outras crianças e nos adultos.' },
    { codigo: 'EI01EO02', descricao: 'Compreender a necessidade de regras no convívio social.' },
    { codigo: 'EI01EO03', descricao: 'Interagir com crianças da mesma faixa etária e adultos ao explorar espaços e materiais.' },
    { codigo: 'EI01EO04', descricao: 'Comunicar necessidades, desejos e emoções, utilizando gestos e palavras.' },
    { codigo: 'EI01CG01', descricao: 'Movimentar as partes do corpo para exprimir emoções, necessidades e desejos.' },
    { codigo: 'EI01CG02', descricao: 'Experimentar as possibilidades corporais nas brincadeiras e interações.' },
    { codigo: 'EI01CG03', descricao: 'Imitar gestos e movimentos de outras crianças e adultos.' },
    { codigo: 'EI01TS01', descricao: 'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.' },
    { codigo: 'EI01EF01', descricao: 'Reconhecer seu nome escrito.' },
    { codigo: 'EI01EF02', descricao: 'Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas.' },

    // Ensino Fundamental - Língua Portuguesa (Anos Iniciais)
    { codigo: 'EF01LP01', descricao: 'Reconhecer que textos são lidos e escritos da esquerda para a direita e de cima para baixo.' },
    { codigo: 'EF01LP04', descricao: 'Distinguir as letras do alfabeto de outros sinais gráficos.' },
    { codigo: 'EF01LP05', descricao: 'Reconhecer o sistema de escrita alfabética como representação dos sons da fala.' },
    { codigo: 'EF02LP01', descricao: 'Utilizar, ao produzir o texto, grafia correta de palavras conhecidas.' },
    { codigo: 'EF03LP01', descricao: 'Ler e escrever palavras com correspondências regulares contextuais entre grafemas e fonemas.' },

    // Ensino Fundamental - Matemática (Anos Iniciais)
    { codigo: 'EF01MA01', descricao: 'Utilizar números naturais como indicador de quantidade ou de ordem em diferentes situações cotidianas.' },
    { codigo: 'EF01MA06', descricao: 'Construir fatos básicos da adição e utilizá-los em procedimentos de cálculo para resolver problemas.' },
    { codigo: 'EF02MA01', descricao: 'Comparar e ordenar números naturais (até a ordem de centenas) pela compreensão de características do sistema.' },
    { codigo: 'EF03MA01', descricao: 'Ler, escrever e comparar números naturais de até a ordem de unidade de milhar.' },

    // Ensino Fundamental - Ciências, História, Geografia
    { codigo: 'EF01CI01', descricao: 'Comparar características de diferentes materiais presentes em objetos de uso cotidiano.' },
    { codigo: 'EF01HI01', descricao: 'Identificar as fases da vida (bebê, criança, jovem, adulto e idoso).' },
    { codigo: 'EF01GE01', descricao: 'Identificar características das moradias e dos espaços onde vive (família e escola).' },

    // Adicionando opções curingas
    { codigo: 'COMPETENCIA01', descricao: 'Competência Geral 1: Conhecimento' },
    { codigo: 'COMPETENCIA02', descricao: 'Competência Geral 2: Pensamento Científico, Crítico e Criativo' },
    { codigo: 'COMPETENCIA03', descricao: 'Competência Geral 3: Repertório Cultural' },
    { codigo: 'COMPETENCIA04', descricao: 'Competência Geral 4: Comunicação' },
    { codigo: 'COMPETENCIA05', descricao: 'Competência Geral 5: Cultura Digital' }
];
