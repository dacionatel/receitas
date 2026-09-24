// lib/actions-ocr.ts
//
// Ação chamada pela tela de "colar texto" quando a pessoa envia uma ou
// mais fotos em vez de colar o texto. Às vezes uma receita não cabe
// numa foto só (ex: ingredientes numa página, modo de preparo na
// outra) — por isso aceita várias fotos de uma vez, lê cada uma com o
// OCR (lib/ocr.ts) e junta o texto reconhecido, na ordem em que foram
// enviadas, como se fosse um texto colado só. Se alguma foto falhar
// (borrada demais, arquivo inválido, etc.) mas outras derem certo,
// seguimos com o que deu certo e avisamos sobre a que falhou — não faz
// sentido jogar fora 2 fotos boas por causa de 1 ruim.
//
// Importante: quando NENHUMA foto dá certo, devolvemos isso como um
// valor normal (sucesso: false + mensagem), em vez de lançar uma
// exceção (throw). Descobrimos que o Next.js, em produção, esconde de
// propósito a mensagem de qualquer erro "lançado" de uma Server
// Action (por segurança, pra não vazar detalhes internos sem querer)
// e troca por um texto genérico em inglês — então a mensagem amigável
// em português nunca chegava até a pessoa. Devolvendo como dado
// normal, a mensagem sempre chega certinha. Ver
// node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md,
// seção "Handling expected errors".

"use server";

import { reconhecerTextoDaFoto, FotoOcrInvalidaError } from "./ocr";

export type ResultadoOcrFotos =
  | { sucesso: true; texto: string; avisos: string[] }
  | { sucesso: false; erro: string };

export async function reconhecerFotosAction(
  formData: FormData
): Promise<ResultadoOcrFotos> {
  const arquivos = formData
    .getAll("fotos")
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);

  if (arquivos.length === 0) {
    return { sucesso: false, erro: "Escolha ao menos uma foto antes de enviar." };
  }

  const textos: string[] = [];
  const avisos: string[] = [];

  // Sequencial (não Promise.all) de propósito: cada OCR já usa bastante
  // CPU sozinho, rodar várias fotos ao mesmo tempo só deixaria tudo mais
  // lento e usaria mais memória à toa num servidor pequeno.
  for (let i = 0; i < arquivos.length; i++) {
    try {
      const texto = await reconhecerTextoDaFoto(arquivos[i]);
      textos.push(texto);
    } catch (erro) {
      const mensagem =
        erro instanceof FotoOcrInvalidaError
          ? erro.message
          : "Não conseguimos processar essa imagem.";
      avisos.push(`Foto ${i + 1} de ${arquivos.length}: ${mensagem}`);
    }
  }

  if (textos.length === 0) {
    return {
      sucesso: false,
      erro:
        avisos.length === 1
          ? avisos[0]
          : "Não conseguimos reconhecer texto em nenhuma das fotos enviadas.",
    };
  }

  return {
    sucesso: true,
    texto: textos.join("\n\n"),
    avisos,
  };
}
