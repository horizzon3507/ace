import { Button } from "@ui-sdk/react/button";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

const GROUPS: { label: string; commands: { name: string; desc: string }[] }[] = [
  {
    label: "Moderação",
    commands: [
      { name: "a.kick", desc: "Expulsa um membro" },
      { name: "a.ban", desc: "Bane um membro" },
      { name: "a.softban", desc: "Expulsa e limpa mensagens recentes" },
      { name: "a.unban", desc: "Desfaz um ban" },
      { name: "a.timeout", desc: "Silencia por até 28 dias" },
      { name: "a.lock", desc: "Tranca o canal" },
      { name: "a.unlock", desc: "Destranca o canal" },
      { name: "a.clear", desc: "Apaga as últimas mensagens" },
      { name: "a.purge", desc: "Limpa mensagens de um membro" },
    ],
  },
  {
    label: "Informações",
    commands: [
      { name: "a.ajuda", desc: "Lista todos os comandos" },
      { name: "a.ping", desc: "Latência do Ace" },
      { name: "a.uptime", desc: "Tempo acordado" },
      { name: "a.setprefix", desc: "Troca o prefixo do Ace no servidor" },
      { name: "a.userinfo", desc: "Infos de usuário" },
      { name: "a.guildinfo", desc: "Infos do servidor" },
    ],
  },
  {
    label: "Utilidades",
    commands: [
      { name: "a.avatar", desc: "Avatar seu ou de outro usuário" },
      { name: "a.userbanner", desc: "Banner de usuário" },
      { name: "a.guildicon", desc: "Ícone do servidor" },
      { name: "a.guildbanner", desc: "Banner do servidor" },
      { name: "a.emojilist", desc: "Lista os emojis do servidor" },
      { name: "a.emojidump", desc: "Empacota os emojis num zip" },
    ],
  },
];

function App() {
  return (
    <>
      <nav>
        <div className="nav-bar">
          <a className="brand" href="/">Ace</a>
          <div className="nav-links">
            <a className="nav-link" href="#comandos">
              Comandos
            </a>
            <a className="nav-link" href="#por-dentro">
              Por dentro
            </a>
            <a className="nav-link" href={REPO_URL}>
              GitHub
            </a>
            <a className="nav-cta" href={INVITE_URL}>
              Adicionar
            </a>
          </div>
        </div>
      </nav>

      <main>
        <header className="hero">
          <div className="decor" aria-hidden="true">
            <span className="d ring" style={{ left: "7%", top: "26%" }} />
            <span
              className="d ring ring-sm"
              style={{ left: "90%", top: "18%" }}
            />
            <span
              className="d ring"
              style={{ left: "84%", top: "72%" }}
            />
            <span className="d dot" style={{ left: "16%", top: "14%" }} />
            <span
              className="d dot dot-cyan"
              style={{ left: "88%", top: "56%" }}
            />
            <span
              className="d dot dot-sm"
              style={{ left: "6%", top: "78%" }}
            />
            <span className="d plus" style={{ left: "12%", top: "58%" }} />
            <span
              className="d plus plus-sm"
              style={{ left: "86%", top: "34%" }}
            />
            <span className="d plus" style={{ left: "24%", top: "86%" }} />
            <svg
              className="d star"
              style={{ left: "78%", top: "10%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
            <svg
              className="d star star-sm"
              style={{ left: "5%", top: "44%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
            <svg
              className="d star"
              style={{ left: "94%", top: "84%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
          </div>
          <h1>
            Introduzindo:{" "}
            <img
              className="avatar"
              src="assets/ace-avatar-crop.png"
              alt=""
            />{" "}
            Ace
          </h1>
          <p className="lede">
            O bot que segura seu servidor inteiro. Moderação firme com kicks,
            bans e timeouts, respostas completas sobre usuários e o servidor,
            e utilidades que vão de avatares a emojis. 21 comandos, direto ao
            ponto.
          </p>
          <div className="cta">
            <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
              Adicionar ao servidor
            </Button>
            <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
              GitHub
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
              fill="#e9edf6"
            />
          </svg>
        </header>

        <section className="steps" data-reveal>
          <h2>Em três passos</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="card-inner">
                <span className="num">01</span>
                <p>
                  <strong>Adiciona o Ace</strong> ao servidor pelo convite
                </p>
              </div>
            </div>
            <div className="step">
              <div className="card-inner">
                <span className="num">02</span>
                <p>
                  Troca o prefixo com <code>a.setprefix</code>, ou mantém o{" "}
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
          <h2>Vinte e um comandos</h2>
          <p className="section-lede">
            Prefixo <code>a.</code> por padrão; cada servidor define o seu com{" "}
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
          <h2>Por dentro</h2>
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
          <p className="end-title">Open source, AGPL-3.0, feito no Yuzuha.</p>
          <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
            Adicionar ao servidor
          </Button>
        </section>
      </main>

      <footer>
        <div className="foot-bar">
        <div className="foot-top">
          <div className="foot-brand">
            <img src="assets/ace-face.png" alt="" width="24" height="24" />
            <div>
              <span className="foot-name">Ace</span>
              <span className="foot-tag">Bot do Fluxer, em pt-BR</span>
            </div>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <span className="foot-h">Produto</span>
              <a href={INVITE_URL}>Convite</a>
              <a href="#comandos">Comandos</a>
              <a href="#por-dentro">Por dentro</a>
            </div>
            <div className="foot-col">
              <span className="foot-h">Projeto</span>
              <a href={REPO_URL}>GitHub</a>
              <a href="https://www.npmjs.com/package/yuzuha">Yuzuha</a>
              <a href="https://github.com/horizzon3507">Horizzon</a>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>AGPL-3.0</span>
          <span>v0.1.1-alpha</span>
        </div>
        </div>
      </footer>
    </>
  );
}

export default App;
