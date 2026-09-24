// lib/actions-auth.ts
//
// Server Actions de autenticação: cadastro, login e logout. Separado
// de lib/actions.ts (que cuida das receitas) só para manter cada
// arquivo focado num assunto.

"use server";

import { redirect } from "next/navigation";
import {
  createAccount,
  createSession,
  destroySession,
  verifyPassword,
} from "./auth";
import { findUserByUsername } from "./db";

// Formato do "estado" que os formulários recebem de volta depois de
// tentar enviar. `useActionState`, no componente cliente, guarda esse
// valor e re-renderiza o formulário com a mensagem de erro (se houver).
export type AuthFormState = { error: string } | undefined;

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const inviteCode = formData.get("inviteCode")?.toString() ?? "";
  const username = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const displayName = formData.get("displayName")?.toString().trim() ?? "";

  if (inviteCode !== process.env.FAMILY_INVITE_CODE) {
    return { error: "Código de convite inválido." };
  }
  if (username.length < 3) {
    return { error: "O nome de usuário precisa ter pelo menos 3 letras." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!displayName) {
    return { error: "Diz seu nome, pra aparecer nas receitas que você cadastrar." };
  }

  const result = createAccount({ username, password, displayName });
  if (!result.ok) {
    return { error: result.error };
  }

  await createSession(result.userId);
  redirect("/");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Usuário ou senha incorretos." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/entrar");
}
