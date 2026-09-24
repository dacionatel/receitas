import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function CriarContaPage() {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-stone-800">
        Criar conta
      </h1>
      <SignupForm />
      <p className="mt-4 text-center text-sm text-stone-600">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-amber-800 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
