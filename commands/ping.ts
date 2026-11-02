import { defineCommand } from 'yuzuha';

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
  ],
  async run(ctx) {
    const ping = ctx.transport.ping;
    const status = connectionStatus(ping);
    await ctx.reply(`<:globefill:1566571242956263426> Pong! A minha conexão com este servidor está **${status}** (**${ping}**ms).`);
  },
});
