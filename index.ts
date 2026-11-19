// Entrada pra hosts que só executam `bun <arquivo>` (ex.: egg Generic - Bun).
// Injeta `start` como subcomando padrão e delega pra CLI.
if (process.argv[2] === undefined) {
  process.argv[2] = 'start';
}
await import('./src/cli.js');

export {};
