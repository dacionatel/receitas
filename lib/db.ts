// lib/db.ts
//
// Esta é a nossa camada de acesso ao banco de dados.
//
// Em vez de usar um ORM (como Prisma), estamos usando o módulo nativo
// `node:sqlite`, que já vem embutido no Node.js 22+. A vantagem para
// quem está aprendendo: não tem "mágica" escondida — cada função aqui
// executa SQL de verdade, então dá pra ver exatamente o que acontece
// no banco.
//
// O banco fica salvo em um arquivo (data/receitas.db). Isso significa
// que os dados persistem entre reinicializações do servidor.

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

// Guardamos a instância do banco numa variável global durante o
// desenvolvimento para o Next.js não abrir uma conexão nova a cada
// "hot reload" do servidor.
const globalForDb = globalThis as unknown as { db?: DatabaseSync };

const dbPath = path.join(process.cwd(), "data", "receitas.db");

export const db = globalForDb.db ?? new DatabaseSync(dbPath);

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Cria a tabela de receitas caso ainda não exista. Isso roda toda vez
// que o servidor sobe — é seguro rodar de novo, "IF NOT EXISTS" evita
// erro se a tabela já estiver lá.
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Outros',
    servings INTEGER NOT NULL DEFAULT 4,
    author_name TEXT NOT NULL DEFAULT 'Família',
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// --- Tipos ---
//
// No banco, `ingredients` e `steps` são guardados como texto (cada
// item em uma linha). Aqui na aplicação, a gente trabalha com eles
// como listas (arrays), que é bem mais fácil de manipular e exibir.

export type Recipe = {
  id: number;
  title: string;
  category: string;
  servings: number;
  authorName: string;
  ingredients: string[];
  steps: string[];
  notes: string | null;
  createdAt: string;
};

// Formato "cru" como vem do banco (linha da tabela SQL).
type RecipeRow = {
  id: number;
  title: string;
  category: string;
  servings: number;
  author_name: string;
  ingredients: string;
  steps: string;
  notes: string | null;
  created_at: string;
};

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    servings: row.servings,
    authorName: row.author_name,
    ingredients: row.ingredients.split("\n").filter((line) => line.trim() !== ""),
    steps: row.steps.split("\n").filter((line) => line.trim() !== ""),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export type RecipeInput = {
  title: string;
  category: string;
  servings: number;
  authorName: string;
  ingredients: string[];
  steps: string[];
  notes?: string | null;
};

// --- Operações CRUD ---

export function listRecipes(): Recipe[] {
  const rows = db
    .prepare("SELECT * FROM recipes ORDER BY created_at DESC")
    .all() as unknown as RecipeRow[];
  return rows.map(rowToRecipe);
}

export function getRecipe(id: number): Recipe | null {
  const row = db
    .prepare("SELECT * FROM recipes WHERE id = ?")
    .get(id) as unknown as RecipeRow | undefined;
  return row ? rowToRecipe(row) : null;
}

export function createRecipe(input: RecipeInput): number {
  const result = db
    .prepare(
      `INSERT INTO recipes (title, category, servings, author_name, ingredients, steps, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.category,
      input.servings,
      input.authorName,
      input.ingredients.join("\n"),
      input.steps.join("\n"),
      input.notes ?? null
    );
  return Number(result.lastInsertRowid);
}

export function updateRecipe(id: number, input: RecipeInput): void {
  db.prepare(
    `UPDATE recipes
     SET title = ?, category = ?, servings = ?, author_name = ?, ingredients = ?, steps = ?, notes = ?
     WHERE id = ?`
  ).run(
    input.title,
    input.category,
    input.servings,
    input.authorName,
    input.ingredients.join("\n"),
    input.steps.join("\n"),
    input.notes ?? null,
    id
  );
}

export function deleteRecipe(id: number): void {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}
