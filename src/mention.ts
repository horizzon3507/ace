import { emoji } from './emoji.js';

const invite = 'https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120';
const FIRST_TOKEN_RE = /^(\S+)/;
const MAX_REGEX_CACHE = 64;
const mentionRegexCache = new Map<string, RegExp>();
const knownNamesCache = new WeakMap<readonly string[], Set<string>>();

function getMentionRegex(selfId: string): RegExp {
  let re = mentionRegexCache.get(selfId);
  if (!re) {
    if (mentionRegexCache.size >= MAX_REGEX_CACHE) {
      const oldest = mentionRegexCache.keys().next().value;
      if (oldest !== undefined) mentionRegexCache.delete(oldest);
    }
    re = new RegExp(`<@!?${selfId}>`, 'g');
    mentionRegexCache.set(selfId, re);
  }
  return re;
}

function getKnownSet(names: readonly string[]): Set<string> {
  let set = knownNamesCache.get(names);
  if (!set) {
    set = new Set<string>();
    for (let i = 0; i < names.length; i += 1) {
      set.add(names[i]!.toLowerCase());
    }
    knownNamesCache.set(names, set);
  }
  return set;
}

export function mentionMessage(commandPrefix: string): string {
  return `${emoji.happy} Heey! Me chamo **Ace**. Sou uma aplicação **multifuncional** para o Fluxer. Saiba mais usando \`${commandPrefix}ajuda\` e [me adicione](${invite}) em seu servidor...`;
}

export function unknownCommandMessage(content: string, commandPrefix: string, names: readonly string[]): string | undefined {
  if (!commandPrefix || !content.startsWith(commandPrefix)) return undefined;
  const name = FIRST_TOKEN_RE.exec(content.slice(commandPrefix.length).trim())?.[1]?.toLowerCase();
  if (!name) return undefined;
  if (getKnownSet(names).has(name)) return undefined;
  return `${emoji.unhappy} Infelizmente, eu **não consegui encontrar nenhum comando** com este nome.\n-# ╰ Psst, você pode usar \`${commandPrefix}ajuda\` para ver meus comandos...`;
}

export function isBareMention(content: string, selfId: string, mentioned: boolean): boolean {
  if (!mentioned) return false;
  const stripped = content.replaceAll(getMentionRegex(selfId), '').trim();
  return stripped.length === 0;
}
