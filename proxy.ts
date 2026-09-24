// proxy.ts
//
// Isso roda antes de qualquer página, pra decidir se deixa a pessoa
// passar ou redireciona ela. Em versões antigas do Next.js (e em
// bastante material por aí) esse arquivo se chama "middleware.ts" —
// no Next.js 16 ele foi renomeado pra "proxy.ts", mas funciona igual.
//
// Como aqui rodamos em Node.js (não no "Edge"), dá pra consultar o
// SQLite direto, sem truques extras.

import { NextRequest, NextResponse } from "next/server";
import { findUserBySessionToken } from "@/lib/db";

// Páginas que só fazem sentido pra quem AINDA NÃO está logado.
const publicOnlyPaths = ["/entrar", "/criar-conta"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("session")?.value;
  const user = token ? findUserBySessionToken(token) : null;
  const isPublicOnlyPath = publicOnlyPaths.includes(pathname);

  // Não logado tentando ver uma página protegida (ex: a lista de
  // receitas) -> manda pro login.
  if (!user && !isPublicOnlyPath) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  // Já logado tentando ver a tela de login/cadastro -> manda pra home,
  // não faz sentido logar de novo.
  if (user && isPublicOnlyPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// O proxy não precisa rodar pra arquivos internos do Next.js (estáticos,
// imagens otimizadas) — só pras páginas de verdade.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
