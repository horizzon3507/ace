import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ui-sdk/core/web.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
