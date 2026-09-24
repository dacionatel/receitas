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

// O `next build` roda a coleta de dados das páginas em vários processos
// (workers) ao mesmo tempo, e cada um deles abre esse mesmo arquivo de
// banco. Por padrão, se dois processos tentam escrever ao mesmo tempo,
// o SQLite falha na hora com "database is locked" em vez de esperar.
// Esse PRAGMA faz ele esperar até 5s pelo lock liberar antes de desistir.
db.exec("PRAGMA busy_timeout = 5000");

// Cria as tabelas caso ainda não existam. Isso roda toda vez que o
// servidor sobe — é seguro rodar de novo, "IF NOT EXISTS" evita erro
// se a tabela já estiver lá.
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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  )
`);

// --- Migrações simples: colunas que a tabela recipes ganhou depois de
// já existir. SQLite não tem "ADD COLUMN IF NOT EXISTS", então checamos
// manualmente via PRAGMA antes de tentar adicionar.
//
// O try/catch dentro da função é para o caso (raro, mas real — ver o
// PRAGMA busy_timeout acima) de dois processos passarem pelo PRAGMA ao
// mesmo tempo, os dois verem que a coluna ainda não existe, e um deles
// ganhar a corrida: quando o segundo tenta adicionar, o SQLite recusa
// com "duplicate column name". Isso é esperado nesse cenário e seguro
// de ignorar — o resultado final (a coluna existe) é o mesmo de qualquer
// forma. Qualquer outro erro continua sendo lançado normalmente.
function adicionarColunaSeNaoExistir(tabela: string, coluna: string, definicaoSql: string) {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all() as unknown as {
    name: string;
  }[];
  if (colunas.some((c) => c.name === coluna)) {
    return;
  }
  try {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicaoSql}`);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (!mensagem.toLowerCase().includes("duplicate column")) {
      throw erro;
    }
  }
}

adicionarColunaSeNaoExistir("recipes", "author_id", "INTEGER REFERENCES users(id)");
adicionarColunaSeNaoExistir("recipes", "photo_path", "TEXT");

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
  authorId: number | null;
  ingredients: string[];
  steps: string[];
  notes: string | null;
  createdAt: string;
  // Caminho relativo dentro de public/uploads/receitas, ou null se a
  // receita ainda não tem foto (a maioria não vai ter, e tudo bem).
  photoPath: string | null;
};

// Formato "cru" como vem do banco (linha da tabela SQL).
type RecipeRow = {
  id: number;
  title: string;
  category: string;
  servings: number;
  author_name: string;
  author_id: number | null;
  ingredients: string;
  steps: string;
  notes: string | null;
  created_at: string;
  photo_path: string | null;
};

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    servings: row.servings,
    authorName: row.author_name,
    authorId: row.author_id,
    ingredients: row.ingredients.split("\n").filter((line) => line.trim() !== ""),
    steps: row.steps.split("\n").filter((line) => line.trim() !== ""),
    notes: row.notes,
    createdAt: row.created_at,
    photoPath: row.photo_path,
  };
}

// Campos de conteúdo de uma receita — tudo que a pessoa preenche no
// formulário. Não inclui autor: quem cria uma receita é sempre quem
// está logado (ver lib/actions.ts), e editar não muda o autor original.
export type RecipeContentInput = {
  title: string;
  category: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  notes?: string | null;
};

// --- Operações CRUD de receitas ---

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

export function createRecipe(
  input: RecipeContentInput,
  author: { id: number; name: string }
): number {
  const result = db
    .prepare(
      `INSERT INTO recipes (title, category, servings, author_name, author_id, ingredients, steps, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.category,
      input.servings,
      author.name,
      author.id,
      input.ingredients.join("\n"),
      input.steps.join("\n"),
      input.notes ?? null
    );
  return Number(result.lastInsertRowid);
}

// Note que updateRecipe não recebe (nem altera) o autor — quem
// cadastrou a receita continua sendo o autor mesmo depois de editada
// por outra pessoa da família.
export function updateRecipe(id: number, input: RecipeContentInput): void {
  db.prepare(
    `UPDATE recipes
     SET title = ?, category = ?, servings = ?, ingredients = ?, steps = ?, notes = ?
     WHERE id = ?`
  ).run(
    input.title,
    input.category,
    input.servings,
    input.ingredients.join("\n"),
    input.steps.join("\n"),
    input.notes ?? null,
    id
  );
}

export function deleteRecipe(id: number): void {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

// Atualiza só a foto da receita, sem mexer em mais nada — usado tanto
// ao criar/editar a receita quanto no botão de trocar/remover foto
// direto na página de detalhes (ver lib/photos.ts e lib/actions.ts).
export function updateRecipePhoto(id: number, photoPath: string | null): void {
  db.prepare("UPDATE recipes SET photo_path = ? WHERE id = ?").run(photoPath, id);
}

// --- Usuários ---

export type User = {
  id: number;
  username: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
};

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: string;
};

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function findUserByUsername(username: string): User | null {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as unknown as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function findUserById(id: number): User | null {
  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as unknown as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

// Lança um erro do próprio SQLite (constraint UNIQUE) se o nome de
// usuário já existir — quem chama essa função deve tratar esse caso.
export function createUser(input: {
  username: string;
  passwordHash: string;
  displayName: string;
}): number {
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)`
    )
    .run(input.username, input.passwordHash, input.displayName);
  return Number(result.lastInsertRowid);
}

// --- Sessões ---

export function createSessionRecord(token: string, userId: number, expiresAt: Date): void {
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(
    token,
    userId,
    expiresAt.toISOString()
  );
}

export function findUserBySessionToken(token: string): User | null {
  const row = db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`
    )
    .get(token) as unknown as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function deleteSessionByToken(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
