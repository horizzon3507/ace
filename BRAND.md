# Manual de marca — Ace

O Ace é uma esfera chapada com dois olhos e sem boca. Toda a expressividade vem dos olhos. A função principal é a identidade visual do bot no Fluxer; o uso como mascote segue as mesmas regras.

Este arquivo é o resumo rápido. O manual completo (identidade, logo, cores, expressões, estados, movimento, aplicações, tipografia e especificações) está em [`assets/brand/01-guia/ace-manual-de-marca.pdf`](assets/brand/01-guia/ace-manual-de-marca.pdf), com a variante laranja em [`assets/brand/canary/01-guia/ace-canary-manual-de-marca.pdf`](assets/brand/canary/01-guia/ace-canary-manual-de-marca.pdf).

## Regras que não mudam

- Esfera inteira, sem boca, sem contorno, sombra, degradê ou brilho.
- Olhos sempre em Eye White `#F1F1F1`, em qualquer expressão, cor ou estado.
- A cor da esfera indica o estado: azul é o Ace padrão; verde, vermelho e cinza são online, erro e instável.
- Ace Canary é a variante laranja: só a família azul vira laranja (`#F5841F`); as cores de estado continuam iguais.
- Texto de manual e documento é formal, sem gírias, em português do Brasil.

## Cores

| Uso | Nome | Hex |
|---|---|---|
| Ace padrão | Ace Blue | `#648DE5` |
| Ace Canary | Canary Orange | `#F5841F` |
| Olhos (sempre) | Eye White | `#F1F1F1` |
| Fundo escuro e texto | Ink | `#171717` |
| Online | Online | `#34B878` (texto em fundo claro: `#1F9E60`) |
| Erro / offline | Error | `#E53E3E` |
| Instável | Unstable | `#8C919A` |

Paleta completa (variações, extras e gradientes): [`assets/brand/03-cores/`](assets/brand/03-cores/) em CSS, JSON, TXT e PNG. No código, nunca escreva o hex à mão: importe `brand` de `src/brand.ts`.

## Assets

`assets/brand/` segue a estrutura do kit oficial (`00-LEIA-ME.txt` descreve cada pasta):

- `02-logo/` — logo em SVG e PNG (transparente, fundo escuro, fundo branco)
- `03-cores/` — paleta e tokens
- `04-expressoes/` — as 15 expressões
- `05-avatar/` — avatar animado e variações
- `06-banners/` — banners e gradientes
- `07-status/` — estados online, erro e instável, com e sem texto
- `08-emojis/` — emojis 512×512 para o Fluxer
- `09-animacoes/` — GIFs, vídeo de motion e protótipo 3D
- `canary/` — o mesmo kit na variante Ace Canary

## Tipografia

- **Geist** (400–700) — principal. Alternativa serifada: Geist Serif ou Lora.
- **Geist Mono** — comandos e código.
- As peças de status prontas usam Liberation Sans Bold e Lora SemiBold.

## Voz

O bot responde curto e direto em pt-BR (`pong!`, `trancado.`, `feito.`). O nome aparece como `ace` nas respostas e `Ace` no início de frase.
