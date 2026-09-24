// lib/auth.ts
//
// Tudo relacionado a "quem está logado": criar/verificar senha,
// criar e conferir sessões, e o cookie que identifica o navegador da
// pessoa entre uma visita e outra.
//
// Importante: este arquivo só pode ser importado por código que roda
// no servidor (Server Components, Server Actions, o proxy). Ele usa
// `next/headers`, que nem existe no navegador.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  createSessionRecord,
  createUser,
  deleteSessionByToken,
  findUserByUsername,
  findUserBySessionToken,
  type User,
} from "./db";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_DAYS = 30;

// --- Senhas ---
//
// Nunca guardamos a senha da pessoa, só um "hash" dela (um resumo
// matemático que não dá pra reverter). `scrypt` é uma função de hash
// pensada especificamente para senhas — ao contrário de um hash comum
// (como SHA-256), ela é de propósito lenta, o que dificulta muito um
// ataque de força bruta. Vem embutida no Node, sem precisar instalar
// nada como `bcrypt`.
//
// O "salt" é um valor aleatório único por usuário, gerado na hora do
// cadastro. Sem ele, duas pessoas com a mesma senha teriam o mesmo
// hash salvo no banco — o que ajudaria um invasor. Guardamos o salt
// junto do hash (separados por ":"), já que ele não precisa ser
// secreto, só único.

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const hashToCompare = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(hash, "hex");
  // timingSafeEqual evita "timing attacks": comparar strings com === faz
  // a comparação parar no primeiro caractere diferente, o que em teoria
  // vaza informação sobre quantos caracteres estavam certos.
  if (hashToCompare.length !== storedHashBuffer.length) return false;
  return timingSafeEqual(hashToCompare, storedHashBuffer);
}

// --- Cadastro ---

export type CreateAccountResult =
  | { ok: true; userId: number }
  | { ok: false; error: string };

export function createAccount(input: {
  username: string;
  password: string;
  displayName: string;
}): CreateAccountResult {
  if (findUserByUsername(input.username)) {
    return { ok: false, error: "Esse nome de usuário já está em uso." };
  }

  const passwordHash = hashPassword(input.password);
  const userId = createUser({
    username: input.username,
    passwordHash,
    displayName: input.displayName,
  });
  return { ok: true, userId };
}

// --- Sessões ---

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  createSessionRecord(token, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    deleteSessionByToken(token);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// `cache()` faz com que, dentro de uma mesma renderização de página,
// chamar getCurrentUser() várias vezes (em componentes diferentes) só
// realmente consulte o banco uma vez.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return findUserBySessionToken(token);
});
