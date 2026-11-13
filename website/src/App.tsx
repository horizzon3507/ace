import { Button } from "@ui-sdk/react/button";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

const GROUPS: { label: string; commands: { name: string; desc: string }[] }[] = [
  {
    label: "moderação",
    commands: [
      { name: "a.kick", desc: "expulsa um membro" },
      { name: "a.ban", desc: "bane um membro" },
      { name: "a.unban", desc: "desfaz um ban" },
      { name: "a.timeout", desc: "silencia por até 28 dias" },
      { name: "a.lock", desc: "tranca o canal" },
      { name: "a.unlock", desc: "destranca o canal" },
      { name: "a.clear", desc: "apaga as últimas mensagens" },
      { name: "a.purge", desc: "limpa mensagens de um membro" },
    ],
  },
  {
    label: "utilidade",
    commands: [
      { name: "a.ajuda", desc: "lista todos os comandos" },
      { name: "a.ping", desc: "latência do ace" },
      { name: "a.uptime", desc: "tempo acordado" },
      { name: "a.avatar", desc: "avatar seu ou de outro usuário" },
      { name: "a.userbanner", desc: "banner de usuário" },
      { name: "a.userinfo", desc: "infos de usuário" },
      { name: "a.guildicon", desc: "ícone do servidor" },
      { name: "a.guildbanner", desc: "banner do servidor" },
      { name: "a.guildinfo", desc: "infos do servidor" },
    ],
  },
  {
    label: "servidor",
    commands: [
      { name: "a.setprefix", desc: "troca o prefixo do ace no servidor" },
    ],
  },
];

function App() {
  return (
    <>
      <nav>
        <a className="brand" href="/">
          <img src="assets/ace.svg" alt="" width="18" height="18" />
          ace
        </a>
        <a className="nav-link" href={REPO_URL}>
          github
        </a>
      </nav>

      <main>
        <header className="hero">
          <div className="lockup">
            <img
              className="avatar"
              src="assets/ace-avatar-animado.png"
              alt="Ace, a esfera azul do bot"
            />
            <h1>Ace</h1>
          </div>
          <p className="lede">
            moderação e utilidade pro seu servidor do Fluxer — dezoito comandos,
            em pt-BR, com prefixo por servidor.
          </p>
          <div className="cta">
            <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
              adicionar ao servidor
            </Button>
            <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
              github
            </Button>
          </div>
        </header>

        <section className="steps" data-reveal>
          <h2>em três passos</h2>
          <div className="steps-grid">
            <div className="step">
              <span className="num">01</span>
              <p>
                <strong>adiciona o ace</strong> ao servidor pelo convite
              </p>
            </div>
            <div className="step">
              <span className="num">02</span>
              <p>
                troca o prefixo com <code>a.setprefix</code> — ou fica no{" "}
                <code>a.</code>
              </p>
            </div>
            <div className="step">
              <span className="num">03</span>
              <p>
                <code>a.ajuda</code> mostra os dezoito comandos
              </p>
            </div>
          </div>
        </section>

        <section className="commands" data-reveal>
          <h2>dezoito comandos</h2>
          <p className="section-lede">
            prefixo <code>a.</code> — cada servidor troca o seu com{" "}
            <code>a.setprefix</code>.
          </p>
          {GROUPS.map((group) => (
            <div className="group" key={group.label}>
              <h3>{group.label}</h3>
              <div className="grid">
                {group.commands.map((command) => (
                  <div className="cmd" key={command.name}>
                    <code>{command.name}</code>
                    <p>{command.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="specs" data-reveal>
          <h2>por dentro</h2>
          <dl>
            <div>
              <dt>framework</dt>
              <dd>yuzuha</dd>
            </div>
            <div>
              <dt>runtime</dt>
              <dd>node 22.21+</dd>
            </div>
            <div>
              <dt>linguagem</dt>
              <dd>typescript</dd>
            </div>
            <div>
              <dt>licença</dt>
              <dd>AGPL-3.0</dd>
            </div>
          </dl>
        </section>

        <section className="end" data-reveal>
          <p className="end-title">open source, AGPL-3.0, feito no yuzuha.</p>
          <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
            adicionar ao servidor
          </Button>
        </section>
      </main>

      <footer>
        <a href="https://github.com/horizzon3507">horizzon</a>
        <span>·</span>
        <a href="https://www.npmjs.com/package/yuzuha">yuzuha</a>
        <span>·</span>
        <span>v0.1.1-alpha</span>
      </footer>
    </>
  );
}

export default App;
