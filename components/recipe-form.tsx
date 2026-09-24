"use client";

// Este componente é reaproveitado tanto pela página de "Nova receita"
// quanto pela de "Editar receita" — só muda a action e os valores
// iniciais.
//
// Agora ele é um Client Component (por causa do "use client" acima),
// porque precisamos de algo que só existe no navegador: o
// localStorage. A ideia é simples — a cada letra digitada, guardamos
// uma cópia do formulário no próprio celular/computador da pessoa.
// Se por algum motivo a página recarregar sozinha no meio do caminho
// (rede caiu, trocou de aplicativo, tela apagou), ao abrir de novo o
// formulário vem com tudo preenchido de novo, em vez de vazio.
//
// Além de salvar a cada mudança (onChange), também lemos o valor "de
// verdade" da tela periodicamente (direto do elemento HTML, sem
// depender do React) e salvamos de novo — uma segunda camada de
// segurança, útil sobretudo em conexões instáveis (Wi-Fi de celular).

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CATEGORIES } from "@/lib/constants";
import type { Recipe } from "@/lib/db";
import { urlFotoCheia } from "@/lib/photo-urls";

type RecipeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Partial<Recipe>;
  submitLabel: string;
  // Identifica de forma única este formulário — "nova" para receita
  // nova, ou algo como "editar-12" para editar a receita 12. Isso
  // evita que o rascunho de uma receita se misture com o de outra.
  draftKey: string;
};

// Formato dos campos como eles aparecem nos <input>/<textarea> — tudo
// texto, mesmo "porções" (que vira número só na hora de enviar).
type FormValues = {
  title: string;
  category: string;
  servings: string;
  ingredients: string;
  steps: string;
  notes: string;
};

const inputClasses =
  "mt-1 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

const DRAFT_PREFIX = "receita-rascunho:";

// Um rascunho só é restaurado automaticamente se tiver sido salvo há
// pouco tempo — do contrário, abrir "Nova receita" dias depois de um
// teste ou de uma receita esquecida sempre traria de volta aquele
// rascunho antigo, o que atrapalha mais do que ajuda. Passado esse
// prazo, o rascunho é descartado sozinho, sem aviso nenhum.
const DRAFT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 horas

// O que de fato fica salvo no localStorage: os valores do formulário
// mais o horário em que foram salvos, para dar pra calcular a idade
// do rascunho na hora de decidir se ele ainda vale a pena restaurar.
type DraftPayload = {
  values: FormValues;
  savedAt: number;
};

function valuesFromDefaults(defaultValues?: Partial<Recipe>): FormValues {
  return {
    title: defaultValues?.title ?? "",
    category: defaultValues?.category ?? CATEGORIES[0],
    servings: String(defaultValues?.servings ?? 4),
    ingredients: defaultValues?.ingredients?.join("\n") ?? "",
    steps: defaultValues?.steps?.join("\n") ?? "",
    notes: defaultValues?.notes ?? "",
  };
}

