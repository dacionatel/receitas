import Link from "next/link";
import { listRecipes } from "@/lib/db";

// Sem isso, o Next.js poderia tentar gerar esta página uma única vez em
// "build" e servir sempre o mesmo resultado. Como as receitas mudam o
// tempo todo (é um livro vivo!), forçamos renderização a cada acesso.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const recipes = listRecipes();

  if (recipes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-orange-300 bg-white p-10 text-center">
        <p className="text-lg text-stone-600">
          Ainda não tem nenhuma receita cadastrada.
        </p>
        <Link
          href="/receitas/nova"
          className="mt-4 inline-block rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Cadastrar a primeira receita
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">
        Todas as receitas ({recipes.length})
      </h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <Link
              href={`/receitas/${recipe.id}`}
              className="block h-full rounded-lg border border-orange-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md"
            >
              <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {recipe.category}
              </span>
              <h2 className="text-lg font-semibold text-stone-800">
                {recipe.title}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {recipe.servings} porções · por {recipe.authorName}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
