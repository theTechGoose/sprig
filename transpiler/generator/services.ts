/**
 * Generate service files for Fresh with tsyringe DI and signals
 */

import { join } from "@std/path";
import type { SprigService } from "../parser/mod.ts";
import { parseClass } from "../parser/mod.ts";

export interface GeneratedService {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Generated TypeScript content */
  content: string;
}

/**
 * Generate a service file using tsyringe for DI and signals for reactive state
 */
export function generateService(service: SprigService, allServices: SprigService[]): GeneratedService {
  const { metadata, parsedClass, source } = service;
  const outputPath = `services/${metadata.className}.ts`;

  const lines: string[] = [];

  // Parse the class to get dependencies
  const parsed = parseClass(source);
  const dependencies = parsed?.dependencies || [];

  // Imports
  lines.push('import { injectable, singleton, inject } from "tsyringe";');
  lines.push('import { signal } from "@preact/signals";');

  // Import dependent services
  for (const dep of dependencies) {
    lines.push(`import { ${dep.type} } from "./${dep.type}.ts";`);
  }

  lines.push("");

  // Add decorators
  if (metadata.singleton) {
    lines.push("@singleton()");
  }
  lines.push("@injectable()");

  // Generate the service class
  lines.push(`export class ${metadata.className} {`);

  // Generate signal properties
  for (const prop of parsedClass.properties) {
    lines.push(`  ${prop.name} = signal(${prop.initialValue});`);
  }

  if (parsedClass.properties.length > 0) {
    lines.push("");
  }

  // Generate constructor with injected dependencies
  if (dependencies.length > 0) {
    const constructorParams = dependencies
      .map((dep) => `private ${dep.name}: ${dep.type}`)
      .join(", ");
    lines.push(`  constructor(${constructorParams}) {}`);
    lines.push("");
  }

  // Generate methods
  for (const method of parsedClass.methods) {
    const transformedBody = transformServiceMethodBody(method.body, parsedClass.properties);
    const params = method.params.join(", ");
    lines.push(`  ${method.name}(${params}) {`);
    lines.push(`    ${transformedBody}`);
    lines.push(`  }`);
    lines.push("");
  }

  lines.push("}");
  lines.push("");

  return {
    outputPath,
    content: lines.join("\n"),
  };
}

/**
 * Transform method body: replace this.propName with this.propName.value for signals
 */
function transformServiceMethodBody(
  body: string,
  properties: Array<{ name: string }>,
): string {
  let result = body;

  for (const prop of properties) {
    // Replace this.propName with this.propName.value
    const thisPattern = new RegExp(`this\\.${prop.name}(?!\\.value)`, "g");
    result = result.replace(thisPattern, `this.${prop.name}.value`);
  }

  return result;
}

/**
 * Convert PascalCase to camelCase
 */
function camelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Write all services to disk
 */
export async function writeServices(
  services: SprigService[],
  outDir: string,
): Promise<void> {
  for (const service of services) {
    const { outputPath, content } = generateService(service, services);
    const fullPath = join(outDir, outputPath);
    const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, content);
  }

  // Write container setup
  if (services.length > 0) {
    const containerContent = generateContainer(services);
    const containerPath = join(outDir, "services/container.ts");
    await Deno.writeTextFile(containerPath, containerContent);
  }
}

/**
 * Generate the DI container setup file
 */
function generateContainer(services: SprigService[]): string {
  const lines: string[] = [];

  lines.push('import "reflect-metadata";');
  lines.push('import { container } from "tsyringe";');
  lines.push("");

  // Import all services to register them
  for (const service of services) {
    lines.push(`import { ${service.metadata.className} } from "./${service.metadata.className}.ts";`);
  }

  lines.push("");
  lines.push("// Export the configured container");
  lines.push("export { container };");
  lines.push("");

  // Export resolver functions for each service
  for (const service of services) {
    lines.push(`export function get${service.metadata.className}() {`);
    lines.push(`  return container.resolve(${service.metadata.className});`);
    lines.push(`}`);
    lines.push("");
  }

  // Generate startup initialization
  const servicesWithStartup = services.filter(s => s.metadata.onStartup.length > 0);
  if (servicesWithStartup.length > 0) {
    lines.push("// Initialize services with onStartup methods");
    lines.push("export async function initializeServices() {");
    for (const service of servicesWithStartup) {
      const varName = camelCase(service.metadata.className);
      lines.push(`  const ${varName} = container.resolve(${service.metadata.className});`);
      for (const method of service.metadata.onStartup) {
        lines.push(`  await ${varName}.${method}();`);
      }
    }
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate a services index file that re-exports all services and the container
 */
export function generateServicesIndex(services: SprigService[]): string {
  const lines: string[] = [];
  lines.push("// Auto-generated services index");
  lines.push('import "reflect-metadata";');
  lines.push("");

  // Re-export all service classes
  for (const service of services) {
    lines.push(`export { ${service.metadata.className} } from "./${service.metadata.className}.ts";`);
  }

  lines.push("");

  // Re-export container and resolvers
  lines.push('export { container } from "./container.ts";');
  for (const service of services) {
    lines.push(`export { get${service.metadata.className} } from "./container.ts";`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Write the services index file
 */
export async function writeServicesIndex(
  services: SprigService[],
  outDir: string,
): Promise<void> {
  if (services.length === 0) {
    return;
  }

  const content = generateServicesIndex(services);
  const fullPath = join(outDir, "services/mod.ts");
  const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(fullPath, content);
}
