import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O tesseract.js (OCR de fotos de receita, ver lib/ocr.ts) carrega um
  // "worker" internamente a partir de um caminho de arquivo calculado em
  // tempo de execução. Se o Next.js tentar empacotar esse pacote junto
  // com o resto do código do servidor (como faz por padrão), esse
  // caminho fica errado e o worker não é encontrado. Isso avisa o
  // Next.js pra usar o `require` normal do Node nesse pacote, sem
  // empacotar — o mesmo motivo pelo qual `sharp` (fotos) já funciona
  // sem precisar dessa configuração: ele já vem nessa lista por padrão.
  serverExternalPackages: ["tesseract.js", "@tesseract.js-data/por"],
};

export default nextConfig;
