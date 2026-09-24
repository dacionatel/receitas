import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function EntrarPage() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">Entrar</h1>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-stone-600">
        Ainda não tem conta?{" "}
        <Link href="/criar-conta" className="text-amber-800 hover:underline">
          Criar conta com o código da família
        </Link>
      </p>
    </div>
  );
}
