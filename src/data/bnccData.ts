export interface BnccItem {
  codigo: string;
  objetivo: string;
}

export interface BnccStructure {
  BNCC: {
    EI: {
      [key: string]: {
        faixa: string;
        campos: {
          [key: string]: BnccItem[];
        };
      };
    };
    EF: {
      [key: string]: {
        bloco: string;
        componentes: {
          [key: string]: BnccItem[];
        };
      };
    };
  };
}

export const bnccData: BnccStructure = {
  "BNCC": {
    "EI": {
      "EI01": {
        "faixa": "Bebês (0-1a6m)",
        "campos": {
          "EO": [
            { "codigo": "EI01EO01", "objetivo": "Perceber que suas ações têm efeitos nas outras crianças." },
            { "codigo": "EI01EO02", "objetivo": "Compreender a necessidade de regras no convívio social." }
          ],
          "TS": [
            { "codigo": "EI01TS01", "objetivo": "Explorar sons produzidos com o corpo e objetos." }
          ],
          "EF": [
            { "codigo": "EI01EF01", "objetivo": "Reconhecer quando é chamado por seu nome e reconhecer os nomes de pessoas com quem convive." },
            { "codigo": "EI01EF02", "objetivo": "Demonstrar interesse ao ouvir a leitura de poemas e a apresentação de músicas." },
            { "codigo": "EI01EF03", "objetivo": "Demonstrar interesse ao ouvir histórias lidas ou contadas, observando ilustrações e os movimentos de leitura do adulto-leitor." }
          ]
        }
      },
      "EI02": {
        "faixa": "Crianças bem pequenas (1a7m-3a11m)",
        "campos": {
          "EF": [
            { "codigo": "EI02EF01", "objetivo": "Participar de situações de comunicação oral." },
            { "codigo": "EI02EF02", "objetivo": "Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos." },
            { "codigo": "EI02EF03", "objetivo": "Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos." }
          ]
        }
      },
      "EI03": {
        "faixa": "Crianças pequenas (4a–5a11m)",
        "campos": {
          "ET": [
            { "codigo": "EI03ET01", "objetivo": "Explorar noções de tempo e espaço em brincadeiras." }
          ],
          "EF": [
            { "codigo": "EI03EF01", "objetivo": "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita." },
            { "codigo": "EI03EF02", "objetivo": "Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos." },
            { "codigo": "EI03EF03", "objetivo": "Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas." }
          ]
        }
      }
    },
    "EF": {
      "EF11": {
        "bloco": "1º e 2º anos",
        "componentes": {
          "LP": [
            { "codigo": "EF11LP01", "objetivo": "Reconhecer letras e sons em palavras." },
            { "codigo": "EF11LP02", "objetivo": "Produzir pequenos textos orais e escritos." }
          ],
          "MA": [
            { "codigo": "EF11MA01", "objetivo": "Resolver problemas simples de adição e subtração." }
          ]
        }
      },
      "EF35": {
        "bloco": "3º ao 5º anos",
        "componentes": {
          "CI": [
            { "codigo": "EF35CI01", "objetivo": "Identificar características dos seres vivos." }
          ],
          "LP - Campo da Vida Cotidiana": [
            { "codigo": "EF03LP11", "objetivo": "Ler e compreender, com autonomia, textos injuntivos instrucionais, com a estrutura própria desses textos." },
            { "codigo": "EF04LP09", "objetivo": "Ler e compreender, com autonomia, boletos, faturas e carnês." },
            { "codigo": "EF05LP09", "objetivo": "Ler e compreender, com autonomia, textos instrucionais de regras de jogo, entre outros." },
            { "codigo": "EF03LP12", "objetivo": "Ler e compreender, com autonomia, cartas pessoais e diários." },
            { "codigo": "EF04LP10", "objetivo": "Ler e compreender, com autonomia, cartas pessoais de reclamação, reivindicação e outras." },
            { "codigo": "EF05LP10", "objetivo": "Ler e compreender, com autonomia, anedotas, piadas e cartuns." },
            { "codigo": "EF03LP13", "objetivo": "Planejar e produzir textos injuntivos instrucionais." },
            { "codigo": "EF04LP11", "objetivo": "Planejar e produzir, com autonomia, cartas pessoais." },
            { "codigo": "EF05LP11", "objetivo": "Registrar, com autonomia, anedotas, piadas e cartuns." },
            { "codigo": "EF03LP14", "objetivo": "Planejar e produzir cartas pessoais e diários." },
            { "codigo": "EF05LP12", "objetivo": "Planejar e produzir, com autonomia, textos instrucionais de regras de jogo, entre outros." },
            { "codigo": "EF03LP15", "objetivo": "Assistir, em vídeo digital, a programa de culinária infantil." },
            { "codigo": "EF04LP12", "objetivo": "Assistir, em vídeo digital, a programa infantil com instruções de montagem, de jogos e brincadeiras." },
            { "codigo": "EF05LP13", "objetivo": "Assistir, em vídeo digital, a postagem de vlog infantil de críticas e apresentar." },
            { "codigo": "EF03LP16", "objetivo": "Identificar e reproduzir, em textos injuntivos instrucionais, a formatação própria desses textos." },
            { "codigo": "EF04LP13", "objetivo": "Identificar e reproduzir, em cartas pessoais, a formatação própria desses textos." },
            { "codigo": "EF05LP14", "objetivo": "Identificar e reproduzir, em anedotas, piadas e cartuns, a formatação própria desses textos." },
            { "codigo": "EF03LP17", "objetivo": "Identificar e reproduzir, em relatos de experiências diários e cartas pessoais, a formatação." }
          ],
          "LP - Campo da Vida Pública": [
            { "codigo": "EF03LP18", "objetivo": "Ler e compreender, com autonomia, cartas dirigidas a veículos da mídia impressa ou digital." },
            { "codigo": "EF04LP14", "objetivo": "Identificar, em notícias, fatos, participantes, local e momento/tempo." },
            { "codigo": "EF05LP15", "objetivo": "Ler e compreender notícias, reportagens, vídeos e outros formatos no campo da vida pública." },
            { "codigo": "EF03LP19", "objetivo": "Identificar a função de gêneros que se prestam à informação e de gêneros da mídia." },
            { "codigo": "EF04LP15", "objetivo": "Distinguir fatos de opiniões e/ou sugestões em textos." },
            { "codigo": "EF05LP16", "objetivo": "Comparar informações sobre um mesmo fato presentes em diferentes veículos de comunicação." },
            { "codigo": "EF03LP20", "objetivo": "Produzir textos argumentativos ou de opinião como cartas do leitor." },
            { "codigo": "EF04LP16", "objetivo": "Produzir notícias sobre fatos ocorridos no universo escolar." },
            { "codigo": "EF05LP17", "objetivo": "Produzir, com ferramentas virtuais (ou em papel), folhetos e manifestos." },
            { "codigo": "EF03LP21", "objetivo": "Produzir anúncios publicitários ou campanhas de conscientização relativos à escola ou à comunidade." },
            { "codigo": "EF35LP15", "objetivo": "Opinar e defender ponto de vista sobre tema polêmico relacionado a situações vivenciadas." },
            { "codigo": "EF03LP22", "objetivo": "Planejar e apresentar, de forma oral, informações sobre temas relevantes envolvendo fatos ou campanhas." },
            { "codigo": "EF04LP17", "objetivo": "Produzir, em grupos, jornais radiofônicos ou televisivos sobre fatos da escola e comunidade." },
            { "codigo": "EF05LP18", "objetivo": "Roteirizar, produzir e editar, em vídeo, um programa jornalístico curto." },
            { "codigo": "EF05LP19", "objetivo": "Roteirizar, produzir e editar texto e áudio para programa sobre cultura voltado para o grupo." },
            { "codigo": "EF35LP16", "objetivo": "Selecionar matérias e construir mural ou jornal em que circulem informações." },
            { "codigo": "EF03LP23", "objetivo": "Analisar as formas e o formato da carta, identificando seus componentes." },
            { "codigo": "EF05LP20", "objetivo": "Analisar as características de um debate e organizar espaços para discussões de ideias." },
            { "codigo": "EF04LP18", "objetivo": "Analisar a formatação e as partes de uma notícia veiculada por jornal." },
            { "codigo": "EF05LP21", "objetivo": "Analisar e elaborar campanhas de conscientização em formato audiovisual ou impresso." }
          ],
          "LP - Campo das Práticas de Estudo e Pesquisa": [
            { "codigo": "EF03LP24", "objetivo": "Ler e compreender, com autonomia, textos expositivos de divulgação científica para crianças." },
            { "codigo": "EF04LP19", "objetivo": "Ler e compreender, com autonomia, textos expositivos de divulgação científica para crianças e verbetes de enciclopédia infantil." },
            { "codigo": "EF05LP22", "objetivo": "Ler e compreender, com autonomia, textos de divulgação científica e verbetes, identificando tema e informações acessórias." },
            { "codigo": "EF04LP20", "objetivo": "Resumir fatos da escola ou da comunidade para noticiar de forma oral e escrita." },
            { "codigo": "EF05LP23", "objetivo": "Comparar as partes e a linguagem em textos de divulgação em mais de uma fonte." },
            { "codigo": "EF35LP17", "objetivo": "Buscar e selecionar, com o auxílio do professor, informações de interesse sobre fenômenos sociais e naturais, em textos." },
            { "codigo": "EF03LP25", "objetivo": "Planejar e produzir textos para apresentar resultados de observações e pesquisas em fontes de informações." },
            { "codigo": "EF04LP21", "objetivo": "Planejar e produzir textos sobre temas de interesse para apresentar publicamente com imagens, quadros e tabelas." },
            { "codigo": "EF05LP24", "objetivo": "Planejar e produzir texto sobre tema de interesse para expor em murais ou de forma eletrônica." },
            { "codigo": "EF04LP22", "objetivo": "Planejar e expor oralmente resultados de pesquisa com uso de material de apoio e roteiro." },
            { "codigo": "EF05LP25", "objetivo": "Planejar e apresentar, de modo oral, resultados e conclusões de pesquisas, com ou sem apoio de recursos visuais." }
          ],
          "LP - Análise linguística/semiótica": [
            { "codigo": "EF03LP04", "objetivo": "Usar acento gráfico (agudo ou circunflexo) em monossílabos tônicos terminados em a, e, o e em palavras oxítonas terminadas em a, e, o." },
            { "codigo": "EF04LP04", "objetivo": "Usar acento gráfico em paroxítonas terminadas em i(s), l, r, ão(s)." },
            { "codigo": "EF05LP03", "objetivo": "Acentuar corretamente proparoxítonas." },
            { "codigo": "EF03LP05", "objetivo": "Identificar o número de sílabas de palavras, classificando-as em monossílabas, dissílabas, trissílabas e polissílabas." },
            { "codigo": "EF03LP06", "objetivo": "Identificar a sílaba tônica em palavras, classificando-as em oxítonas, paroxítonas e proparoxítonas." },
            { "codigo": "EF03LP07", "objetivo": "Identificar a função na leitura e usar adequadamente, na escrita, os sinais de pontuação e divisão silábica." },
            { "codigo": "EF04LP05", "objetivo": "Identificar a função de diferentes sinais de pontuação (ponto-final, interrogação, exclamação e reticências)." },
            { "codigo": "EF05LP04", "objetivo": "Diferenciar, na leitura e escrita, palavras construídas por sufixação." },
            { "codigo": "EF05LP05", "objetivo": "Identificar a formação de palavras com uso de prefixos e sufixos." },
            { "codigo": "EF03LP08", "objetivo": "Identificar e diferenciar substantivos e verbos e suas flexões (número, gênero, tempo e pessoa)." },
            { "codigo": "EF04LP06", "objetivo": "Identificar, no texto lido ou lendo-o adequadamente, a concordância verbal entre o verbo e o sujeito." },
            { "codigo": "EF05LP06", "objetivo": "Flexionar as palavras durante a escrita em adequação às normas de concordância." },
            { "codigo": "EF03LP09", "objetivo": "Identificar o uso de pronomes pessoais para substituir substantivos e evitar repetições desnecessárias no texto." },
            { "codigo": "EF04LP07", "objetivo": "Identificar, nos textos a coesão pronominal, o uso de pronomes anafóricos e de concordância." },
            { "codigo": "EF35LP14", "objetivo": "Reconhecer a organização apropriada e o sentido na coesão durante a leitura ou fala." },
            { "codigo": "EF05LP07", "objetivo": "Utilizar e analisar em textos lidos ou ouvidos a importância dos verbos nas construções de frases ou períodos." },
            { "codigo": "EF03LP10", "objetivo": "Reconhecer prefixos e sufixos em palavras para compreender seu significado na elaboração." },
            { "codigo": "EF04LP08", "objetivo": "Construir e compreender o sentido em expressões denotativas de modo/tempo." },
            { "codigo": "EF05LP08", "objetivo": "Diferenciar as conjunções e seu uso nas orações e sentidos para o texto adequadamente." }
          ]
        }
      },
      "EF67": {
        "bloco": "6º e 7º anos",
        "componentes": {
          "HI": [
            { "codigo": "EF67HI01", "objetivo": "Compreender processos históricos locais e globais." }
          ]
        }
      },
      "EF89": {
        "bloco": "8º e 9º anos",
        "componentes": {
          "GE": [
            { "codigo": "EF89GE01", "objetivo": "Analisar transformações socioespaciais no Brasil." }
          ]
        }
      }
    }
  }
};
