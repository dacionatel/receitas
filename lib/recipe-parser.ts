// lib/recipe-parser.ts
//
// Aqui vive a parte "burra" (mas útil!) da importação de receitas:
// pegar um texto solto — colado de um site, de um Word, de uma
// mensagem de família — e tentar separar sozinho em título,
// ingredientes, modo de preparo e porções, usando só palavras-chave
// comuns em receitas. Não tem nenhuma inteligência artificial aqui,
// só procura por pistas de formatação (tipo a linha "Ingredientes:").
//
// Isso fica de propósito isolado numa função só, com uma entrada
// (texto solto) e uma saída (os campos já separados). Se um dia
// quisermos trocar essas regras por uma IA de verdade — que realmente
// entende o texto em vez de só procurar palavras-chave — só essa
// função (ou quem a chama, em lib/actions-import.ts) precisa mudar; o
// resto do app nem percebe a diferença.

import type { RecipeContentInput } from "./db";
import { CATEGORIES } from "./constants";

const INGREDIENTES_MARCADORES = ["ingredientes", "ingrediente"];

const PREPARO_MARCADORES = [
  "modo de preparo",
  "modo de preparar",
  "modo de fazer",
  "como preparar",
  "como fazer",
  "preparacao",
  "preparo",
  "instrucoes",
  "instructions",
];

const NOTAS_MARCADORES = [
  "notas",
  "dicas",
  "observacoes",
  "variacoes",
];

// Tira acentos e deixa minúsculo, só pra facilitar a comparação —
// assim "Instruções", "instrucoes" e "INSTRUÇÕES" contam como iguais.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Recebe a linha JÁ sem marcador de lista (ver limparMarcadorDeLista) —
// senão "* Ingredientes:" (comum quando o texto vem com marcação tipo
// markdown) nunca bateria com "ingredientes", já que sobraria o "* "
// na frente.
function linhaEhMarcador(linha: string, marcadores: string[]): boolean {
  const linhaNormalizada = normalizar(linha).replace(/[:.\-]/g, "").trim();
  return marcadores.some((marcador) => linhaNormalizada === marcador);
}

// Remove marcadores de lista comuns ("- ", "* ", "1. ", "•") do
// início da linha — o formulário já cuida da própria formatação.
function limparMarcadorDeLista(linha: string): string {
  return linha.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "");
}

// Textos copiados de sites (ou de buscadores com IA, que costumam
// citar a fonte) trazem links no meio das frases, tipo
// "...a gosto. [[1](https://site.com/pagina)]" — isso não tem nada a
// ver com o preparo da receita em si, então tiramos antes de separar
// o texto em seções.
function removerLinksECitacoes(linha: string): string {
  return linha
    // link em formato markdown "[texto](https://...)", incluindo
    // quando vem "dobrado" como citação: "[[1](https://...)]"
    .replace(/\[[^\]]*\]\(https?:\/\/[^)]+\)/g, "")
    // colchetes que sobraram vazios depois da limpeza acima
    .replace(/\[\s*\]/g, "")
    // qualquer link solto que não estava em formato markdown
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extrairPorcoes(texto: string): number | null {
  const normalizado = normalizar(texto);
  const padroes = [
    /(\d+)\s*porc\w*/, // "4 porções" / "4 porcoes" / "4 porcao"
    // Nos três a seguir, tolera até 15 caracteres entre a palavra e o
    // número (":", "para", "entre", "até") — cobre casos como "rende
    // entre 10 e 15 panquecas" (nesse caso, fica com o primeiro
    // número, 10).
    /porc\w*[^\d]{0,15}(\d+)/, // "porções: 4" / "porções para 4 pessoas"
    /serve\s*[^\d]{0,15}(\d+)/, // "serve 4" / "serve até 6"
    /rende\s*[^\d]{0,15}(\d+)/, // "rende 4" / "rende entre 10 e 15"
  ];
  for (const padrao of padroes) {
    const match = normalizado.match(padrao);
    if (match) {
      const numero = Number(match[1]);
      if (Number.isInteger(numero) && numero > 0) return numero;
    }
  }
  return null;
}

