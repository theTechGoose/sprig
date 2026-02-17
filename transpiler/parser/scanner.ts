/**
 * Directory structure scanner for Sprig apps
 *
 * Supports modular structure:
 * src/
 * ├── bootstrap.ts
 * ├── _dto/
 * └── [module]/
 *     ├── domain/
 *     │   ├── data/
 *     │   ├── business/
 *     │   └── coordinators/
 *     ├── routes/
 *     └── common.ts          # barrel export
 */

import { join, relative, basename, dirname } from "@std/path";
import { walk, exists } from "@std/fs";
import { parseComponentDecorator, type ComponentMetadata } from "./component.ts";
import { parseServiceDecorator, parseServiceClass, type ServiceMetadata, type ParsedService } from "./service.ts";
import { parseDirectiveDecorator, hasDirectiveDecorator, type SprigDirective } from "./directive.ts";
import { parsePipeDecorator, hasPipeDecorator, type SprigPipe } from "./pipe.ts";
import { parseInputDecorators, type InputMetadata } from "./input.ts";
import { kebabToPascal } from "../utils/naming.ts";

export interface SprigComponent {
  /** Absolute path to the component directory */
  path: string;
  /** Relative path from src/ */
  relativePath: string;
  /** Component metadata from @Component decorator */
  metadata: ComponentMetadata;
  /** HTML template content */
  template: string;
  /** TypeScript source code */
  source: string;
  /** Component type determined by location */
  type: "route" | "component";
  /** Module name (e.g., "landing", "auth") */
  module?: string;
  /** Domain layer if in domain/ */
  domainLayer?: "data" | "business" | "coordinators";
  /** Original filename (e.g., "mod.ts" or "[id].ts") */
  originalFilename: string;
  /** Parsed @Input() decorators */
  inputs: InputMetadata[];
}

export interface SprigService {
  /** Absolute path to the service file */
  path: string;
  /** Relative path from src/ */
  relativePath: string;
  /** Service metadata from @Service decorator */
  metadata: ServiceMetadata;
  /** Parsed service class (properties and methods) */
  parsedClass: ParsedService;
  /** TypeScript source code */
  source: string;
  /** Module name */
  module?: string;
  /** Domain layer (data, business, coordinators) */
  domainLayer?: "data" | "business" | "coordinators";
}

export interface SprigModule {
  /** Module name (folder name) */
  name: string;
  /** Absolute path to module directory */
  path: string;
  /** Components in this module */
  components: SprigComponent[];
  /** Services in this module */
  services: SprigService[];
  /** Routes in this module */
  routes: SprigComponent[];
}

export interface ScanResult {
  /** All discovered components */
  components: SprigComponent[];
  /** Route components (in routes/ folders) */
  routes: SprigComponent[];
  /** Domain/business components */
  domainComponents: SprigComponent[];
  /** Discovered services */
  services: SprigService[];
  /** Discovered custom directives */
  directives: SprigDirective[];
  /** Discovered custom pipes */
  pipes: SprigPipe[];
  /** Discovered modules */
  modules: SprigModule[];
  /** Bootstrap HTML layout path (if exists) */
  bootstrapHtmlPath?: string;
  /** DTO directory path (if exists) */
  dtoPath?: string;
}

/**
 * Scan a Sprig app directory and discover all components
 */
