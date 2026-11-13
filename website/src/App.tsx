import { Button } from "@ui-sdk/react/button";

const INVITE_URL =
  "https://web.fluxer.app/oauth2/authorize?client_id=1565400101596172288&scope=bot&permissions=18014398509829120";
const REPO_URL = "https://github.com/horizzon3507/ace";

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
