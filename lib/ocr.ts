// lib/ocr.ts
//
// Reconhecimento de texto (OCR) em fotos de receita, usando Tesseract.js
// rodando localmente no servidor — sem mandar a imagem pra nenhuma API
// paga. Os dados de idioma (português) ficam empacotados como
// dependência do projeto (@tesseract.js-data/por) e são lidos direto do
// disco, em vez de baixados de um CDN externo a cada uso — assim
// funciona de forma confiável mesmo com rede restrita, e não depende de
// nenhum serviço de terceiros ficar no ar (só precisa do `npm install`).
//
// O texto reconhecido aqui NÃO é interpretado como receita ainda — ele
// só alimenta o mesmo campo de "colar texto" (ver
// app/receitas/colar-texto/page.tsx), que já sabe separar isso em
// título/ingredientes/modo de preparo através de lib/recipe-parser.ts.
// Reaproveitar aquele fluxo evita duplicar toda a lógica de revisão.

import Tesseract from "tesseract.js";
import path from "node:path";
import sharp from "sharp";

// Aponta pro caminho que o próprio pacote @tesseract.js-data/por expõe
// como padrão (ver node_modules/@tesseract.js-data/por/index.js).
// Importante: pegamos isso importando o pacote (um .js normal) em vez
// de usar require.resolve() direto no arquivo .traineddata.gz — se
// apontarmos pro .gz diretamente, o Turbopack tenta entender esse
// arquivo como se fosse mais um módulo pra empacotar e quebra o build
// ("Unknown module type"), já que não sabe o que fazer com um .gz.
// Assim, o caminho do .gz é só uma string calculada em tempo de
// execução — o Tesseract lê esse arquivo do disco sozinho, ele nunca
// passa pelo bundler.
const DADOS_IDIOMA_PORTUGUES = (
  require("@tesseract.js-data/por") as { langPath: string }
).langPath;

// Mesmo limite usado pras fotos de receita (ver lib/photos.ts) — não
// tem motivo pra ser diferente aqui.
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB

export class FotoOcrInvalidaError extends Error {}

// Reconhece o texto de UMA foto. Quem precisa juntar várias fotos (ver
// lib/actions-ocr.ts) chama essa função várias vezes.
export async function reconhecerTextoDaFoto(file: File): Promise<string> {
  if (file.size === 0) {
    throw new FotoOcrInvalidaError("Arquivo vazio.");
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    throw new FotoOcrInvalidaError(
      "Essa imagem é grande demais (máximo de 15 MB)."
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Confere ANTES se isso é mesmo uma imagem de verdade, usando o
  // sharp (mesma biblioteca já usada em lib/photos.ts) — ele lida bem
  // com arquivo inválido/corrompido, só rejeita a Promise. Já o
  // decodificador de imagem do Tesseract.js, quando recebe algo que
  // não consegue abrir, em vez de só rejeitar a Promise, derruba o
  // processo com uma exceção que escapa do try/catch abaixo (erro que
  // já vimos nos logs: "pixReadStream: Unknown format"). Validando
  // com o sharp primeiro, nunca chegamos a passar um arquivo inválido
  // pro Tesseract.
  try {
    await sharp(bytes).metadata();
  } catch {
    throw new FotoOcrInvalidaError(
      "Não conseguimos processar essa imagem — tente outro arquivo (JPEG, PNG ou WEBP)."
    );
  }

  let resultado;
  try {
    resultado = await Tesseract.recognize(bytes, "por", {
      langPath: DADOS_IDIOMA_PORTUGUES,
      gzip: true,
      cachePath: path.join(process.cwd(), "data", "ocr-cache"),
      logger: () => {},
    });
  } catch {
    // Arquivo que não é uma imagem de verdade (apesar da extensão), ou
    // corrompido — o Tesseract não consegue nem decodificar.
    throw new FotoOcrInvalidaError(
      "Não conseguimos processar essa imagem — tente outro arquivo (JPEG, PNG ou WEBP)."
    );
  }

  const texto = resultado.data.text.trim();
  if (!texto) {
    throw new FotoOcrInvalidaError(
      "Não conseguimos reconhecer nenhum texto nessa foto — tente uma imagem mais nítida, bem iluminada, sem cortar as bordas do texto."
    );
  }
  return texto;
}
