// app/fotos-receitas/[filename]/route.ts
//
// Serve as fotos das receitas lendo o arquivo do disco a cada pedido,
// em vez de depender da pasta "public" do Next.js.
//
// Motivo: nessa versão do Next.js, arquivos escritos em public/
// DEPOIS que o servidor (`npm run start`) já está rodando não ficam
// disponíveis até reiniciar o servidor — ele guarda em memória, desde
// a hora que sobe, quais arquivos existem lá. Como as fotos são
// enviadas pelas pessoas da família com o site já no ar, isso fazia a
// foto aparecer quebrada até alguém reiniciar o `npm run start`. Uma
// rota normal como esta não tem esse problema: ela sempre lê o estado
// atual da pasta em cada pedido.

import { readFile } from "node:fs/promises";
import path from "node:path";

const PASTA_FOTOS = path.join(process.cwd(), "data", "uploads", "receitas");

// Só o tipo que a gente de fato gera (ver lib/photos.ts) — qualquer
// outra extensão é recusada, então nem tentamos ler o disco.
const TIPOS_MIME: Record<string, string> = {
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: RouteContext<"/fotos-receitas/[filename]">
) {
  const { filename } = await params;

  // path.basename garante que não tem como pedir algo fora da pasta
  // de fotos (ex.: "../../../etc/passwd") — se o nome mudar depois de
  // passar por ele, é porque tinha uma barra ou coisa do tipo no meio.
  const nomeSeguro = path.basename(filename);
  const extensao = path.extname(nomeSeguro).toLowerCase();
  const tipoMime = TIPOS_MIME[extensao];

  if (nomeSeguro !== filename || !tipoMime) {
    return new Response("Não encontrado", { status: 404 });
  }

  try {
    const conteudo = await readFile(path.join(PASTA_FOTOS, nomeSeguro));
    return new Response(new Uint8Array(conteudo), {
      headers: {
        "Content-Type": tipoMime,
        // Cada foto tem um nome com timestamp e nunca muda de conteúdo
        // depois de criada — trocar a foto sempre gera um nome novo —
        // então dá pra deixar o navegador guardar em cache por bastante
        // tempo, sem risco de mostrar uma versão antiga da imagem.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
