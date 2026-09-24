# Como colocar o app no ar pra família testar (teste rápido, sem custo)

Isso é uma solução **temporária**, só pra amanhã (ou por alguns dias) a família
conseguir acessar o app sem você precisar contratar nada ainda. O seu
computador continua sendo o "servidor" — só criamos um link público que aponta
pra ele.

## O que você precisa ter rodando

1. O app já compilado e no ar, como sempre:
   ```
   npm run build
   npm run start
   ```
   Deixa esse terminal aberto.

## Passo 1 — Instalar o Cloudflare Tunnel (só precisa fazer uma vez)

O `cloudflared` é um programinha gratuito da Cloudflare que cria um túnel
seguro entre seu PC e a internet, sem precisar mexer no seu roteador nem abrir
portas.

Abra um **outro** terminal (PowerShell), separado do que está rodando o
`npm run start`, e rode:

```
winget install --id Cloudflare.cloudflared
```

Se o Windows perguntar se pode instalar, aceita. Só precisa fazer isso uma vez.

## Passo 2 — Criar o túnel

Ainda nesse segundo terminal, com o app já rodando no primeiro (`npm run
start` ativo em `localhost:3000`), rode:

```
cloudflared tunnel --url http://localhost:3000
```

Depois de alguns segundos, vai aparecer no terminal um endereço parecido com:

```
https://palavras-aleatorias.trycloudflare.com
```

**Esse é o link que você manda pra família.** Qualquer pessoa que abrir esse
link, de qualquer lugar (celular, outro computador), vai cair no seu app.

Se o Windows perguntar sobre permissão de firewall na primeira vez, permite.

## Passo 3 — Avisar a família

Manda pra eles, por WhatsApp ou onde for combinado:

- O link (`https://....trycloudflare.com`)
- O código de convite pra criar conta: **`colher739`**

(Troquei o código de convite de "familia2026" pra esse, já que antes o app só
rodava na sua rede de casa e agora vai ficar exposto na internet — assim fica
menos óbvio pra alguém de fora tentar adivinhar.)

## Coisas importantes de saber

- **O link muda toda vez que você reinicia o `cloudflared`.** Se fechar o
  terminal e abrir de novo, vai sair um link novo — precisa mandar de novo pra
  família.
- **Seu PC precisa ficar ligado, sem hibernar/dormir, e conectado à internet**
  enquanto a família estiver testando. Se desligar o PC ou ele dormir, o app
  sai do ar pra todo mundo.
- Pra parar o teste, é só fechar (Ctrl+C) o terminal do `cloudflared` — o link
  para de funcionar na hora. O app continua rodando normal só na sua rede
  local (`localhost:3000`) até você decidir tirar do ar também.
- Isso é só pra teste. Pra deixar o app "no ar de verdade" (sempre disponível,
  com endereço fixo tipo `receitas.ndm.com.br`), o caminho é uma VPS/Cloud
  Server — aí sim vale a pena revisitar a ideia da Locaweb quando você decidir
  sobre o plano.
