# 🍲 Receitas da Família

Livro de receitas da família como aplicação web — Fase 1.

## O que já funciona nesta fase

- Cadastrar uma receita (título, categoria, porções, quem contribuiu, ingredientes, modo de preparo, notas)
- Ver a lista de todas as receitas
- Ver o detalhe de uma receita
- Editar uma receita
- Excluir uma receita

Ainda **não** tem (fica pra próximas fases, como combinamos): contas de usuário / convite pra família, "modo cozinha" pro celular, fotos, busca e filtro.

## Como rodar na sua máquina

Pré-requisitos: [Node.js](https://nodejs.org) versão 22 ou mais recente (o projeto usa o módulo `node:sqlite`, que só existe a partir do Node 22).

```bash
# 1. Instalar as dependências
npm install

# 2. Rodar o servidor de desenvolvimento
npm run dev
```

Depois é só abrir [http://localhost:3000](http://localhost:3000) no navegador.

Os dados ficam salvos em `data/receitas.db` — um arquivo SQLite. Ele é criado automaticamente na primeira vez que o servidor roda, e fica de fora do git (veja o `.gitignore`), então cada pessoa que rodar o projeto localmente tem seu próprio banco.

## Como o projeto é organizado

- `lib/db.ts` — acesso ao banco de dados (SQLite nativo do Node, sem ORM). Cada função aqui é uma operação: listar, buscar uma, criar, atualizar, excluir.
- `lib/actions.ts` — as "Server Actions": funções que os formulários chamam diretamente para salvar dados, sem precisar de uma API separada.
- `components/recipe-form.tsx` — o formulário de receita, reaproveitado tanto para criar quanto para editar.
- `app/` — as páginas, seguindo o roteamento por pastas do Next.js (App Router):
  - `app/page.tsx` — lista de receitas (home)
  - `app/receitas/nova/page.tsx` — formulário de nova receita
  - `app/receitas/[id]/page.tsx` — detalhe de uma receita
  - `app/receitas/[id]/editar/page.tsx` — formulário de edição

## Tecnologias

Next.js 16 (App Router + Server Actions), React 19, TypeScript, Tailwind CSS v4, e `node:sqlite` (nativo do Node.js) como banco de dados.

> Nota técnica: a ideia original era usar Prisma como camada de banco de dados, mas o ambiente onde este projeto foi montado bloqueia o download dos binários que o Prisma precisa. Por isso optamos por `node:sqlite` direto — o que, para aprender, tem a vantagem de deixar o SQL bem visível em vez de escondido atrás de um ORM.

## Próximas fases (combinadas)

1. ~~CRUD básico de receitas~~ ✅ (esta fase)
2. Contas de usuário e convite para a família
3. "Modo cozinha" otimizado para celular + instalação como PWA
4. Fotos, busca/filtro, histórico de edições