export async function scanSprigApp(srcDir: string): Promise<ScanResult> {
  const components: SprigComponent[] = [];
  const services: SprigService[] = [];
  const directives: SprigDirective[] = [];
  const pipes: SprigPipe[] = [];
  const modules: SprigModule[] = [];

  // Check for bootstrap.html (root layout)
  const bootstrapHtmlPath = join(srcDir, "bootstrap.html");
  const hasBootstrapHtml = await exists(bootstrapHtmlPath);

  // Check for _dto/
  const dtoPath = join(srcDir, "_dto");
  const hasDto = await exists(dtoPath);

  // Track which directories have been processed (to avoid duplicates)
  const processedDirs = new Set<string>();

  // Discover modules (top-level directories that aren't _app, _dto, etc.)
  const moduleMap = new Map<string, SprigModule>();

  // Walk the directory tree looking for mod.ts files with @Component or @Service
  for await (const entry of walk(srcDir, { exts: [".ts"], match: [/mod\.ts$/] })) {
    if (entry.isFile && entry.name === "mod.ts") {
      const componentDir = dirname(entry.path);
      processedDirs.add(componentDir);

      const component = await parseComponentFromFile(entry.path, srcDir);
      if (component) {
        components.push(component);
        trackModule(component, srcDir, moduleMap);
      } else {
        // Check if it's a service
        const service = await parseServiceFromFile(entry.path, srcDir);
        if (service) {
          services.push(service);
          trackServiceModule(service, srcDir, moduleMap);
        }
      }
    }
  }

  // Also look for HTML-only components (mod.html without mod.ts)
  for await (const entry of walk(srcDir, { exts: [".html"], match: [/mod\.html$/] })) {
    if (entry.isFile && entry.name === "mod.html") {
      const componentDir = dirname(entry.path);

      // Skip if already processed via mod.ts
      if (processedDirs.has(componentDir)) {
        continue;
      }

      const component = await parseHtmlOnlyComponent(entry.path, srcDir);
      if (component) {
        components.push(component);
        trackModule(component, srcDir, moduleMap);
      }
    }
  }

  // Also check for [param].ts files (dynamic routes)
  for await (const entry of walk(srcDir, { exts: [".ts"], match: [/\[.+\]\.ts$/] })) {
    if (entry.isFile) {
      const component = await parseComponentFromFile(entry.path, srcDir);
      if (component) {
        components.push(component);
        trackModule(component, srcDir, moduleMap);
      }
    }
  }

  // Also check for *.service.ts files
  for await (const entry of walk(srcDir, { exts: [".ts"], match: [/\.service\.ts$/] })) {
    if (entry.isFile) {
      const service = await parseServiceFromFile(entry.path, srcDir);
      if (service) {
        services.push(service);
        trackServiceModule(service, srcDir, moduleMap);
      }
    }
  }

  // Scan for *.directive.ts files in directives/ folders
  for await (const entry of walk(srcDir, { exts: [".ts"], match: [/\.directive\.ts$/] })) {
    if (entry.isFile) {
      const directive = await parseDirectiveFromFile(entry.path, srcDir);
      if (directive) {
        directives.push(directive);
      }
    }
  }

  // Scan for *.pipe.ts files in pipes/ folders
  for await (const entry of walk(srcDir, { exts: [".ts"], match: [/\.pipe\.ts$/] })) {
    if (entry.isFile) {
      const pipe = await parsePipeFromFile(entry.path, srcDir);
      if (pipe) {
        pipes.push(pipe);
      }
    }
  }

  // Categorize components
  const routes = components.filter((c) => c.type === "route");
  const domainComponents = components.filter((c) => c.type === "component");

  // Build modules array
  for (const [name, mod] of moduleMap) {
    mod.components = components.filter((c) => c.module === name && c.type === "component");
    mod.services = services.filter((s) => s.module === name);
    mod.routes = components.filter((c) => c.module === name && c.type === "route");
    modules.push(mod);
  }

  return {
    components,
    routes,
    domainComponents,
    services,
    directives,
    pipes,
    modules,
    bootstrapHtmlPath: hasBootstrapHtml ? bootstrapHtmlPath : undefined,
    dtoPath: hasDto ? dtoPath : undefined,
  };
}

/**
 * Track which module a component belongs to
 */
function trackModule(
  component: SprigComponent,
  srcDir: string,
  moduleMap: Map<string, SprigModule>
): void {
  if (!component.module) return;

  if (!moduleMap.has(component.module)) {
    moduleMap.set(component.module, {
      name: component.module,
      path: join(srcDir, component.module),
      components: [],
      services: [],
      routes: [],
    });
  }
}

/**
 * Track which module a service belongs to
 */
function trackServiceModule(
  service: SprigService,
  srcDir: string,
  moduleMap: Map<string, SprigModule>
): void {
  if (!service.module) return;

  if (!moduleMap.has(service.module)) {
    moduleMap.set(service.module, {
      name: service.module,
      path: join(srcDir, service.module),
      components: [],
      services: [],
      routes: [],
    });
  }
}

