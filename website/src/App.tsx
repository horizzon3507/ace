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
      { name: "a.softban", desc: "expulsa e limpa mensagens recentes" },
      { name: "a.unban", desc: "desfaz um ban" },
      { name: "a.timeout", desc: "silencia por até 28 dias" },
      { name: "a.lock", desc: "tranca o canal" },
      { name: "a.unlock", desc: "destranca o canal" },
      { name: "a.clear", desc: "apaga as últimas mensagens" },
      { name: "a.purge", desc: "limpa mensagens de um membro" },
    ],
  },
  {
    label: "informações",
    commands: [
      { name: "a.ajuda", desc: "lista todos os comandos" },
      { name: "a.ping", desc: "latência do ace" },
      { name: "a.uptime", desc: "tempo acordado" },
      { name: "a.setprefix", desc: "troca o prefixo do ace no servidor" },
      { name: "a.userinfo", desc: "infos de usuário" },
      { name: "a.guildinfo", desc: "infos do servidor" },
    ],
  },
  {
    label: "utilidades",
    commands: [
      { name: "a.avatar", desc: "avatar seu ou de outro usuário" },
      { name: "a.userbanner", desc: "banner de usuário" },
      { name: "a.guildicon", desc: "ícone do servidor" },
      { name: "a.guildbanner", desc: "banner do servidor" },
      { name: "a.emojilist", desc: "lista os emojis do servidor" },
      { name: "a.emojidump", desc: "empacota os emojis num zip" },
    ],
  },
];

function App() {
  return (
    <>
      <nav>
        <div className="nav-bar">
          <a className="brand" href="/" aria-label="ace">
            <img src="assets/ace-face.png" alt="" width="28" height="28" />
          </a>
          <div className="nav-links">
            <a className="nav-link" href="#comandos">
              comandos
            </a>
            <a className="nav-link" href="#por-dentro">
              por dentro
            </a>
            <a className="nav-link" href={REPO_URL}>
              github
            </a>
            <a className="nav-cta" href={INVITE_URL}>
              adicionar
            </a>
          </div>
        </div>
      </nav>

      <main>
        <header className="hero">
          <h1>
            conheça o{" "}
            <img
              className="avatar"
              src="assets/ace-avatar-animado.png"
              alt=""
            />{" "}
            ace
          </h1>
          <p className="lede">
            heey! eu seguro a moderação com kicks, bans, timeouts e limpeza de
            mensagens, te conto tudo sobre usuários e o servidor, busco
            avatares e banners e ainda listo e empaco os emojis daqui.
          </p>
          <div className="cta">
            <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
              adicionar ao servidor
            </Button>
            <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
              github
            </Button>
          </div>
          <div className="shot-frame">
            <img
              className="hero-shot"
              src="assets/ace-ajuda.png"
              alt="O embed do a.ajuda no Fluxer, listando os comandos do Ace"
            />
          </div>
          <svg
            className="wave"
            viewBox="0 0 1440 140"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 72 C240 128 480 132 720 92 C960 52 1200 40 1440 84 L1440 140 L0 140 Z"
              fill="var(--bg)"
            />
          </svg>
        </header>

        <section className="steps" data-reveal>
          <h2>em três passos</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="card-inner">
                <span className="num">01</span>
                <p>
                  <strong>adiciona o ace</strong> ao servidor pelo convite
                </p>
              </div>
            </div>
            <div className="step">
              <div className="card-inner">
                <span className="num">02</span>
                <p>
                  troca o prefixo com <code>a.setprefix</code>, ou mantém o{" "}
                  <code>a.</code>
                </p>
              </div>
            </div>
            <div className="step">
              <div className="card-inner">
                <span className="num">03</span>
                <p>
                  <code>a.ajuda</code> mostra os vinte e um comandos
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="commands" id="comandos" data-reveal>
          <h2>vinte e um comandos</h2>
          <p className="section-lede">
            prefixo <code>a.</code> por padrão; cada servidor define o seu com{" "}
            <code>a.setprefix</code>.
          </p>
          {GROUPS.map((group) => (
            <div className="group" key={group.label}>
              <h3>{group.label}</h3>
              <div className="grid">
                {group.commands.map((command) => (
                  <div className="cmd" key={command.name}>
                    <div className="card-inner">
                      <code>{command.name}</code>
                      <p>{command.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="specs" id="por-dentro" data-reveal>
          <h2>por dentro</h2>
          <div className="frame">
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
          </div>
        </section>

        <section className="end" data-reveal>
          <p className="end-title">open source, AGPL-3.0, feito no yuzuha.</p>
          <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
            adicionar ao servidor
          </Button>
        </section>
      </main>

      <footer>
        <div className="foot-top">
          <div className="foot-brand">
            <img src="assets/ace-face.png" alt="" width="24" height="24" />
            <div>
              <span className="foot-name">ace</span>
              <span className="foot-tag">bot do fluxer, em pt-BR</span>
            </div>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <span className="foot-h">produto</span>
              <a href={INVITE_URL}>convite</a>
              <a href="#comandos">comandos</a>
              <a href="#por-dentro">por dentro</a>
            </div>
            <div className="foot-col">
              <span className="foot-h">projeto</span>
              <a href={REPO_URL}>github</a>
              <a href="https://www.npmjs.com/package/yuzuha">yuzuha</a>
              <a href="https://github.com/horizzon3507">horizzon</a>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>AGPL-3.0</span>
          <span>v0.1.1-alpha</span>
        </div>
      </footer>
    </>
  );
}

export default App;
