# Ace

Bot do Fluxer chamado Ace. Comandos usam o prefixo `a.`, lido de `PREFIX` no `.env`.

## Subir

Node 22.13 ou mais novo.

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

`npm run dev` sobe a CLI do Ace. Ao salvar, ela recarrega os comandos, a menção, o prefixo, a cor, o cargo de entrada e o `PREFIX` do `.env`. `yuzuha.config.ts`, a própria CLI e o token pedem reinício. Um listener novo no `setup` só existe depois desse reinício. O que o listener chama em `src/` recarrega ao salvar. `npm start` sobe sem recarga. Os dois leem o `.env` antes da config. `npm run check` não lê o `.env`. Sem `PREFIX` no ambiente, o prefixo fica `a.`.

## Comandos

| Comando | Faz |
|---|---|
| `a.ping` | Mostra a latência |
| `a.guildavatar` | Exibe o avatar (ícone) do servidor atual |
| `a.ajuda` | Lista os comandos |

O token fica só no `.env`. Casos e variáveis vão para o diretório de dados do Yuzuha, sob o nome `ace`.
