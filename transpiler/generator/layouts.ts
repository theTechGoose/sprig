/**
 * Generate Fresh layout from bootstrap.html
 */

import { join } from "@std/path";
import { htmlToJsx } from "../transformer/mod.ts";

/**
 * Write the root layout from bootstrap.html
 */
export async function writeBootstrapLayout(
  bootstrapHtmlPath: string,
  outDir: string,
): Promise<void> {
  const template = await Deno.readTextFile(bootstrapHtmlPath);

  // Transform HTML to JSX (slot becomes Component)
  const { jsx } = htmlToJsx(template, [], undefined, "layout");

  const content = `import { define } from "@/utils.ts";

export default define.layout(function RootLayout({ Component }) {
  return (
    ${jsx}
  );
});
`;

  const outputPath = join(outDir, "routes/_layout.tsx");
  const dir = outputPath.replace(/[/\\][^/\\]+$/, "");

  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(outputPath, content);
}
