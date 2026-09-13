import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const EXTENSIONS = ['.ts', '.mts', '.js', '.mjs', '.json'];

function isDirectory(filePath) {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function withExtension(filePath) {
  if (path.extname(filePath) && existsSync(filePath) && !isDirectory(filePath)) return filePath;
  for (const ext of EXTENSIONS) {
    if (existsSync(filePath + ext)) return filePath + ext;
  }
  if (isDirectory(filePath)) {
    for (const ext of EXTENSIONS) {
      const index = path.join(filePath, `index${ext}`);
      if (existsSync(index)) return index;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let candidate = null;
  if (specifier.startsWith('@/')) {
    candidate = path.join(SRC_DIR, specifier.slice(2));
  } else if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL?.startsWith('file:')
  ) {
    candidate = fileURLToPath(new URL(specifier, context.parentURL));
  }
  if (candidate) {
    const resolved = withExtension(candidate);
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }
  return nextResolve(specifier, context);
}
