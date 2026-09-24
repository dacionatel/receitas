import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions-auth";

export const metadata: Metadata = {
  title: "Receitas da Família",
  description: "O livro de receitas da nossa família, online.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-orange-50 text-stone-800">
        <header className="border-b border-orange-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-xl font-semibold text-amber-800">
              🍲 Receitas da Família
            </Link>

            {user && (
              <div className="flex items-center gap-3">
                <Link
                  href="/receitas/nova"
                  className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
                >
                  + Nova receita
                </Link>
                <span className="hidden text-sm text-stone-600 sm:inline">
                  Olá, {user.displayName}
                </span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-sm text-stone-500 hover:text-stone-800 hover:underline"
                  >
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
