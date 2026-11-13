import { Button } from "@ui-sdk/react/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

type Command = { name: string; hint: string };

const GROUPS: { title: string; commands: Command[] }[] = [
  {
    title: "Utilidade",
    commands: [
      { name: "a.ajuda", hint: "lista os comandos" },
      { name: "a.ping", hint: "latência do bot" },
      { name: "a.uptime", hint: "tempo acordado" },
      { name: "a.avatar", hint: "avatar seu ou de alguém" },
      { name: "a.userbanner", hint: "banner seu ou de alguém" },
      { name: "a.guildicon", hint: "ícone do servidor" },
      { name: "a.guildbanner", hint: "banner do servidor" },
      { name: "a.userinfo", hint: "infos suas ou de alguém" },
      { name: "a.guildinfo", hint: "infos do servidor" },
    ],
  },
  {
    title: "Moderação",
    commands: [
      { name: "a.kick", hint: "expulsa um membro" },
      { name: "a.ban", hint: "bane um membro" },
      { name: "a.unban", hint: "remove o ban" },
      { name: "a.timeout", hint: "silencia temporariamente" },
      { name: "a.lock", hint: "tranca o canal" },
      { name: "a.unlock", hint: "destranca o canal" },
      { name: "a.clear", hint: "apaga as últimas mensagens" },
      { name: "a.purge", hint: "apaga msgs de um membro" },
      { name: "a.setprefix", hint: "troca o prefixo do servidor" },
    ],
  },
];

function CommandChip({ name, hint }: Command) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger render={<code className="chip" />}>{name}</TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </li>
  );
}

function App() {
  return (
    <main>
      <img
        className="avatar"
        src="assets/ace-avatar-animado.gif"
        alt="Ace, a esfera azul do bot"
      />

      <h1>Ace</h1>
      <p className="status">
        <strong>online</strong> e estável
      </p>
      <p className="tagline">
        Bot do Fluxer — utilidade e moderação. Prefixo <code>a.</code>, troca
        com <code>a.setprefix</code>.
      </p>

      <div className="cta">
        <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
          Adicionar ao servidor
        </Button>
        <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
          GitHub
        </Button>
      </div>

      <div className="commands">
        {GROUPS.map((group) => (
          <section className="group" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.commands.map((command) => (
                <CommandChip key={command.name} {...command} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer>
        <a href="https://github.com/horizzon3507">horizzon</a> ·{" "}
        <a href="https://www.npmjs.com/package/yuzuha">Yuzuha</a> · v0.1.1-alpha
      </footer>
    </main>
  );
}

export default App;
