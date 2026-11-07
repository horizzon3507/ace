// Entrada pra hosts que só executam `bun <arquivo>` (ex.: egg Generic - Bun).
// Injeta `start` como subcomando padrão e delega pra CLI.
process.argv[2] ??= 'start';
await import('./src/cli.ts');
