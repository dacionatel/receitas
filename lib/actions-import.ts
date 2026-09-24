// lib/actions-import.ts
//
// Esta função existe separada de lib/recipe-parser.ts de propósito:
// ela é o "encaixe" que a tela de colar texto chama para organizar a
// receita. Hoje ela só repassa pras regras simples (sem IA), mas por
// já rodar no servidor ("use server"), no futuro dá pra trocar o
// miolo dela por uma chamada de verdade à API da Anthropic — que
// precisa rodar no servidor, com uma chave secreta — sem que quem
// chama esta função precise mudar nada.

"use server";

import { parseRecipeText, type ResultadoAnalise } from "./recipe-parser";

export async function organizarTextoAction(
  textoColado: string
): Promise<ResultadoAnalise> {
  return parseRecipeText(textoColado);
}
