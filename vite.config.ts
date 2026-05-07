// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const envDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  vite: {
    // Ensure Vite loads `.env` from this folder even if a wrapper changes `root`.
    envDir,
    // Ensure Supabase keys are exposed to `import.meta.env` in the browser build.
    // (Some wrapper configs may override envPrefix.)
    envPrefix: ["VITE_", "SUPABASE_"],
  },
});
