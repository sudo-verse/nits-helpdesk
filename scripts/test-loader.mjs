// Node's native test runner (--experimental-strip-types) does not read
// tsconfig.json, so it has no idea "@/" means "src/" — every other tool in
// this project (tsc, ESLint, Next's bundler) does. This hook is the missing
// piece: it rewrites "@/x" to the real file under src/ before Node's default
// resolver ever sees it, trying the same extensions TypeScript would.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const base = path.join(projectRoot, "src", specifier.slice(2));
  const match = CANDIDATE_SUFFIXES.map((suffix) => base + suffix).find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );

  return nextResolve(pathToFileURL(match ?? `${base}.ts`).href, context);
}
