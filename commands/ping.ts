import { defineCommand } from 'yuzuha';
import { emoji } from '../src/emoji.js';

function connectionStatus(ping: number): string {
  if (ping < 50) return 'incrível';
  if (ping < 150) return 'normal';
  if (ping < 300) return 'razoável';
  return 'péssima';
}

export default defineCommand({
  name: 'ping',
  description: 'Latência do Ace.',
  aliases: [
    'latency', 'ms', 'pong', 'latencia', 'latência', 'pingpong', 'pings',
    'lat', 'response', 'resposta', 'speed', 'velocidade', 'delay',
    'p', 'lag', 'conexao', 'conexão', 'latencytest', 'roundtrip',
  ],
  cooldown: '3s',
  async run(ctx) {
    const ping = ctx.transport.ping;
    if (!Number.isFinite(ping) || ping < 0) {
      await ctx.reply(`${emoji.globe} Eu ainda estou sem amostras de latência, tente de novo em alguns instantes...`);
      return;
    }
    await ctx.reply(`${emoji.globe} Pong! A minha conexão com este servidor está **${connectionStatus(ping)}** (${ping}ms)...`);
  },
});
