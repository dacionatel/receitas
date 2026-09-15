import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/db";
import { updateRecipeAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function EditarReceitaPage(
  props: PageProps<"/receitas/[id]/editar">
) {
  const { id } = await props.params;
  const recipeId = Number(id);

  if (!Number.isInteger(recipeId)) {
    notFound();
  }

  const recipe = getRecipe(recipeId);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">
        Editar receita
      </h1>
      <RecipeForm
        action={updateRecipeAction.bind(null, recipe.id)}
        defaultValues={recipe}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
