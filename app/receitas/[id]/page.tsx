import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/db";
import {
  deleteRecipeAction,
  updateRecipePhotoAction,
  removeRecipePhotoAction,
} from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { urlFotoCheia } from "@/lib/photo-urls";

const fileInputClasses =
  "text-xs text-stone-500 file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200";

export const dynamic = "force-dynamic";

export default async function ReceitaDetalhePage(
  props: PageProps<"/receitas/[id]">
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

  const user = await getCurrentUser();
  const isAuthor = user?.id === recipe.authorId;

  return (
    <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      {recipe.photoPath ? (
        <div className="mb-4">
          <img
            src={urlFotoCheia(recipe.photoPath)}
            alt={recipe.title}
            className="max-h-80 w-full rounded-md object-cover"
          />
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <form
              action={updateRecipePhotoAction.bind(null, recipe.id)}
              className="flex items-center gap-2"
            >
              <input
                type="file"
                name="photo"
                accept="image/*"
                required
                className={fileInputClasses}
              />
              <button
                type="submit"
                className="font-medium text-stone-600 underline hover:no-underline"
              >
                Trocar
              </button>
            </form>
            <form action={removeRecipePhotoAction.bind(null, recipe.id)}>
              <button
                type="submit"
                className="font-medium text-red-600 underline hover:no-underline"
              >
                Remover foto
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form
          action={updateRecipePhotoAction.bind(null, recipe.id)}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-500"
        >
          <span>Sem foto ainda.</span>
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className={fileInputClasses}
          />
          <button
            type="submit"
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
          >
            Adicionar foto
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {recipe.category}
          </span>
          <h1 className="text-2xl font-semibold text-stone-800">
            {recipe.title}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {recipe.servings} porções · por {recipe.authorName}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/receitas/${recipe.id}/editar`}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Editar
          </Link>
          {isAuthor && (
            <form action={deleteRecipeAction.bind(null, recipe.id)}>
              <button
                type="submit"
                className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Excluir
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-800">
            Ingredientes
          </h2>
          <ul className="list-inside list-disc space-y-1 text-stone-700">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-800">
            Modo de preparo
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-stone-700">
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes && (
        <section className="mt-8 rounded-md bg-orange-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-stone-800">
            Notas e variações
          </h2>
          <p className="text-sm text-stone-700">{recipe.notes}</p>
        </section>
      )}

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-amber-800 hover:underline"
      >
        ← Voltar para todas as receitas
      </Link>
    </div>
  );
}
