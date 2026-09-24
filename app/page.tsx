import Link from "next/link";
import { listRecipes } from "@/lib/db";
import { RecipeList } from "@/components/recipe-list";

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

  return <RecipeList recipes={recipes} />;
}
