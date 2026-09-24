"use client";

import { useActionState } from "react";
import { signupAction } from "@/lib/actions-auth";

const inputClasses =
  "mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="inviteCode" className="block text-sm font-medium text-stone-700">
          Código de convite da família
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          required
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-stone-700">
          Seu nome
        </label>
        <p className="mb-1 text-xs text-stone-500">
          É o nome que vai aparecer nas receitas que você cadastrar.
        </p>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          placeholder="Ex: Vovó Maria"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-stone-700">
          Nome de usuário
        </label>
        <p className="mb-1 text-xs text-stone-500">Sem espaços, é o que você vai usar pra entrar.</p>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700">
          Senha
        </label>
        <p className="mb-1 text-xs text-stone-500">Pelo menos 6 caracteres.</p>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClasses}
        />
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
