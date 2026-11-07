import { emoji } from './emoji.js';

const invite = 'https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120';

export function mentionMessage(commandPrefix: string): string {
  return `${emoji.happy} Heey! Me chamo **Ace**. Sou uma aplicação **multifuncional** para o Fluxer. Saiba mais usando \`${commandPrefix}ajuda\` e [me adicione](${invite}) em seu servidor!`;
}

export function unknownCommandMessage(content: string, commandPrefix: string, names: readonly string[]): string | undefined {
  if (!commandPrefix || !content.startsWith(commandPrefix)) return;
  const name = /^(\S+)/.exec(content.slice(commandPrefix.length).trim())?.[1]?.toLowerCase();
  if (!name) return;
  const known = new Set(names.map((item) => item.toLowerCase()));
  if (known.has(name)) return;
  return `${emoji.unhappy} Infelizmente, eu **não consegui encontrar nenhum comando** com este nome.\n-# ╰ Psst, você pode usar \`${commandPrefix}ajuda\` para ver meus comandos!`;
}

export function isBareMention(content: string, selfId: string, mentioned: boolean): boolean {
  if (!mentioned) return false;
  const stripped = content.replaceAll(new RegExp(`<@!?${selfId}>`, 'g'), '').trim();
  return stripped.length === 0;
}
