"use client";

// Lista de receitas da página inicial, com busca por texto e filtro por
// categoria. Fica como Client Component de propósito: a busca filtra
// instantaneamente enquanto a pessoa digita, sem precisar recarregar a
// página a cada letra — como a família de receitas costuma ser pequena
// (dezenas, não milhares), filtrar tudo no navegador é rápido e simples,
// sem precisar de nenhuma consulta nova no banco.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Recipe } from "@/lib/db";
import { urlMiniatura } from "@/lib/photo-urls";
import { CATEGORIES } from "@/lib/constants";

// Tira acentos e deixa minúsculo, pra "acucar" encontrar "açúcar" e
// "PANQUECA" encontrar "panqueca" — sem isso a busca ficaria chata de
// usar no celular (onde é mais fácil digitar sem acento).
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);

  // Só mostra botão de categoria pra categoria que realmente tem
  // alguma receita — não faz sentido oferecer um filtro que sempre dá
  // em lista vazia.
  const categoriasPresentes = useMemo(() => {
    const presentes = new Set(recipes.map((recipe) => recipe.category));
    return CATEGORIES.filter((category) => presentes.has(category));
  }, [recipes]);

  const receitasFiltradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    return recipes.filter((recipe) => {
      if (categoriaAtiva && recipe.category !== categoriaAtiva) {
        return false;
      }
      if (!termo) {
        return true;
      }
      if (normalizar(recipe.title).includes(termo)) {
        return true;
      }
      // Busca também nos ingredientes — assim dá pra procurar por "o
      // que eu tenho em casa" (ex.: "frango"), não só pelo nome da
      // receita.
      return recipe.ingredients.some((ingrediente) =>
        normalizar(ingrediente).includes(termo)
      );
    });
  }, [recipes, busca, categoriaAtiva]);

  const temFiltroAtivo = busca.trim() !== "" || categoriaAtiva !== null;

  function limparFiltros() {
    setBusca("");
    setCategoriaAtiva(null);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-stone-800">
        Todas as receitas ({recipes.length})
      </h1>

      <div className="mb-4 space-y-3">
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por nome ou ingrediente..."
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />

        {categoriasPresentes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoriaAtiva(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                categoriaAtiva === null
                  ? "bg-amber-700 text-white"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              Todas
            </button>
            {categoriasPresentes.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoriaAtiva(category)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoriaAtiva === category
                    ? "bg-amber-700 text-white"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {temFiltroAtivo && (
        <p className="mb-3 text-sm text-stone-500">
          {receitasFiltradas.length} de {recipes.length} receita
          {recipes.length === 1 ? "" : "s"}
        </p>
      )}

      {receitasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-orange-300 bg-white p-8 text-center text-stone-600">
          <p>Nenhuma receita encontrada com esse filtro.</p>
          <button
            type="button"
            onClick={limparFiltros}
            className="mt-3 text-sm font-medium text-amber-800 hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {receitasFiltradas.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/receitas/${recipe.id}`}
                className="block h-full overflow-hidden rounded-lg border border-orange-200 bg-white shadow-sm transition hover:border-amber-400 hover:shadow-md"
              >
                {recipe.photoPath && (
                  <img
                    src={urlMiniatura(recipe.photoPath)}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {recipe.category}
                  </span>
                  <h2 className="text-lg font-semibold text-stone-800">
                    {recipe.title}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {recipe.servings} porções · por {recipe.authorName}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
