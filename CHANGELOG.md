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

## v0.1.3-alpha · 19/11/2026

Migração da yuzuha para 0.7.0, enxurrada de otimizações e cobertura de testes — ainda em construção, ainda não é release. Esta versão foi feita para CLI com canal de release alpha em 19/11/2026 (v0.1.3-alpha).

- Atualização da biblioteca `yuzuha` de `^0.3.2` para `^0.7.0`, ativando `memberCache`, `cacheSweepers`, `concurrency`, `owners`, drenagem limitada (`destroy({ timeoutMs })`), suporte a `ErrorReportInfo` no `onError` e script `doctor` (`npm run doctor`).
- `ctx.isOwner()` passa a usar o `owners` da yuzuha no `a.iddrop`, com fallback pro `BOT_OWNER_ID` do env.
- Otimizações de performance em runtime e comandos: caches LRU com coalescência concorrente para prefixos e autoroles, ordenação de snowflakes sem `BigInt`, `buildZip` com alocação única de buffer, regexes pré-compiladas, metadados congelados nos 23 comandos e short-circuit de mensagens sem prefixo no `MessageCreate`.
- Polling de deploy protegido contra sobreposição e timeout pendurado; classificação de watch-plan indexada em `Set` (O(1)).
- Cobertura de testes ampliada: suítes dedicadas para `ban`, `kick`, `softban`, `avatar`, `userbanner`, `guildicon`, `guildbanner`, `iddrop`, paginador, embed, resolvedores, formatadores, config da yuzuha 0.7.0 e benchmark/regressão de performance.
- `tsconfig` com verificações de compilação mais estritas e `.env.example` documentando variáveis opcionais.

## v0.1.2-alpha · 18/11/2026

Autorole por tipo de conta e ajuda mais direta — ainda em construção, ainda não é release. Esta versão foi feita para CLI com canal de release alpha em 18/11/2026 (v0.1.2-alpha).

- `a.ajuda` aceita o número da página (`a.ajuda 3`) e já abre nela com a barra de reações certa; página fora do intervalo avisa quantas existem.
- Autorole por servidor em três categorias — `a.autorole all|user|app <cargos>` define até 15 cargos (menção, ID ou nome) pra quem entra (`all` cobre usuários e apps, `user` só usuários, `app` só bots); `a.autorole` mostra as três listas, `a.autorole reset <categoria>` desliga uma e `a.autorole off` desliga as três. Recusa cargo gerenciado, `@everyone` ou acima da hierarquia do bot ou do autor.
- Correção: os exemplos nas mensagens de erro respeitam o prefixo do servidor em vez de assumir `a.`.

## v0.1.1-stable · 13/11/2026

Primeira versão estável do bot do Fluxer — dez comandos novos, listas paginadas por reação e deploy automático. Esta versão foi feita para CLI com canal de release stable em 13/11/2026 (v0.1.1-stable).

- Informação `a.userinfo` (conta criada, tag, pronomes, entrada no servidor, cargos, hierarquia e silenciamento) e `a.guildinfo` (dono, membros, criação do servidor, recursos e diagnóstico das permissões do bot).
- Limpeza `a.clear` (últimas n mensagens do canal, 1–99 incluindo a do comando) e `a.purge` (mensagens recentes de um membro, padrão 10 e máximo 99); as duas exigem Gerenciar Mensagens e a confirmação se apaga em segundos.
- Moderação `a.timeout` com duração `10m`/`2h`/`1d` até 28 dias, exigindo Moderar Membros; `a.unban` por menção, ID ou nome da lista de bans; e `a.softban`, que expulsa e limpa as mensagens recentes sem manter o ban — exigindo Banir Membros.
- Emojis `a.emojilist` (lista paginada por reação, mais recentes primeiro), `a.emojidump` (zip com todos os emojis anexado na mesma mensagem) e `a.iddrop` (menções em linha reta pra cópia, oculto e restrito ao dono do bot).
- `a.ajuda` paginado por reação: primeira página de apresentação do Ace e categorias Moderação, Informações e Utilidades. O paginador navega com ◀, ▶ e home, muda a barra por página e deixa só as reações do bot.
- `a.lock` e `a.unlock` também cobrem canais de voz e anúncios.
- Correção: `a.userbanner` lê o banner pelo endpoint de perfil.
- O bot se auto-atualiza quando a branch `main` muda no GitHub (deploy watch) e o hot-reload cobre mais módulos sem reiniciar.

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
