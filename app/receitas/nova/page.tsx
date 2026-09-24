import Link from "next/link";
import { RecipeForm } from "@/components/recipe-form";
import { createRecipeAction } from "@/lib/actions";

export default function NovaReceitaPage() {
  return (
    <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-stone-800">
          Nova receita
        </h1>
        <Link
          href="/receitas/colar-texto"
          className="text-sm text-amber-700 underline hover:no-underline"
        >
          Prefiro colar o texto de uma receita pronta
        </Link>
      </div>
      <RecipeForm
        action={createRecipeAction}
        submitLabel="Salvar receita"
        draftKey="nova"
      />
    </div>
  );
}
