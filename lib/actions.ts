// lib/actions.ts
//
// "Server Actions" são uma funcionalidade do Next.js: funções que
// rodam no servidor, mas que a gente pode chamar diretamente do
// formulário no navegador, sem precisar criar uma rota de API à
// parte (tipo /api/receitas). O `"use server"` no topo do arquivo
// avisa o Next.js disso.
//
// Cada função aqui recebe os dados de um <form> (via FormData),
// valida o mínimo necessário, chama a camada de banco (lib/db.ts)
// e depois redireciona o usuário para a página certa.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type RecipeInput,
} from "./db";

// Transforma um textarea (uma linha por item) numa lista de strings,
// já removendo linhas em branco e espaços extras.
function linesToList(value: FormDataEntryValue | null): string[] {
  return (value?.toString() ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formToRecipeInput(formData: FormData): RecipeInput {
  return {
    title: formData.get("title")?.toString().trim() ?? "",
    category: formData.get("category")?.toString().trim() || "Outros",
    servings: Number(formData.get("servings")) || 4,
    authorName: formData.get("authorName")?.toString().trim() || "Família",
    ingredients: linesToList(formData.get("ingredients")),
    steps: linesToList(formData.get("steps")),
    notes: formData.get("notes")?.toString().trim() || null,
  };
}

export async function createRecipeAction(formData: FormData) {
  const input = formToRecipeInput(formData);

  if (!input.title || input.ingredients.length === 0 || input.steps.length === 0) {
    throw new Error(
      "Preencha pelo menos o título, os ingredientes e o modo de preparo."
    );
  }

  const id = createRecipe(input);

  // Avisa o Next.js que a lista de receitas mudou, para a home
  // atualizar da próxima vez que alguém visitá-la.
  revalidatePath("/");
  redirect(`/receitas/${id}`);
}

export async function updateRecipeAction(id: number, formData: FormData) {
  const input = formToRecipeInput(formData);

  if (!input.title || input.ingredients.length === 0 || input.steps.length === 0) {
    throw new Error(
      "Preencha pelo menos o título, os ingredientes e o modo de preparo."
    );
  }

  updateRecipe(id, input);

  revalidatePath("/");
  revalidatePath(`/receitas/${id}`);
  redirect(`/receitas/${id}`);
}

export async function deleteRecipeAction(id: number) {
  deleteRecipe(id);
  revalidatePath("/");
  redirect("/");
}
