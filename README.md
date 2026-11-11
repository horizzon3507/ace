<div align="center">
  <table>
    <tr>
      <td><img src="assets/readme/banner.gif" width="900" alt=""></td>
    </tr>
  </table>
</div>

# Ace

Bot do Fluxer chamado Ace, feito em cima do Yuzuha: utilidades, moderação e prefixo por servidor.

## Rodar

Precisa de Node 22.21 ou mais novo.

```sh
npm install
cp .env.example .env
```

Preencha `FLUXER_BOT_TOKEN` no `.env`. O `PREFIX` já vem como `a.`.

```sh
npm run dev        # CLI com recarga ao salvar
npm start          # mesma CLI, sem recarga
npm test           # suíte de testes
npm run typecheck  # tsc --noEmit
npm run check      # config, sem ler o .env
```

Com `npm run dev`, salvar recarrega `commands/` e, dentro de `src/`, a menção, o prefixo, a marca, os emojis, o cargo de entrada e o kick/ban, além do `PREFIX` do `.env`. `yuzuha.config.ts`, a própria CLI, os demais arquivos de `src/` e o token pedem reinício. Um listener novo no `setup` também.

## Comandos

O prefixo padrão é `a.`; cada servidor troca o seu com `a.setprefix`. Argumentos entre `[colchetes]` são opcionais.

| Comando | Argumentos | Faz |
|---|---|---|
| `a.ajuda` | | Lista os comandos do Ace. |
| `a.ping` | | Latência do Ace. |
| `a.uptime` | | Há quanto tempo o Ace está acordado. |
| `a.avatar` | `[usuário]` | Avatar seu ou de outro usuário. |
| `a.userbanner` | `[usuário]` | Banner seu ou de outro usuário. |
| `a.guildicon` | | Ícone do servidor atual. |
| `a.guildbanner` | | Banner do servidor atual. |
| `a.userinfo` | `[usuário]` | Informações suas ou de outro usuário. |
| `a.guildinfo` | | Informações do servidor atual. |
| `a.dumpemojis` | `[página]` | Lista os emojis do servidor (15 por página) e anexa um zip com todos. |
| `a.kick` | `<usuário> [motivo]` | Expulsa um membro do servidor. |
| `a.ban` | `<usuário> [motivo]` | Bane um membro do servidor. |
| `a.unban` | `<usuário> [motivo]` | Remove o banimento de um usuário. |
| `a.timeout` | `<usuário> <duração> [motivo]` | Silencia um membro temporariamente (até 28 dias). |
| `a.lock` | `[canal] [motivo]` | Tranca o canal para novas mensagens. |
| `a.unlock` | `[canal] [motivo]` | Destranca o canal novamente. |
| `a.clear` | `<n>` | Apaga as últimas mensagens do canal. |
| `a.purge` | `<usuário> [n]` | Apaga mensagens recentes de um membro no canal. |
| `a.setprefix` | `<prefixo>` ou `reset` | Troca o prefixo do Ace no servidor. |

`usuário` aceita menção, ID ou nome (nome resolve por busca no servidor; no `a.unban`, na lista de bans). Sem argumento, `a.avatar`, `a.userbanner` e `a.userinfo` mostram o seu.

`a.guildicon`, `a.guildbanner`, `a.userinfo`, `a.guildinfo`, `a.dumpemojis`, `a.kick`, `a.ban`, `a.unban`, `a.timeout`, `a.lock`, `a.unlock`, `a.clear`, `a.purge` e `a.setprefix` só rodam dentro de um servidor. `a.kick`, `a.ban` e `a.unban` pedem a permissão equivalente; `a.timeout` pede Moderar Membros; `a.lock` e `a.unlock` pedem Gerenciar Cargos; `a.clear` e `a.purge` pedem Gerenciar Mensagens; `a.setprefix` pede Gerenciar Servidor.

## Dados

O token fica só no `.env`; `data/` e `.env` nunca entram no Git. Variáveis (como o prefixo de cada servidor) vão para o diretório de dados do Yuzuha sob o nome `ace`.

`assets/` guarda a arte do Ace, fora de runtime: o avatar na raiz e o banner em `assets/readme/`.

## Roadmap

- Em estudo: `warn`, `snipe`, lembretes e log de moderação.
- Não planejado por enquanto: casos de moderação numerados.

## Mais

- [CHANGELOG.md](CHANGELOG.md): versões no estilo Hory, `v0.1.1-alpha` em desenvolvimento.
- [CONTRIBUTING.md](CONTRIBUTING.md): convenções de commit, testes e novos comandos.
- [LICENSE](LICENSE): AGPL-3.0.
