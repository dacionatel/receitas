import { RecipeForm } from "@/components/recipe-form";
import { createRecipeAction } from "@/lib/actions";

export default function NovaReceitaPage() {
  return (
    <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">
        Nova receita
      </h1>
      <RecipeForm action={createRecipeAction} submitLabel="Salvar receita" />
    </div>
  );
}