type Secao = "titulo" | "ingredientes" | "preparo" | "notas";

export type ResultadoAnalise = {
  dados: RecipeContentInput;
  // Avisa a tela de conferência se a separação foi "confiante" (achou
  // os marcadores de Ingredientes E Modo de preparo) ou se é só um
  // chute — nesse caso a pessoa deve revisar com mais atenção.
  confiante: boolean;
  // Se o texto não mencionava porções em nenhum formato conhecido,
  // dados.servings vem preenchido com um valor padrão (4) só porque o
  // formulário exige um número ali — isso NÃO foi extraído do texto,
  // então a tela de conferência precisa avisar em vez de deixar
  // parecer um dado de verdade.
  porcoesEncontradas: boolean;
};

export function parseRecipeText(textoOriginal: string): ResultadoAnalise {
  const linhas = textoOriginal
    .split("\n")
    .map((linha) => removerLinksECitacoes(linha.trim()));

  const ingredientes: string[] = [];
  const preparo: string[] = [];
  const notas: string[] = [];
  // Texto encontrado depois do título mas antes de qualquer marcador
  // reconhecido — normalmente é uma frase de efeito ou descrição do
  // prato (ex: "Pronto em 15 minutos..."), não uma instrução de
  // preparo. Só decidimos para onde ela vai no final, depois de saber
  // se achamos marcadores de verdade no resto do texto.
  const preambulo: string[] = [];
  let titulo = "";

  let secaoAtual: Secao = "titulo";
  let achouIngredientes = false;
  let achouPreparo = false;

  for (const linha of linhas) {
    if (linha === "") continue;

    // Marcadores de seção às vezes vêm com marcador de lista na
    // frente (ex: "* Ingredientes:") quando o texto foi copiado de um
    // site ou de um resumo gerado por IA — por isso comparamos com o
    // marcador de lista já removido.
    const linhaSemMarcadorDeLista = limparMarcadorDeLista(linha);

    if (linhaEhMarcador(linhaSemMarcadorDeLista, INGREDIENTES_MARCADORES)) {
      secaoAtual = "ingredientes";
      achouIngredientes = true;
      continue;
    }
    if (linhaEhMarcador(linhaSemMarcadorDeLista, PREPARO_MARCADORES)) {
      secaoAtual = "preparo";
      achouPreparo = true;
      continue;
    }
    if (linhaEhMarcador(linhaSemMarcadorDeLista, NOTAS_MARCADORES)) {
      secaoAtual = "notas";
      continue;
    }

    if (secaoAtual === "titulo" && titulo === "") {
      titulo = linha;
      continue;
    }

    switch (secaoAtual) {
      case "ingredientes":
        ingredientes.push(linhaSemMarcadorDeLista);
        break;
      case "preparo":
        preparo.push(linhaSemMarcadorDeLista);
        break;
      case "notas":
        notas.push(linha);
        break;
      default:
        preambulo.push(linha);
    }
  }

  // Se algum marcador foi reconhecido, o preâmbulo é descrição do
  // prato — vai para as notas. Se nenhum marcador apareceu em todo o
  // texto (um texto bem bagunçado, sem nenhuma seção clara), mantemos
  // o comportamento antigo: melhor esse texto cair no modo de
  // preparo, pra pessoa organizar, do que a gente simplesmente perder
  // essa informação.
  const achouAlgumMarcador = achouIngredientes || achouPreparo;
  const notasFinais = achouAlgumMarcador ? [...preambulo, ...notas] : notas;
  const preparoFinal = achouAlgumMarcador
    ? preparo
    : [...preambulo, ...preparo];

  const porcoes = extrairPorcoes(textoOriginal);

  return {
    dados: {
      title: titulo || "Receita sem título",
      category: CATEGORIES[0],
      servings: porcoes ?? 4,
      ingredients: ingredientes,
      steps: preparoFinal,
      notes: notasFinais.length > 0 ? notasFinais.join("\n") : null,
    },
    confiante: achouIngredientes && achouPreparo,
    porcoesEncontradas: porcoes !== null,
  };
}
