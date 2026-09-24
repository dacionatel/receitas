// lib/photo-urls.ts
//
// Funções puras (sem nenhuma dependência de servidor, tipo `sharp` ou
// sistema de arquivos) para montar as URLs públicas de uma foto de
// receita a partir do "photo_path" guardado no banco. Ficam separadas
// de lib/photos.ts de propósito: aquele arquivo só pode rodar no
// servidor, mas este aqui também precisa ser importado por Client
// Components (pra montar o <img src=...> de pré-visualização).

// A miniatura sempre mora ao lado da foto cheia, com "-thumb" antes da
// extensão — ver lib/photos.ts para onde os dois arquivos são criados.
export function caminhoMiniatura(photoPath: string): string {
  return photoPath.replace(/(\.\w+)$/, "-thumb$1");
}

// Servidas por app/fotos-receitas/[filename]/route.ts, que lê o
// arquivo do disco a cada pedido — não pela pasta public/ (ver o
// comentário no topo de lib/photos.ts sobre por que evitamos isso).
export function urlFotoCheia(photoPath: string): string {
  return `/fotos-receitas/${photoPath}`;
}

export function urlMiniatura(photoPath: string): string {
  return `/fotos-receitas/${caminhoMiniatura(photoPath)}`;
}
