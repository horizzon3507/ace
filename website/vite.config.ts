import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const commit = (() => {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "";
  }
})();

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __COMMIT_SHA__: JSON.stringify(commit),
  },
});
