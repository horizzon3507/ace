import { Button } from "@ui-sdk/react/button";
import { useEffect } from "react";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

type Cmd = { name: string; desc: string };

const GROUPS: { label: string; commands: Cmd[] }[] = [
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

const ALL_COMMANDS: Cmd[] = GROUPS.flatMap((g) => g.commands);
const STRIPS: Cmd[][] = [[], [], []];
ALL_COMMANDS.forEach((c, i) => STRIPS[i % 3].push(c));

function App() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    document.documentElement.classList.add("io");
    const check = () => {
      for (const el of els) {
        if (el.classList.contains("revealed")) continue;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.88) {
          el.classList.add("revealed");
        }
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    const t = window.setTimeout(check, 400);
    return () => {
      window.removeEventListener("scroll", check);
      window.clearTimeout(t);
      document.documentElement.classList.remove("io");
    };
  }, []);

  return (
    <>
      <nav>
        <div className="nav-bar">
          <a className="brand" href="/">
            <img
              src="assets/ace-face-white.png"
              alt="Ace"
              width="24"
              height="24"
            />
            Ace
          </a>
          <div className="nav-links">
            <a className="nav-link" href="#comandos">
              Comandos
            </a>
            <a className="nav-link" href="#instalacao">
              Instalação
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
            <svg
              className="d star star-sm"
              style={{ left: "14%", top: "80%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
            <svg
              className="d star"
              style={{ left: "88%", top: "38%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
            <svg
              className="d star star-sm"
              style={{ left: "22%", top: "12%" }}
              viewBox="0 0 16 16"
            >
              <path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
          </div>
          <h1>Introduzindo: Ace</h1>
          <p className="lede">
            A aplicação perfeita para gerenciar o seu servidor! Moderação
            rápida e intuitiva, utilidades prontas para uso, manipulação de
            avatares e emojis, entre outros, tudo direto ao ponto.
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
              fill="#232a72"
            />
          </svg>
        </header>

        <div className="band">
          <section className="steps">
            <h2 data-reveal>Em três passos</h2>
            <div className="feats">
              <div className="feat" data-reveal>
                <div className="feat-text">
                  <span className="num">01</span>
                  <h3>Adiciona o Ace</h3>
                  <p>
                    Pelo convite, o Ace entra no seu servidor pronto pra usar,
                    com o prefixo <code>a.</code> de fábrica.
                  </p>
                </div>
                <div className="feat-media">
                  <div className="mock">
                    <div className="mock-embed">
                      <div className="mock-head">
                        <img
                          src="assets/ace-face-white.png"
                          alt=""
                          width="34"
                          height="34"
                        />
                        <div className="mock-headtext">
                          <strong>Ace</strong>
                          <span>quer entrar no seu servidor</span>
                        </div>
                      </div>
                      <div className="mock-btn">Autorizar</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="feat" data-reveal>
                <div className="feat-text">
                  <span className="num">02</span>
                  <h3>Troca o prefixo</h3>
                  <p>
                    Cada servidor define o seu com <code>a.setprefix</code>, ou
                    mantém o <code>a.</code> padrão.
                  </p>
                </div>
                <div className="feat-media">
                  <div className="mock">
                    <div className="mock-line">
                      <span className="mock-user">horizzon3507</span>
                      <span className="mock-text">a.setprefix !</span>
                    </div>
                    <div className="mock-embed">
                      <strong>Ace</strong>
                      <p>
                        Prefixo trocado para <code>!</code> neste servidor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="feat" data-reveal>
                <div className="feat-text">
                  <span className="num">03</span>
                  <h3>Roda o a.ajuda</h3>
                  <p>
                    O <code>a.ajuda</code> lista os vinte e um comandos, direto
                    no chat, paginado.
                  </p>
                </div>
                <div className="feat-media">
                  <div className="chat" aria-label="Prévia do embed do a.ajuda no Fluxer">
                    <div className="msg">
                      <span className="m-av m-av-user" aria-hidden="true" />
                      <p className="m-text">
                        <b className="m-user">horizzon3507</b>
                        <span className="m-cmd">a.ajuda</span>
                      </p>
                    </div>
                    <div className="msg">
                      <img
                        className="m-av"
                        src="assets/ace-face.png"
                        alt=""
                        width="36"
                        height="36"
                      />
                      <div className="m-col">
                        <div className="m-head">
                          <b>Ace</b>
                          <span className="m-tag">Bot</span>
                          <span className="m-time">Hoje às 19:07</span>
                        </div>
                        <div className="embx">
                          <p className="e-title">
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M8 1.6 1.8 7v7.4h4.4v-3.8h3.6v3.8h4.4V7z" />
                            </svg>
                            Ace
                          </p>
                          <p className="e-desc">
                            Heey! Eu sou o <b>Ace</b>! Eu seguro a{" "}
                            <b>moderação</b> com kicks, bans, timeouts e limpeza
                            de mensagens, te conto tudo sobre <b>usuários</b> e
                            este <b>servidor</b>, busco artes como{" "}
                            <b>avatares</b> e <b>banners</b> e listo e empaco os{" "}
                            <b>emojis</b> daqui…
                          </p>
                          <ul className="e-list">
                            <li>
                              Prefixo: <code>a.</code>
                            </li>
                            <li>
                              Comandos: <b>21</b>
                            </li>
                            <li>
                              Versão: <code>0.1.1</code>
                            </li>
                            <li>
                              Acordado: <b>há 5 minutos e 26 segundos</b>
                            </li>
                            <li>
                              Detentor:{" "}
                              <span className="e-mention">@horizzon3507</span>
                            </li>
                          </ul>
                          <p className="e-foot">Página 1 de 4 — Sobre mim</p>
                        </div>
                        <div className="reacts" aria-hidden="true">
                          <span className="rct">→ 1</span>
                          <span className="rct">⌂ 1</span>
                          <span className="rct">☺</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="commands" id="comandos">
            <h2 data-reveal>Vinte e um comandos</h2>
            <p className="section-lede" data-reveal>
              Prefixo <code>a.</code> por padrão; cada servidor define o seu
              com <code>a.setprefix</code>.
            </p>
            <div className="strips">
              {STRIPS.map((strip, i) => (
                <div className="strip" key={i}>
                  <div
                    className="strip-track"
                    style={{ animationDelay: `${-i * 6}s` }}
                  >
                    {[...strip, ...strip].map((command, j) => (
                      <div
                        className={`chip${j >= strip.length ? " dup" : ""}`}
                        aria-hidden={j >= strip.length}
                        key={`${command.name}-${j}`}
                      >
                        <code>{command.name}</code>
                        <span>{command.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="install" id="instalacao" data-reveal>
            <h2>Instalação</h2>
            <p className="section-lede">
              Node 22.21 ou mais novo; feito no Yuzuha, em TypeScript,
              AGPL-3.0.
            </p>
            <div className="frame">
              <pre className="term">
                <code>
                  <span className="cmd-line">npm install</span>{"\n"}
                  <span className="cmd-line">cp .env.example .env</span>{"  "}
                  <span className="c"># preencha FLUXER_BOT_TOKEN</span>{"\n"}
                  <span className="cmd-line">npm run dev</span>{"            "}
                  <span className="c"># CLI com recarga ao salvar</span>{"\n"}
                  <span className="cmd-line">npm start</span>{"              "}
                  <span className="c"># produção</span>{"\n"}
                </code>
              </pre>
            </div>
          </section>

          <section className="end" data-reveal>
            <p className="end-title">Convida o Ace pro seu servidor.</p>
            <div className="cta">
              <Button
                className="btn btn-primary"
                render={<a href={INVITE_URL} />}
              >
                Adicionar ao servidor
              </Button>
              <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
                GitHub
              </Button>
            </div>
            <div className="end-links">
              <a href={INVITE_URL}>Convite</a>
              <a href={REPO_URL}>Código fonte</a>
              <a href="https://www.npmjs.com/package/yuzuha">Yuzuha</a>
            </div>
          </section>

          <svg
            className="dome"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 120 L0 96 C480 8 960 8 1440 96 L1440 120 Z"
              fill="var(--paper)"
            />
          </svg>
        </div>
      </main>

      <footer>
        <div className="foot-inner">
          <div className="foot-top">
            <div className="foot-brand">
              <div className="foot-lockup">
                <img
                  src="assets/ace-face-white.png"
                  alt=""
                  width="30"
                  height="30"
                />
                <span className="foot-name">Ace</span>
              </div>
              <p className="foot-desc">
                O Ace é um bot open source para o Fluxer, feito no Yuzuha em
                TypeScript. Moderação, informações e utilidades, tudo em
                pt-BR.
              </p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <span className="foot-h">Produto</span>
                <a href={INVITE_URL}>Convite</a>
                <a href="#comandos">Comandos</a>
                <a href="#instalacao">Instalação</a>
              </div>
              <div className="foot-col">
                <span className="foot-h">Projeto</span>
                <a href={REPO_URL}>GitHub</a>
                <a href="https://www.npmjs.com/package/yuzuha">Yuzuha</a>
                <a href="https://github.com/horizzon3507">Horizzon</a>
              </div>
              <div className="foot-col">
                <span className="foot-h">Jurídico</span>
                <a href="https://github.com/horizzon3507/ace/blob/main/LICENSE">
                  Licença AGPL-3.0
                </a>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>
              Open source,{" "}
              <a href="https://github.com/horizzon3507/ace/blob/main/LICENSE">
                AGPL-3.0
              </a>
            </span>
            <span>
              v0.1.1-alpha
              {__COMMIT_SHA__ && (
                <>
                  {" · "}
                  <a
                    href={`${REPO_URL}/commit/${__COMMIT_SHA__}`}
                    className="foot-commit"
                  >
                    {__COMMIT_SHA__.slice(0, 7)}
                  </a>
                </>
              )}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
