import { CATEGORIES } from "@/lib/constants";
import type { Recipe } from "@/lib/db";

// Este componente é reaproveitado tanto pela página de "Nova receita"
// quanto pela de "Editar receita" — só muda a action e os valores
// iniciais. Como não precisamos de nenhuma interatividade no cliente
// (o próprio <form> cuida do envio via Server Action), isso continua
// sendo um Server Component simples, sem "use client".

type RecipeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: Partial<Recipe>;
  submitLabel: string;
};

const inputClasses =
  "mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function RecipeForm({
  action,
  defaultValues,
  submitLabel,
}: RecipeFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-stone-700">
          Título da receita
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title}
          placeholder="Ex: Bolo de fubá da vó"
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-stone-700">
            Categoria
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaultValues?.category ?? CATEGORIES[0]}
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
            id="servings"
            name="servings"
            type="number"
            min={1}
            required
            defaultValue={defaultValues?.servings ?? 4}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-stone-700">
            Quem contribuiu
          </label>
          <input
            id="authorName"
            name="authorName"
            type="text"
            defaultValue={defaultValues?.authorName ?? ""}
            placeholder="Ex: Vovó Maria"
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
          id="ingredients"
          name="ingredients"
          required
          rows={6}
          defaultValue={defaultValues?.ingredients?.join("\n")}
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
          id="steps"
          name="steps"
          required
          rows={6}
          defaultValue={defaultValues?.steps?.join("\n")}
          placeholder={"Misture os secos\nAdicione os ovos e bata bem\nAsse por 40 minutos a 180°C"}
          className={`${inputClasses} font-mono text-sm`}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-stone-700">
          Notas e variações (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Ex: Dá pra trocar o fubá por farinha de milho fina"
          className={inputClasses}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 sm:w-auto"
      >
        {submitLabel}
      </button>
    </form>
  );
}
