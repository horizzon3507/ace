# Ace

Bot do Fluxer chamado Ace. Comandos usam o prefixo `a.`, lido de `PREFIX` no `.env`. Cada servidor pode trocar o dele com `a.setprefix`.

## Subir

Node 22.21 ou mais novo.

```sh
npm install
cp .env.example .env
```

Preencha `FLUXER_BOT_TOKEN` no `.env`. O prefixo já vem como `PREFIX=a.`.

```sh
npm test
npm run check
npm run typecheck
npm run dev
```

`npm run dev` sobe a CLI do Ace. Ao salvar, ela recarrega os comandos e, dentro de `src/`, a menção, o prefixo, a marca, os emojis, o cargo de entrada e o kick/ban, além do `PREFIX` do `.env`. `yuzuha.config.ts`, a própria CLI, os demais arquivos de `src/` e o token pedem reinício. Um listener novo no `setup` só existe depois desse reinício. `npm start` sobe sem recarga. Os dois leem o `.env` antes da config. `npm run check` não lê o `.env`. Sem `PREFIX` no ambiente, o prefixo fica `a.` — é o padrão global; `a.setprefix` sobrepõe por servidor.

## Comandos

| Comando | Faz |
|---|---|
| `a.ajuda` | Lista os comandos do Ace. |
| `a.ping` | Latência do Ace. |
| `a.uptime` | Há quanto tempo o Ace está acordado. |
| `a.avatar` | Exibe o avatar de um usuário. |
| `a.userbanner` | Exibe o banner de um usuário. |
| `a.guildicon` | Exibe o ícone do servidor atual. |
| `a.guildbanner` | Exibe o banner do servidor atual. |
| `a.kick` | Expulsa um membro do servidor. |
| `a.ban` | Bane um membro do servidor. |
| `a.setprefix` | Troca o prefixo do Ace no servidor. `reset` volta ao padrão. |

`a.kick`, `a.ban`, `a.guildicon`, `a.guildbanner` e `a.setprefix` só rodam dentro de um servidor. `a.setprefix` exige a permissão Gerenciar Servidor.

O token fica só no `.env`. Casos e variáveis vão para o diretório de dados do Yuzuha, sob o nome `ace`.

`assets/` guarda a arte do avatar do Ace — não é usada em runtime.

Mudanças de versão vão para o [CHANGELOG.md](CHANGELOG.md), no estilo Hory. Para contribuir, veja o [CONTRIBUTING.md](CONTRIBUTING.md).
