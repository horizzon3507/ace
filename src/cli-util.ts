import { ScriptError, YuzuhaError } from 'yuzuha';
import { formatLine, useColor } from './term.js';

export function usage(): string {
  return [
    'Uso:',
    '',
    '  npm run dev       sobe e recarrega comandos, menção, prefixo, marca, cargo, kick/ban e PREFIX',
    '  npm start         sobe sem recarregar',
    '',
    '  npm run check       confere os comandos, sem login',
    '  npm run typecheck   confere os tipos',
    '  npm test            roda os testes',
  ].join('\n');
}

export function clock(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function colorEnabled(): boolean {
  return useColor(process.stdout, process.env);
}

export function redact(text: string): string {
  const token = process.env.FLUXER_BOT_TOKEN;
  if (!token || !text.includes(token)) return text;
  return text.split(token).join('[token]');
}

export function explain(error: unknown): string {
  const raw = error instanceof ScriptError
    ? error.format()
    : error instanceof YuzuhaError
      ? `${error.code}  ${error.message}`
      : error instanceof Error
        ? error.message || error.name
        : String(error);
  if (/invalid or expired authorization token/i.test(raw)) return 'token recusado. Confira FLUXER_BOT_TOKEN.';
  return raw;
}

export function gatewayDetail(error: unknown): string | null {
  const message = error instanceof Error ? error.message : '';
  if (/authentication failed|\b4004\b/i.test(message)) return 'token recusado (4004). Confira FLUXER_BOT_TOKEN e reinicie.';
  if (message === 'WebSocket error') return 'conexão perdida. O Fluxer tenta de novo.';
  return null;
}

export function emit(label: string, detail: string): void {
  const stderr = label === 'erro';
  const line = formatLine(clock(), label, redact(detail), useColor(stderr ? process.stderr : process.stdout, process.env));
  if (stderr) console.error(line);
  else console.log(line);
}
