# Changelog

Seguimos [Semantic Versioning](https://semver.org/) e [Keep a Changelog](https://keepachangelog.com/). Ace é uma superfície única de CLI.

<details>
<summary>Para saber mais sobre o versionamento, expanda aqui.</summary>

Toda versão começa com `v` (obrigatório), ex.: `v0.1.0-alpha`, `v1.0.0-stable`.

A superfície instalável é **CLI** (o bot `ace` rodando no terminal via `npm run dev` / `npm start`).

| Parte | O que você instala | Exemplo |
| --- | --- | --- |
| **CLI** | `ace` no terminal | `v0.1.0-alpha` |

Com uma superfície só não existe `m` na tag nem seções por superfície — só as notas da versão.

Cada título de release é a versão e a data (`## v0.1.0-alpha · 03/11/2026`); embaixo, um resumo curto termina numa frase simples tipo: "Esta versão foi feita para CLI com canal de release alpha em 03/11/2026 (v0.1.0-alpha)."

### O que o sufixo de canal significa

| Sufixo | Em palavras simples |
| --- | --- |
| **-alpha** | Bem cedo. Espere peças faltando e muitos bugs. |
| **-beta** | Quase lá, mas ainda áspero. Dá pra usar; não é o install "oficial". |
| **-stable** | Pronto pro uso diário. É o que vai pra GitHub Releases. |

Só chamamos algo de **stable** quando é pra valer.

</details>

## v0.1.0-alpha · 03/11/2026

Primeiro corte em desenvolvimento do bot do Fluxer — em construção, ainda não é release. Esta versão foi feita para CLI com canal de release alpha em 03/11/2026 (v0.1.0-alpha).

- CLI `ace` com banner em pt-BR, cores conforme TTY (`NO_COLOR`/`FORCE_COLOR`) e reload ao vivo de comandos, emojis, menção, prefixo, marca, cargo de entrada e moderação; demais mudanças e o token pedem reinício.
- Prefixo por servidor com `a.setprefix` (exige Gerenciar Servidor), persistido no diretório de dados do Yuzuha com cache em memória; `PREFIX` no `.env` segue o padrão global.
- Comandos de utilidade `a.ajuda` (embed), `a.ping` (qualificação da conexão), `a.uptime` (duração em dias/horas/minutos) e `a.avatar`, `a.userbanner`, `a.guildicon`, `a.guildbanner` em resolução máxima do CDN.
- Moderação `a.kick` e `a.ban` com alvo por menção, ID ou nome (busca com fallback), motivo, hierarquia e casos numerados.
- `a.lock` e `a.unlock` trancam/destrancam canais de texto via overwrite de `SendMessages` no `@everyone`, com canal opcional por menção ou ID, motivo no audit log e recusa de canais de voz e categorias.
- Menção com apresentação e link de convite, aviso de comando desconhecido e cargo automático de entrada.
- Licença AGPL-3.0.
- Various other small tweaks
