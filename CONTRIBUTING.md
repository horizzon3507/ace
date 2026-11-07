# Contribuindo

## Ambiente

Node 22.21 ou mais novo. `npm install`, copie `.env.example` para `.env` e preencha `FLUXER_BOT_TOKEN`.

## Antes de commitar

```sh
npm run typecheck
npm test
```

Os dois precisam passar. Os testes rodam com `tsx --test` sobre `test/`.

## Commits

Um commit por mudança lógica, no estilo breakable-commits:

- Prefixos `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`.
- Cada commit precisa ser pequeno, revisável e deixar o projeto funcionando.
- Mensagens em pt-BR no infinitivo, como o histórico — `feat: comando uptime`, `fix: rejeita prefixo com espaco`.
- Nada de `wip`, commit vazio ou dois assuntos no mesmo commit.
- `.env`, `data/` e qualquer segredo nunca entram.

## Branches

Desenvolve no `canary`, tudo local — commits e validação (`npm run typecheck` + `npm test`) ficam na máquina. Nada é pushado até o dono do repo pedir; aí vão as duas:

```sh
git push origin canary canary:main
```

As duas branches seguem o mesmo histórico — o clone de produção observa `main` e o de homologação observa `canary`, e o deploy-watch de cada instância se atualiza quando a sua branch muda no GitHub.

## Novo comando

1. `commands/nome.ts` com `defineCommand` — `name`, `description`, `aliases`, `cooldown`, e `guildOnly`/`permissions`/`botPermissions` quando couber.
2. Textos em pt-BR, emojis via `emoji` de `src/emoji.ts` — resolva dentro do `run()` para o hot-reload pegar; emoji novo entra como chave nova nesse arquivo.
3. Asset, embed ou moderação? Reuse os runners de `src/` (`replyUserAsset`, `replyGuildAsset`, `replyAsset`, `runModeration`) em vez de duplicar fetch/reply.
4. Registre o nome no `categories` de `commands/ajuda.ts`, senão o comando cai em "Outros".
5. Teste em `test/` no padrão dos existentes (`createTestBot` de `yuzuha/testing`).
6. Bullet na versão em desenvolvimento do `CHANGELOG.md` — adições entram; edições e fixes de adições, não.
7. Linha na tabela de comandos do `README.md`.

## Hot-reload

Com `npm run dev`, salvar recarrega `commands/` e os arquivos de runtime de `src/` (menção, prefixo, marca, emojis, cargo de entrada, kick/ban). `yuzuha.config.ts`, a CLI e o resto de `src/` pedem reinício. Estado global que se reconstrói a cada reload não se sustenta — cache de prefixo vive na store do Yuzuha por isso.
