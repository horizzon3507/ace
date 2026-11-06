# Segurança

O Ace é uma aplicação de moderação: bugs que afetam permissões (`lock`/`unlock`, `kick`, `ban`) ou expõem canais/dados são tratados como vulnerabilidade.

## Reportar uma vulnerabilidade

**Não abra issue pública.** Reporte por um destes canais:

- **GitHub → aba Security → "Report a vulnerability"** (recomendado; privado por padrão)
- DM para o autor no Fluxer, se preferir

Inclua:

- Comando ou fluxo afetado (`a.lock`, `a.ban`, menção, etc.)
- O que aconteceu vs. o que deveria acontecer
- Como reproduzir (passos, servidor, permissões envolvidas)
- Logs relevantes, sem tokens ou dados pessoais

## Versões suportadas

O projeto está em desenvolvimento ativo — apenas a versão mais recente na branch `main` recebe correções de segurança.

| Versão | Suporte |
| ------ | ------- |
| `main` | Sim |

## Resposta

Correções de vulnerabilidade têm prioridade sobre features. O reporte é respondido assim que possível e a correção sai na `main` antes de qualquer menção pública no changelog.