async function parseComponentFromFile(
  filePath: string,
  srcDir: string,
): Promise<SprigComponent | null> {
  const source = await Deno.readTextFile(filePath);
  const metadata = parseComponentDecorator(source);

  if (!metadata) {
    return null;
  }

  const componentDir = filePath.replace(/[/\\][^/\\]+$/, "");
  const relativePath = relative(srcDir, componentDir);
  const originalFilename = filePath.split(/[/\\]/).pop() || "mod.ts";

  // Determine template path
  const templatePath = metadata.template.startsWith("./")
    ? join(componentDir, metadata.template)
    : join(componentDir, metadata.template);

  let template = "";
  try {
    template = await Deno.readTextFile(templatePath);
  } catch {
    console.warn(`Warning: Could not read template at ${templatePath}`);
  }

  // Parse path segments to determine module and location
  const { type, module, domainLayer } = parsePathInfo(relativePath);

  // Parse @Input() decorators
  const inputs = parseInputDecorators(source);

  return {
    path: componentDir,
    relativePath,
    metadata,
    template,
    source,
    type,
    module,
    domainLayer,
    originalFilename,
    inputs,
  };
}

/**
 * Parse path to extract module, type, and domain layer info
 *
 * Structure:
 *   src/[module]/domain/{business,data,coordinators}/[component]/  -> component
 *   src/[module]/routes/[route-name]/                              -> route
 *
 * Note: The "routes/" segment is organizational only and is stripped
 * during transpilation (e.g., landing/routes/index -> routes/index.tsx)
 */
function parsePathInfo(relativePath: string): {
  type: "route" | "component";
  module?: string;
  domainLayer?: "data" | "business" | "coordinators";
} {
  const segments = relativePath.split(/[/\\]/);

  // Check for routes (routes/ folder under module)
  if (segments.includes("routes")) {
    const moduleIndex = segments.indexOf("routes") - 1;
    const module = moduleIndex >= 0 ? segments[moduleIndex] : undefined;
    return { type: "route", module };
  }

  // Check for domain layers (components/services)
  if (segments.includes("domain")) {
    const domainIndex = segments.indexOf("domain");
    const moduleIndex = domainIndex - 1;
    const module = moduleIndex >= 0 ? segments[moduleIndex] : undefined;

    // Check which layer
    const layerIndex = domainIndex + 1;
    const layer = segments[layerIndex] as "data" | "business" | "coordinators" | undefined;

    if (layer && ["data", "business", "coordinators"].includes(layer)) {
      return { type: "component", module, domainLayer: layer };
    }

    return { type: "component", module };
  }

  // Legacy: islands/ or components/ at module level
  if (segments.includes("islands") || segments.includes("components")) {
    const folderIndex = Math.max(segments.indexOf("islands"), segments.indexOf("components"));
    const moduleIndex = folderIndex - 1;
    const module = moduleIndex >= 0 ? segments[moduleIndex] : undefined;
    return { type: "component", module };
  }

  // Legacy: services/ at top level
  if (segments.includes("services")) {
    return { type: "component" };
  }

  // Default: first segment is the module
  const module = segments[0] && !segments[0].startsWith("_") ? segments[0] : undefined;
  return { type: "component", module };
}

function determineComponentType(
  relativePath: string,
): "route" | "component" {
  if (relativePath.includes("routes")) {
    return "route";
  }
  return "component";
}