function formatHora(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RecipeForm({
  action,
  defaultValues,
  submitLabel,
  draftKey,
}: RecipeFormProps) {
  const storageKey = `${DRAFT_PREFIX}${draftKey}`;

  const [values, setValues] = useState<FormValues>(() =>
    valuesFromDefaults(defaultValues)
  );
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Referências para os elementos de verdade na tela — usamos elas
  // pra ler o valor "real" digitado, sem depender só do React estar
  // ciente da mudança.
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const servingsRef = useRef<HTMLInputElement>(null);
  const ingredientsRef = useRef<HTMLTextAreaElement>(null);
  const stepsRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  function readFromDom(): FormValues | null {
    if (
      !titleRef.current ||
      !categoryRef.current ||
      !servingsRef.current ||
      !ingredientsRef.current ||
      !stepsRef.current ||
      !notesRef.current
    ) {
      return null;
    }
    return {
      title: titleRef.current.value,
      category: categoryRef.current.value,
      servings: servingsRef.current.value,
      ingredients: ingredientsRef.current.value,
      steps: stepsRef.current.value,
      notes: notesRef.current.value,
    };
  }

  // Um formulário sem nenhum texto digitado (título, ingredientes,
  // preparo e notas todos em branco) não tem nada de fato para
  // recuperar depois — não vale a pena guardar isso como rascunho.
  // Ignora categoria/porções de propósito, já que elas sempre vêm
  // com um valor padrão, mesmo num formulário "vazio".
  function formularioEstaVazio(v: FormValues): boolean {
    return (
      v.title.trim() === "" &&
      v.ingredients.trim() === "" &&
      v.steps.trim() === "" &&
      v.notes.trim() === ""
    );
  }

  function saveDraft(next: FormValues) {
    if (formularioEstaVazio(next)) {
      // Sem conteúdo nenhum -- se sobrou um rascunho antigo (ex:
      // acabou de ser descartado, mas a rede de segurança de 1,5s
      // ainda ia rodar mais uma vez), garante que ele não reapareça
      // sozinho depois.
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Sem problema.
      }
      return;
    }
    try {
      const payload: DraftPayload = { values: next, savedAt: Date.now() };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(new Date());
    } catch {
      // Sem espaço no localStorage, ou indisponível — a receita
      // continua editável, só não fica salva como rascunho.
    }
  }

  // Isso só roda no navegador, depois que a página já carregou — é
  // aqui que olhamos se existe um rascunho salvo. Se existir, ele tem
  // prioridade sobre o que veio do servidor, porque é mais recente.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const payload = JSON.parse(saved) as Partial<DraftPayload>;
        const idadeMs = payload.savedAt
          ? Date.now() - payload.savedAt
          : Infinity;
        if (payload.values && idadeMs < DRAFT_MAX_AGE_MS) {
          setValues(payload.values);
          setDraftRestored(true);
        } else {
          // Rascunho velho demais (ou de um formato antigo, sem data
          // salva) — mais provável que tenha sido esquecido do que de
          // uma interrupção de verdade. Não faz sentido reaparecer
          // depois de tanto tempo, então descarta sem avisar.
          window.localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // localStorage indisponível (ex: modo privado bem restrito) —
      // sem problema, o formulário funciona normalmente, só sem
      // rascunho.
    }

    // Rede de segurança: a cada 1,5s, lê o valor REAL que está na
    // tela (direto dos campos, sem depender do onChange do React) e
    // salva. Isso cobre o caso de o aviso de mudança do React não
    // disparar a tempo em algum navegador.
    const interval = window.setInterval(() => {
      const current = readFromDom();
      if (current) saveDraft(current);
    }, 1500);

    // Rede de segurança extra: se a página for fechada, recarregada
    // ou o app for trocado, tenta salvar uma última vez imediatamente.
    function handlePageHide() {
      const current = readFromDom();
      if (current) saveDraft(current);
    }
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handlePageHide);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handlePageHide);
    };
    // Só queremos configurar isso uma vez, ao montar o formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField<K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) {
    setValues((previous) => {
      const next = { ...previous, [field]: value };
      saveDraft(next);
      return next;
    });
  }

  // A foto NÃO faz parte do rascunho salvo no localStorage -- um
  // arquivo não dá pra guardar ali (e nem faria sentido, de tanto
  // espaço que ocuparia). Ela vive só neste estado local, separado do
  // resto do formulário, e vai direto no FormData no envio.
  const fotoAtualUrl = defaultValues?.photoPath
    ? urlFotoCheia(defaultValues.photoPath)
    : null;
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [removerFotoMarcado, setRemoverFotoMarcado] = useState(false);
  const fotoObjectUrlRef = useRef<string | null>(null);

  function handleFotoChange(event: ChangeEvent<HTMLInputElement>) {
    if (fotoObjectUrlRef.current) {
      URL.revokeObjectURL(fotoObjectUrlRef.current);
      fotoObjectUrlRef.current = null;
    }
    const arquivo = event.target.files?.[0];
    if (arquivo) {
      const url = URL.createObjectURL(arquivo);
      fotoObjectUrlRef.current = url;
      setNovaFotoPreview(url);
      setRemoverFotoMarcado(false);
    } else {
      setNovaFotoPreview(null);
    }
  }

  // Libera a pré-visualização da memória do navegador quando o
  // formulário for desmontado (ex: ao navegar pra outra página).
  useEffect(() => {
    return () => {
      if (fotoObjectUrlRef.current) {
        URL.revokeObjectURL(fotoObjectUrlRef.current);
      }
    };
  }, []);

  function discardDraft() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nada a fazer se não der pra acessar o localStorage.
    }
    setValues(valuesFromDefaults(defaultValues));
    setDraftRestored(false);
    setLastSavedAt(null);
  }

  function handleSubmit() {
    // Formulário sendo enviado de verdade — não precisamos mais do
    // rascunho (se der certo, a receita já vai estar salva no banco).
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Sem problema.
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-5">
      {draftRestored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Recuperamos um rascunho não salvo desta receita.</span>
          <button
            type="button"
            onClick={discardDraft}
            className="font-medium underline hover:no-underline"
          >
            Descartar rascunho
          </button>
        </div>
      )}

      <div>
        <label htmlFor="photo" className="block text-sm font-medium text-stone-700">
          Foto da receita (opcional)
        </label>
        <p className="mb-2 text-xs text-stone-500">
          Uma foto do prato pronto. Nem toda receita precisa ter uma.
        </p>

        {(novaFotoPreview || (fotoAtualUrl && !removerFotoMarcado)) && (
          <img
            src={novaFotoPreview ?? fotoAtualUrl ?? ""}
            alt=""
            className="mb-2 h-40 w-full rounded-md object-cover sm:w-64"
          />
        )}

        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={handleFotoChange}
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-800 hover:file:bg-amber-100"
        />

        {fotoAtualUrl && !novaFotoPreview && (
          <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              name="removerFoto"
              checked={removerFotoMarcado}
              onChange={(event) => setRemoverFotoMarcado(event.target.checked)}
            />
            Remover foto atual
          </label>
        )}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Título da receita
        </label>
        <input
          ref={titleRef}
          id="title"
          name="title"
          type="text"
          required
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Ex: Bolo de fubá da vó"
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-stone-700">
            Categoria
          </label>
          <select
            ref={categoryRef}
            id="category"
            name="category"
            value={values.category}
            onChange={(event) => updateField("category", event.target.value)}
            className={inputClasses}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="servings" className="block text-sm font-medium text-stone-700">
            Porções
          </label>
          <input
            ref={servingsRef}
            id="servings"
            name="servings"
            type="number"
            min={1}
            required
            value={values.servings}
            onChange={(event) => updateField("servings", event.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ingredients" className="block text-sm font-medium text-stone-700">
          Ingredientes
        </label>
        <p className="mb-1 text-xs text-stone-500">Um ingrediente por linha.</p>
        <textarea
          ref={ingredientsRef}
          id="ingredients"
          name="ingredients"
          required
          rows={6}
          value={values.ingredients}
          onChange={(event) => updateField("ingredients", event.target.value)}
          placeholder={"2 xícaras de farinha de trigo\n1 xícara de fubá\n3 ovos"}
          className={`${inputClasses} font-mono text-sm`}
        />
      </div>

      <div>
        <label htmlFor="steps" className="block text-sm font-medium text-stone-700">
          Modo de preparo
        </label>
        <p className="mb-1 text-xs text-stone-500">Um passo por linha.</p>
        <textarea
          ref={stepsRef}
          id="steps"
          name="steps"
          required
          rows={6}
          value={values.steps}
          onChange={(event) => updateField("steps", event.target.value)}
          placeholder={"Misture os secos\nAdicione os ovos e bata bem\nAsse por 40 minutos a 180°C"}
          className={`${inputClasses} font-mono text-sm`}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-stone-700">
          Notas e variações (opcional)
        </label>
        <textarea
          ref={notesRef}
          id="notes"
          name="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Ex: Dá pra trocar o fubá por farinha de milho fina"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="w-full rounded-md bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 sm:w-auto"
        >
          {submitLabel}
        </button>
        <p className="text-xs text-stone-400">
          {lastSavedAt
            ? `Rascunho salvo às ${formatHora(lastSavedAt)}.`
            : "Seu progresso é salvo automaticamente neste aparelho."}
        </p>
      </div>
    </form>
  );
}
