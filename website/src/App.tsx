import { Button } from "@ui-sdk/react/button";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

const CHAT: { from: "user" | "ace"; text: string }[] = [
  { from: "user", text: "a.ping" },
  { from: "ace", text: "pong! 23ms" },
  { from: "user", text: "a.uptime" },
  { from: "ace", text: "acordado há 42 dias, 7 horas" },
  { from: "user", text: "a.lock" },
  { from: "ace", text: "#geral trancado." },
];

function App() {
  return (
    <main>
      <img
        className="avatar"
        src="assets/ace-avatar-animado.gif"
        alt="Ace, a esfera azul do bot"
      />

      <h1>Ace</h1>
      <p className="lede">
        organize e modere seu servidor do Fluxer com dezoito comandos em pt-BR.
      </p>

      <div className="cta">
        <Button className="btn btn-primary" render={<a href={INVITE_URL} />}>
          adicionar ao servidor
        </Button>
        <Button className="btn btn-ghost" render={<a href={REPO_URL} />}>
          github
        </Button>
      </div>

      <div className="chat" aria-label="exemplo de conversa com o Ace">
        {CHAT.map((message) => (
          <p className={`msg msg-${message.from}`} key={message.text}>
            <span className="who">{message.from === "ace" ? "ace" : "você"}</span>
            {message.text}
          </p>
        ))}
      </div>

      <footer>
        <a href="https://github.com/horizzon3507">horizzon</a>
        <span>·</span>
        <a href="https://www.npmjs.com/package/yuzuha">yuzuha</a>
        <span>·</span>
        <span>v0.1.1-alpha</span>
      </footer>
    </main>
  );
}

export default App;
