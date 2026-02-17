/**
 * SCSS/CSS style compilation and generation
 */

import { join, basename, extname } from "@std/path";
import { compileString } from "npm:sass@1.77.0";
import type { SprigComponent } from "../parser/mod.ts";

export interface CompiledStyle {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Compiled CSS content */
  css: string;
  /** Original source path */
  sourcePath: string;
}

/**
 * Compile SCSS/CSS for a component
 */
export async function compileComponentStyle(
  component: SprigComponent,
): Promise<CompiledStyle | null> {
  if (!component.metadata.styling) {
    return null;
  }

  const stylingPath = component.metadata.styling.startsWith("./")
    ? join(component.path, component.metadata.styling)
    : join(component.path, component.metadata.styling);

  let content: string;
  try {
    content = await Deno.readTextFile(stylingPath);
  } catch {
    console.warn(`Warning: Could not read styling at ${stylingPath}`);
    return null;
  }

  const ext = extname(stylingPath).toLowerCase();
  let css: string;

  if (ext === ".scss" || ext === ".sass") {
    // Compile SCSS/SASS
    try {
      const result = compileString(content, {
        syntax: ext === ".sass" ? "indented" : "scss",
        style: "compressed",
      });
      css = result.css;
    } catch (error) {
      console.warn(`Warning: SCSS compilation failed for ${stylingPath}:`, error);
      return null;
    }
  } else {
    // Plain CSS, pass through
    css = content;
  }

  // Determine output path
  const folder = component.metadata.island ? "islands" : "components";
  const outputPath = `static/css/${folder}/${component.metadata.className}.css`;

  return {
    outputPath,
    css,
    sourcePath: stylingPath,
  };
}

/**
 * Write all component styles to disk
 */
export async function writeComponentStyles(
  components: SprigComponent[],
  outDir: string,
): Promise<Map<string, string>> {
  const styleMap = new Map<string, string>(); // className -> CSS path

  for (const component of components) {
    const compiled = await compileComponentStyle(component);
    if (compiled) {
      const fullPath = join(outDir, compiled.outputPath);
      const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(fullPath, compiled.css);

      // Store the path for import generation
      styleMap.set(component.metadata.className, `/${compiled.outputPath}`);
    }
  }

  return styleMap;
}

/**
 * Generate CSS import for a component
 */
export function generateStyleImport(cssPath: string): string {
  return `import "${cssPath}";`;
}
