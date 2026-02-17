/**
 * Generate Fresh route files from Sprig routes
 */

import { join } from "@std/path";
import type { SprigComponent, InputMetadata } from "../parser/mod.ts";
import { parseClass, transformMethodBody, type InputInfo } from "../parser/mod.ts";
import { htmlToJsx, hasInteractiveBindings } from "../transformer/mod.ts";

export interface GeneratedRoute {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Generated TSX content */
  content: string;
}

/**
 * Generate data destructuring for route inputs
 * Routes receive data from handlers, so we destructure from `data` not `props`
 */
function generateDataDestructuring(inputs: InputMetadata[]): string {
  const lines: string[] = [];

  for (const input of inputs) {
    const varName = input.propertyName;

    if (input.defaultValue) {
      // Use nullish coalescing for default value
      lines.push(`  const ${varName} = data.${input.name} ?? ${input.defaultValue};`);
    } else {
      lines.push(`  const ${varName} = data.${input.name};`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate route file from Sprig route component
 */
export function generateRoute(
  route: SprigComponent,
  allComponents: SprigComponent[],
): GeneratedRoute {
  // Routes cannot have interactive bindings - they're server components
  // Property bindings [prop]="value" and interpolation {{var}} are allowed
  // Event bindings (click)="handler" and two-way bindings [(value)]="var" are NOT allowed
  if (hasInteractiveBindings(route.template)) {
    throw new Error(
      `Route "${route.relativePath}" has interactive bindings (events or two-way) but routes are server components.\n` +
      `Move interactive logic to an island component (island: true).`
    );
  }

  const { jsx, imports, usedPipes, usedDirectives } = htmlToJsx(route.template, allComponents);

  // Parse class for getters and methods
  const parsedClass = parseClass(route.source);
  const inputs = route.inputs || [];
  const hasInputs = inputs.length > 0;
  const hasGetters = parsedClass?.getters && parsedClass.getters.length > 0;

  // Extract route path from relativePath
  // Modular: landing/routes/index -> landing/index
  // Legacy: routes/index -> index
  // Special: home/routes/index -> index (home module maps to /)
  // The "routes/" segment is organizational only in source
  const routePath = route.relativePath
    .replace(/\/routes\//, "/")        // Strip /routes/ segment (keep module)
    .replace(/^routes\//, "")          // Strip leading routes/ (legacy)
    .replace(/^\([^)]+\)\/routes\//, "") // Strip route groups
    .replace(/^home\//, "")            // "home" module maps to root
    .replace(/^home$/, "index")        // Bare "home" -> index
    .replace(/_app\/?$/, "");

  let outputPath: string;
  const dynamicMatch = route.originalFilename.match(/^\[([^\]]+)\]\.ts$/);

  if (dynamicMatch) {
    // Dynamic route: [id].ts -> routes/[id].tsx
    const filename = `[${dynamicMatch[1]}].tsx`;
    outputPath = `routes/${routePath}/${filename}`.replace(/\/+/g, "/");
  } else if (routePath === "index" || routePath === "") {
    // Root route: routes/index/mod.ts -> routes/index.tsx (maps to /)
    outputPath = "routes/index.tsx";
  } else if (routePath.endsWith("/index")) {
    // Nested index: routes/foo/index/mod.ts -> routes/foo/index.tsx
    outputPath = `routes/${routePath.replace(/\/index$/, "")}/index.tsx`.replace(/\/+/g, "/");
  } else {
    // Regular route: routes/about/mod.ts -> routes/about.tsx
    outputPath = `routes/${routePath}.tsx`.replace(/\/+/g, "/");
  }

  const importLines: string[] = [
    'import { define } from "@/utils.ts";',
  ];

  // Add custom pipe imports
  if (usedPipes && usedPipes.length > 0) {
    for (const pipe of usedPipes) {
      importLines.push(`import { ${pipe.functionName} } from "${pipe.importPath}";`);
    }
  }

  // Add custom directive imports
  if (usedDirectives && usedDirectives.length > 0) {
    for (const directive of usedDirectives) {
      importLines.push(`import { ${directive.transformFn} } from "${directive.importPath}";`);
    }
  }

  for (const imp of imports) {
    importLines.push(
      `import ${imp.componentName} from "${imp.importPath}";`,
    );
  }

  const importsSection = importLines.join("\n") + "\n\n";

  // Generate data destructuring for inputs
  let dataSection = "";
  if (hasInputs) {
    dataSection = generateDataDestructuring(inputs) + "\n";
  }

  // Generate getters as local functions (computed at render time)
  let gettersSection = "";
  if (hasGetters && parsedClass) {
    for (const getter of parsedClass.getters) {
      // Transform getter body - for routes, we don't use signals, just direct access
      // Remove "this." references since we're in a function, not a class
      let body = getter.body.replace(/this\./g, "");

      // Check if body is multi-statement (has declarations, if statements, or multiple returns)
      const isMultiStatement =
        /\b(const|let|var)\s+\w+\s*=/.test(body) ||  // Has variable declaration
        /\bif\s*\(/.test(body) ||                      // Has if statement
        (body.match(/return\s+/g) || []).length > 1 || // Multiple returns
        body.split(";").filter(s => s.trim()).length > 1; // Multiple statements

      if (isMultiStatement) {
        // Multi-statement getter needs to be an IIFE with braces
        gettersSection += `  const ${getter.name} = (() => {\n    ${body.trim().split('\n').join('\n    ')}\n  })();\n`;
      } else {
        // Simple getter - strip leading "return " and trailing semicolon
        body = body.replace(/^\s*return\s+/, "");
        body = body.replace(/;\s*$/, "");
        gettersSection += `  const ${getter.name} = ${body};\n`;
      }
    }
  }

  // Generate methods as local functions
  let methodsSection = "";
  if (parsedClass?.methods) {
    for (const method of parsedClass.methods) {
      // Skip lifecycle methods and special methods
      if (['ngOnInit', 'onInit', 'ngOnDestroy', 'onDestroy', 'constructor'].includes(method.name)) {
        continue;
      }

      // Transform method body - remove "this." references
      let body = method.body.replace(/this\./g, "");

      const params = method.params?.join(", ") || "";

      // Check if body already has braces (block statement)
      const hasBlockBraces = body.trim().startsWith("{") && body.trim().endsWith("}");

      // Check if body is multi-statement (contains semicolons, declarations, or multiple lines)
      const isMultiStatement = body.includes(";") ||
        /\b(const|let|var)\s+/.test(body) ||
        body.includes("\n");

      if (isMultiStatement && !hasBlockBraces) {
        // Multi-statement body needs braces - wrap it
        methodsSection += `  const ${method.name} = (${params}) => {\n    ${body.trim()}\n  };\n`;
      } else {
        // Single expression or already has braces
        methodsSection += `  const ${method.name} = (${params}) => ${body};\n`;
      }
    }
  }

  // Build body section
  let bodySection = "";
  if (dataSection) bodySection += dataSection;
  if (gettersSection) bodySection += gettersSection;
  if (methodsSection) bodySection += methodsSection;

  // Generate page function
  let content: string;
  if (hasInputs) {
    // Route receives data from handler
    content = `${importsSection}export default define.page(function ${route.metadata.className}({ data }) {
${bodySection}
  return ${jsx};
});
`;
  } else {
    // Simple route with no inputs
    content = `${importsSection}export default define.page(function ${route.metadata.className}() {
  return ${jsx};
});
`;
  }

  return { outputPath, content };
}

/**
 * Write all route files to disk
 */
export async function writeRoutes(
  routes: SprigComponent[],
  allComponents: SprigComponent[],
  outDir: string,
): Promise<void> {
  for (const route of routes) {
    const { outputPath, content } = generateRoute(route, allComponents);
    const fullPath = join(outDir, outputPath);
    const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, content);
  }
}
