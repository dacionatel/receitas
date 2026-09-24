// lib/photos.ts
//
// Tudo relacionado a guardar/apagar a foto de uma receita no disco
// fica isolado aqui de propósito — o resto do app só conhece o
// "caminho" da foto (uma string guardada em recipes.photo_path), não
// precisa saber como ou onde o arquivo é salvo por baixo dos panos.
//
// A foto em si NÃO fica no banco de dados (isso deixaria o banco
// gigante e lento) — fica em data/uploads/receitas/, e é servida por
// uma rota própria do app (ver app/fotos-receitas/[filename]/route.ts)
// em vez da pasta public/. Descobrimos na prática que essa versão do
// Next.js guarda em memória, no momento em que o servidor sobe, quais
// arquivos existem em public/ — uma foto enviada com o site já no ar
// não aparecia até reiniciar o `npm run start`. Lendo do disco a cada
// pedido (via rota normal) esse problema não existe. Por isso
// "photo_path" guarda só o caminho relativo a partir de
// data/uploads/receitas, por exemplo "12-1737000000000.webp".
//
// Cada foto salva vira DOIS arquivos: um tamanho "cheio" (pra página
// de detalhes) e uma miniatura já cortada num formato mais quadrado
// (pra lista de receitas, onde carregar a foto inteira de cada card
// seria desperdício de dados no celular). Os dois sempre nascem e
// morrem juntos — ver caminhoMiniatura() abaixo.

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { caminhoMiniatura, urlFotoCheia, urlMiniatura } from "./photo-urls";

export { caminhoMiniatura, urlFotoCheia, urlMiniatura };

const PASTA_UPLOADS = path.join(process.cwd(), "data", "uploads", "receitas");

const LARGURA_MAXIMA_FOTO = 1400;
const LARGURA_MINIATURA = 400;
const ALTURA_MINIATURA = 300;

// Limite generoso, mas alguma coisa precisa existir — sem isso, uma
// foto gigante (ex: um arquivo RAW enviado por engano) tentaria ser
// processada inteira antes de darmos qualquer satisfação pra pessoa.
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB

export class FotoInvalidaError extends Error {}

export type FotoProcessada = {
  fotoCheia: Buffer;
  miniatura: Buffer;
};

// Passo 1: recebe o File que veio de um <input type="file">, valida e
// redimensiona (gera a foto cheia + a miniatura), tudo em memória —
// de propósito SEM tocar no disco ou no banco ainda. Fazemos assim
// para poder validar a foto antes de criar/alterar a receita: se o
// arquivo for inválido, a pessoa vê o erro sem a gente ter escrito
// nada pela metade.
export async function processarFoto(file: File): Promise<FotoProcessada> {
  if (file.size === 0) {
    throw new FotoInvalidaError("Arquivo vazio.");
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    throw new FotoInvalidaError(
      "Essa imagem é grande demais (máximo de 15 MB)."
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const imagem = sharp(bytes).rotate(); // .rotate() sem argumento corrige a orientação (fotos de celular vêm com metadado de rotação)
    const fotoCheia = await imagem
      .clone()
      .resize({
        width: LARGURA_MAXIMA_FOTO,
        height: LARGURA_MAXIMA_FOTO,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const miniatura = await imagem
      .clone()
      .resize({
        width: LARGURA_MINIATURA,
        height: ALTURA_MINIATURA,
        fit: "cover",
      })
      .webp({ quality: 78 })
      .toBuffer();
    return { fotoCheia, miniatura };
  } catch {
    // Formato que o sharp não conseguiu abrir (arquivo corrompido, ou
    // algo que não é imagem de verdade apesar da extensão).
    throw new FotoInvalidaError(
      "Não conseguimos processar essa imagem — tente outro arquivo (JPEG, PNG ou WEBP)."
    );
  }
}

// Passo 2: já com a receita criada/confirmada (e o id em mãos), grava
// os dois arquivos no disco e devolve o "photo_path" pra guardar em
// recipes.photo_path. Não mexe na foto anterior — isso é
// responsabilidade de quem chama (ver lib/actions.ts), já que só
// depois de gravar o arquivo novo é seguro apagar o antigo.
export async function gravarArquivosFoto(
  recipeId: number,
  { fotoCheia, miniatura }: FotoProcessada
): Promise<string> {
  const nomeBase = `${recipeId}-${Date.now()}.webp`;

  await mkdir(PASTA_UPLOADS, { recursive: true });
  await writeFile(path.join(PASTA_UPLOADS, nomeBase), fotoCheia);
  await writeFile(path.join(PASTA_UPLOADS, caminhoMiniatura(nomeBase)), miniatura);

  return nomeBase;
}

// Apaga os dois arquivos (foto cheia + miniatura) do disco. Chamada
// ao trocar/remover a foto de uma receita, e ao excluir a receita
// inteira. Erros de "arquivo não existe" são ignorados de propósito
// — o objetivo é só garantir que não sobra lixo no disco, não é grave
// se o arquivo já não estava lá por algum motivo.
export async function removerArquivosFoto(photoPath: string): Promise<void> {
  const arquivos = [photoPath, caminhoMiniatura(photoPath)];
  await Promise.all(
    arquivos.map(async (nome) => {
      try {
        await unlink(path.join(PASTA_UPLOADS, nome));
      } catch {
        // Já não existia -- sem problema.
      }
    })
  );
}