async function parseServiceFromFile(
  filePath: string,
  srcDir: string,
): Promise<SprigService | null> {
  const source = await Deno.readTextFile(filePath);
  const metadata = parseServiceDecorator(source);

  if (!metadata) {
    return null;
  }

  const parsedClass = parseServiceClass(source);
  if (!parsedClass) {
    return null;
  }

  const relativePath = relative(srcDir, filePath);

  // Parse path to get module and domain layer
  const segments = relativePath.split(/[/\\]/);
  let module: string | undefined;
  let domainLayer: "data" | "business" | "coordinators" | undefined;

  if (segments.includes("domain")) {
    const domainIndex = segments.indexOf("domain");
    const moduleIndex = domainIndex - 1;
    module = moduleIndex >= 0 ? segments[moduleIndex] : undefined;

    const layerIndex = domainIndex + 1;
    const layer = segments[layerIndex];
    if (layer && ["data", "business", "coordinators"].includes(layer)) {
      domainLayer = layer as "data" | "business" | "coordinators";
    }
  } else if (segments.includes("services")) {
    // Legacy services/ folder
    const servicesIndex = segments.indexOf("services");
    const moduleIndex = servicesIndex - 1;
    module = moduleIndex >= 0 ? segments[moduleIndex] : undefined;
    domainLayer = "business"; // Treat legacy services as business layer
  }

  return {
    path: filePath,
    relativePath,
    metadata,
    parsedClass,
    source,
    module,
    domainLayer,
  };
}

/**
 * Parse an HTML-only component (no mod.ts required)
 * Props are inferred from {{propName}} interpolations
 * Selector/className derived from folder name
 */
async function parseHtmlOnlyComponent(
  htmlPath: string,
  srcDir: string,
): Promise<SprigComponent | null> {
  const template = await Deno.readTextFile(htmlPath);
  const componentDir = dirname(htmlPath);
  const relativePath = relative(srcDir, componentDir);
  const folderName = basename(componentDir);

  // Derive className from folder name (kebab-case to PascalCase)
  const className = kebabToPascal(folderName);

  // Extract props from {{propName}} patterns
  const inputs = extractPropsFromTemplate(template);

  // Parse path info
  const { type, module, domainLayer } = parsePathInfo(relativePath);

  // HTML-only components are always server components (never islands)
  const metadata: ComponentMetadata = {
    template: "./mod.html",
    island: false, // HTML-only can't have client-side logic
    className,
  };

  return {
    path: componentDir,
    relativePath,
    metadata,
    template,
    source: "", // No TypeScript source
    type,
    module,
    domainLayer,
    originalFilename: "mod.html",
    inputs,
  };
}

/**
 * Extract prop names from {{propName}} interpolations in template
 * Returns InputMetadata array for compatibility with existing system
 */
function extractPropsFromTemplate(template: string): InputMetadata[] {
  const props = new Set<string>();

  // Match {{propName}} or {{propName | pipe}} or {{propName.nested}}
  const interpolationPattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;

  while ((match = interpolationPattern.exec(template)) !== null) {
    const propName = match[1];
    // Skip common keywords that aren't props
    if (!["true", "false", "null", "undefined", "this"].includes(propName)) {
      props.add(propName);
    }
  }

  // Also check property bindings [prop]="propName"
  const bindingPattern = /\[[^\]]+\]="([a-zA-Z_][a-zA-Z0-9_]*)"/g;
  while ((match = bindingPattern.exec(template)) !== null) {
    const propName = match[1];
    if (!["true", "false", "null", "undefined", "this"].includes(propName)) {
      props.add(propName);
    }
  }

  // Convert to InputMetadata format
  return Array.from(props).map((name) => ({
    name,
    propertyName: name,
    type: "unknown", // Type inferred at runtime
    required: false,
  }));
}

async function parseDirectiveFromFile(
  filePath: string,
  srcDir: string,
): Promise<SprigDirective | null> {
  const source = await Deno.readTextFile(filePath);

  if (!hasDirectiveDecorator(source)) {
    return null;
  }

  const metadata = parseDirectiveDecorator(source);
  if (!metadata) {
    return null;
  }

  const relativePath = relative(srcDir, filePath);

  return {
    path: filePath,
    relativePath,
    metadata,
    source,
  };
}

async function parsePipeFromFile(
  filePath: string,
  srcDir: string,
): Promise<SprigPipe | null> {
  const source = await Deno.readTextFile(filePath);

  if (!hasPipeDecorator(source)) {
    return null;
  }

  const metadata = parsePipeDecorator(source);
  if (!metadata) {
    return null;
  }

  const relativePath = relative(srcDir, filePath);

  return {
    path: filePath,
    relativePath,
    metadata,
    source,
  };
}
