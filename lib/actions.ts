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
  updateRecipePhoto,
  deleteRecipe,
  getRecipe,
  type RecipeContentInput,
} from "./db";
import { getCurrentUser } from "./auth";
import {
  processarFoto,
  gravarArquivosFoto,
  removerArquivosFoto,
  FotoInvalidaError,
  type FotoProcessada,
} from "./photos";

// Processa a foto enviada (se houver) ANTES de mexer no banco — assim,
// se o arquivo for inválido, quem chama pode barrar a ação cedo, sem
// deixar a receita meio-criada/meio-editada.
async function processarFotoDoFormulario(
  formData: FormData
): Promise<FotoProcessada | null> {
  const arquivo = extrairFotoEnviada(formData);
  if (!arquivo) return null;
  try {
    return await processarFoto(arquivo);
  } catch (erro) {
    if (erro instanceof FotoInvalidaError) {
      throw new Error(erro.message);
    }
    throw erro;
  }
}

// O campo de foto no formulário é opcional -- se a pessoa não
// escolheu nada, o navegador ainda manda um File "vazio" (size 0),
// então tratamos isso como "nenhuma foto enviada".
function extrairFotoEnviada(formData: FormData): File | null {
  const valor = formData.get("photo");
  if (valor instanceof File && valor.size > 0) {
    return valor;
  }
  return null;
}

// Transforma um textarea (uma linha por item) numa lista de strings,
// já removendo linhas em branco e espaços extras.
function linesToList(value: FormDataEntryValue | null): string[] {
  return (value?.toString() ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formToRecipeContent(formData: FormData): RecipeContentInput {
  return {
    title: formData.get("title")?.toString().trim() ?? "",
    category: formData.get("category")?.toString().trim() || "Outros",
    servings: Number(formData.get("servings")) || 4,
    ingredients: linesToList(formData.get("ingredients")),
    steps: linesToList(formData.get("steps")),
    notes: formData.get("notes")?.toString().trim() || null,
  };
}

export async function createRecipeAction(formData: FormData) {
  // O proxy já bloqueia quem não está logado antes de chegar aqui, mas
  // Server Actions podem ser chamadas diretamente (por fora da UI),
  // então sempre conferimos de novo — nunca confie só na proteção da
  // tela. Ver "Server Actions" em node_modules/next/dist/docs/.../authentication.md.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }

  const input = formToRecipeContent(formData);

  if (!input.title || input.ingredients.length === 0 || input.steps.length === 0) {
    throw new Error(
      "Preencha pelo menos o título, os ingredientes e o modo de preparo."
    );
  }

  // Valida/redimensiona a foto (se houver) antes de criar a receita —
  // uma foto inválida não deve deixar uma receita pela metade.
  const fotoProcessada = await processarFotoDoFormulario(formData);

  const id = createRecipe(input, { id: user.id, name: user.displayName });

  if (fotoProcessada) {
    const photoPath = await gravarArquivosFoto(id, fotoProcessada);
    updateRecipePhoto(id, photoPath);
  }

  // Avisa o Next.js que a lista de receitas mudou, para a home
  // atualizar da próxima vez que alguém visitá-la.
  revalidatePath("/");
  redirect(`/receitas/${id}`);
}

export async function updateRecipeAction(id: number, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }

  const input = formToRecipeContent(formData);

  if (!input.title || input.ingredients.length === 0 || input.steps.length === 0) {
    throw new Error(
      "Preencha pelo menos o título, os ingredientes e o modo de preparo."
    );
  }

  const fotoProcessada = await processarFotoDoFormulario(formData);
  // Checkbox "remover foto" do formulário -- só faz sentido quando
  // nenhuma foto nova foi enviada junto (enviar uma foto nova já
  // substitui a anterior de qualquer jeito).
  const removerFotoSolicitado = formData.get("removerFoto") === "on";

  const receitaAtual = getRecipe(id);

  // Qualquer pessoa logada pode editar (combinado na Fase 2) — o
  // autor original não muda.
  updateRecipe(id, input);

  if (fotoProcessada) {
    const novoPath = await gravarArquivosFoto(id, fotoProcessada);
    updateRecipePhoto(id, novoPath);
    if (receitaAtual?.photoPath) {
      await removerArquivosFoto(receitaAtual.photoPath);
    }
  } else if (removerFotoSolicitado && receitaAtual?.photoPath) {
    await removerArquivosFoto(receitaAtual.photoPath);
    updateRecipePhoto(id, null);
  }

  revalidatePath("/");
  revalidatePath(`/receitas/${id}`);
  redirect(`/receitas/${id}`);
}

// Atalho usado na própria página de detalhes, pra adicionar ou trocar
// a foto de uma receita já existente sem precisar entrar no modo de
// edição inteiro — útil pra ir completando fotos aos poucos.
export async function updateRecipePhotoAction(id: number, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }

  const recipe = getRecipe(id);
  if (!recipe) {
    redirect("/");
  }

  const arquivo = extrairFotoEnviada(formData);
  if (!arquivo) {
    throw new Error("Escolha uma foto antes de enviar.");
  }

  let fotoProcessada: FotoProcessada;
  try {
    fotoProcessada = await processarFoto(arquivo);
  } catch (erro) {
    if (erro instanceof FotoInvalidaError) {
      throw new Error(erro.message);
    }
    throw erro;
  }

  const novoPath = await gravarArquivosFoto(id, fotoProcessada);
  updateRecipePhoto(id, novoPath);
  if (recipe.photoPath) {
    await removerArquivosFoto(recipe.photoPath);
  }

  revalidatePath("/");
  revalidatePath(`/receitas/${id}`);
  redirect(`/receitas/${id}`);
}

export async function removeRecipePhotoAction(id: number) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }

  const recipe = getRecipe(id);
  if (!recipe) {
    redirect("/");
  }

  if (recipe.photoPath) {
    await removerArquivosFoto(recipe.photoPath);
    updateRecipePhoto(id, null);
  }

  revalidatePath("/");
  revalidatePath(`/receitas/${id}`);
  redirect(`/receitas/${id}`);
}

export async function deleteRecipeAction(id: number) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }

  const recipe = getRecipe(id);
  if (!recipe) {
    redirect("/");
  }

  // Só quem cadastrou a receita pode excluir — combinado na Fase 2
  // pra evitar exclusão acidental da receita de outra pessoa.
  if (recipe.authorId !== user.id) {
    throw new Error("Só quem cadastrou esta receita pode excluí-la.");
  }

  if (recipe.photoPath) {
    await removerArquivosFoto(recipe.photoPath);
  }

  deleteRecipe(id);
  revalidatePath("/");
  redirect("/");
}
