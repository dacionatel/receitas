"use client";

// Página alternativa à de "Nova receita": em vez de preencher campo
// por campo, a pessoa cola o texto inteiro de uma receita (de um
// site, de um documento, de uma mensagem) e a gente tenta separar
// sozinho em título, ingredientes e modo de preparo — usando as
// regras simples de lib/recipe-parser.ts, chamadas através de
// lib/actions-import.ts.
//
// Depois de "organizar", reaproveitamos o mesmo <RecipeForm/> da
// página de nova receita como tela de conferência: a pessoa vê tudo
// já preenchido e pode ajustar antes de realmente salvar.

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { RecipeForm } from "@/components/recipe-form";
import { createRecipeAction } from "@/lib/actions";
import { organizarTextoAction } from "@/lib/actions-import";
import { reconhecerFotosAction } from "@/lib/actions-ocr";
import type { RecipeContentInput } from "@/lib/db";

const textareaClasses =
  "block w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export default function ColarTextoPage() {
  const [textoColado, setTextoColado] = useState("");
  const [resultado, setResultado] = useState<RecipeContentInput | null>(null);
  const [confiante, setConfiante] = useState(true);
  const [porcoesEncontradas, setPorcoesEncontradas] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Identifica de forma única CADA vez que um texto é organizado —
  // não pode ser um valor fixo tipo "colar-texto", porque dá pra
  // organizar mais de um texto diferente na mesma visita à página
  // (colar um, clicar "← Colar outro texto", colar outro). Com uma
  // chave fixa, o rascunho salvo automaticamente pelo <RecipeForm/>
  // (ver components/recipe-form.tsx) da primeira receita reaparecia
  // por cima dos dados certos da segunda.
  const [chaveRascunho, setChaveRascunho] = useState<string | null>(null);

  const [lendoFotos, setLendoFotos] = useState(false);
  const [avisosOcr, setAvisosOcr] = useState<string[]>([]);
  const [erroOcr, setErroOcr] = useState<string | null>(null);
  const fotosInputRef = useRef<HTMLInputElement>(null);

  function organizar() {
    startTransition(async () => {
      const analise = await organizarTextoAction(textoColado);
      setResultado(analise.dados);
      setConfiante(analise.confiante);
      setPorcoesEncontradas(analise.porcoesEncontradas);
      setChaveRascunho(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
    });
  }

  async function lerFotos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = event.target.files;
    if (!arquivos || arquivos.length === 0) {
      return;
    }

    setLendoFotos(true);
    setErroOcr(null);
    setAvisosOcr([]);

    try {
      const formData = new FormData();
      for (const arquivo of Array.from(arquivos)) {
        formData.append("fotos", arquivo);
      }
      const resultado = await reconhecerFotosAction(formData);
      if (resultado.sucesso) {
        setTextoColado((atual) =>
          atual.trim() ? `${atual}\n\n${resultado.texto}` : resultado.texto
        );
        setAvisosOcr(resultado.avisos);
      } else {
        setErroOcr(resultado.erro);
      }
    } catch (erro) {
      // Não deveria acontecer em uso normal (erros esperados vêm como
      // valor de retorno, ver lib/actions-ocr.ts) — só cai aqui em
      // algo realmente inesperado, tipo a rede cair no meio do envio.
      setErroOcr(erro instanceof Error ? erro.message : "Não conseguimos ler as fotos.");
    } finally {
      setLendoFotos(false);
      // Limpa o input pra poder selecionar as mesmas fotos de novo se
      // precisar (o navegador não dispara onChange de novo com o mesmo
      // arquivo se o valor não for resetado).
      if (fotosInputRef.current) {
        fotosInputRef.current.value = "";
      }
    }
  }

  if (resultado && chaveRascunho) {
    return (
      <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-stone-800">
          Confira a receita organizada
        </h1>
        <p className="mb-6 text-sm text-stone-500">
          Organizamos automaticamente com base no texto colado. Revise e
          ajuste o que precisar antes de salvar.
        </p>

        {!confiante && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Não encontramos claramente as seções de &quot;Ingredientes&quot;
            e &quot;Modo de preparo&quot; no texto colado — confira com
            atenção e ajuste os campos abaixo antes de salvar.
          </div>
        )}

        {!porcoesEncontradas && (
          <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            O texto colado não mencionava a quantidade de porções — o
            campo &quot;Porções&quot; abaixo veio com um valor padrão (não
            foi extraído do texto), confirme antes de salvar.
          </div>
        )}

        <RecipeForm
          action={createRecipeAction}
          defaultValues={resultado}
          submitLabel="Salvar receita"
          draftKey={`colar-texto-${chaveRascunho}`}
        />

        <button
          type="button"
          onClick={() => {
            setResultado(null);
            setChaveRascunho(null);
          }}
          className="mt-4 text-sm text-stone-500 underline hover:no-underline"
        >
          ← Colar outro texto
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold text-stone-800">
        Colar ou fotografar uma receita
      </h1>
      <p className="mb-4 text-sm text-stone-500">
        Cole o texto de uma receita (de um site, de um documento, de uma
        mensagem) ou envie uma foto dela, e tentamos separar sozinhos em
        título, ingredientes e modo de preparo. Você confere tudo antes de
        salvar.
      </p>

      <details className="mb-4 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
        <summary className="cursor-pointer font-medium text-stone-700">
          Dicas para um resultado melhor
        </summary>
        <div className="mt-3 space-y-3">
          <p>
            Funciona melhor com receitas &quot;simples&quot;: um título, uma
            lista de ingredientes e uma lista de modo de preparo, cada uma
            com seu próprio cabeçalho (ex: &quot;Ingredientes:&quot; e
            &quot;Modo de preparo:&quot;). Aceitamos variações comuns desses
            cabeçalhos (&quot;Modo de preparar&quot;, &quot;Como fazer&quot;
            etc.) e também listas com marcadores (&quot;-&quot;,
            &quot;*&quot;, números).
          </p>
          <div className="rounded-md bg-white p-2 font-mono text-xs text-stone-500">
            Bolo de fubá da vó
            <br />
            <br />
            Ingredientes:
            <br />
            2 xícaras de farinha
            <br />
            1 xícara de fubá
            <br />
            <br />
            Modo de preparo:
            <br />
            Misture os secos
            <br />
            Asse por 40 minutos a 180°C
          </div>
          <p>
            Receitas com subdivisões — tipo &quot;Para a massa:&quot; /
            &quot;Para o recheio:&quot;, ou &quot;Molho:&quot; /
            &quot;Montagem:&quot; — são organizadas certinho nos dois
            grupos (ingredientes de um lado, modo de preparo do outro), mas
            essas linhas de subtítulo entram junto dentro da lista, como se
            fossem mais um item. Nesses casos, vale uma conferida extra
            antes de salvar.
          </p>
          <p>
            Links e citações no meio do texto (comum em resumos feitos por
            buscadores com IA, ou copiados de sites) são removidos
            automaticamente — não precisa se preocupar em tirar isso antes
            de colar.
          </p>
        </div>
      </details>

      <div className="mb-4 rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 py-3">
        <label htmlFor="fotos" className="block text-sm font-medium text-stone-700">
          Ou envie uma foto da receita (tira do celular, de um livro, de um
          caderno de receitas impresso)
        </label>
        <p className="mt-1 text-xs text-stone-500">
          Se a receita não couber numa foto só, selecione várias de uma vez
          (segurando Ctrl ou Cmd na hora de escolher) — juntamos o texto de
          todas, na ordem que forem selecionadas. Funciona melhor com texto
          impresso/digitado; receita escrita à mão costuma sair errado —
          nesse caso é melhor digitar direto ou colar o texto.
        </p>
        <input
          ref={fotosInputRef}
          id="fotos"
          type="file"
          accept="image/*"
          multiple
          onChange={lerFotos}
          disabled={lendoFotos}
          className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-800 hover:file:bg-amber-100"
        />
        {lendoFotos && (
          <p className="mt-2 text-sm text-amber-700">Lendo o texto da(s) foto(s)...</p>
        )}
        {erroOcr && (
          <p className="mt-2 text-sm text-red-700">{erroOcr}</p>
        )}
        {avisosOcr.length > 0 && (
          <div className="mt-2 space-y-1 text-sm text-amber-700">
            {avisosOcr.map((aviso, index) => (
              <p key={index}>{aviso}</p>
            ))}
          </div>
        )}
      </div>

      <textarea
        value={textoColado}
        onChange={(event) => setTextoColado(event.target.value)}
        rows={14}
        placeholder={
          "Cole aqui o texto completo da receita...\n\nEx:\nBolo de fubá da vó\n\nIngredientes:\n2 xícaras de farinha\n1 xícara de fubá\n3 ovos\n\nModo de preparo:\nMisture os secos\nAdicione os ovos e bata bem\nAsse por 40 minutos a 180°C"
        }
        className={textareaClasses}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={organizar}
          disabled={isPending || textoColado.trim() === ""}
          className="rounded-md bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {isPending ? "Organizando..." : "Organizar automaticamente"}
        </button>
        <Link
          href="/receitas/nova"
          className="text-sm text-stone-500 underline hover:no-underline"
        >
          Prefiro preencher o formulário normal
        </Link>
      </div>
    </div>
  );
}
