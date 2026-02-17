/**
 * Custom pipe registry
 * Handles integration of @Pipe decorated classes
 */

import type { SprigPipe } from "../parser/mod.ts";

/**
 * Registered pipe information
 */
export interface RegisteredPipe {
  /** Pipe name used in templates */
  name: string;
  /** Class name (e.g., "ReversePipe") */
  className: string;
  /** Function name (same as pipe name) */
  functionName: string;
  /** Import path for the generated pipe file */
  importPath: string;
  /** Original source path */
  sourcePath: string;
  /** Whether the pipe is pure (cacheable) */
  pure: boolean;
}

/**
 * Pipe registry for tracking discovered pipes
 */
export class PipeRegistry {
  private pipes: Map<string, RegisteredPipe> = new Map();

  /**
   * Register a pipe from a SprigPipe
   */
  register(pipe: SprigPipe, outputDir: string): void {
    const name = pipe.metadata.name;
    const className = pipe.metadata.className;

    // Import path is relative to the component that uses it
    const importPath = `@/pipes/${name}.ts`;

    this.pipes.set(name, {
      name,
      className,
      functionName: name,
      importPath,
      sourcePath: pipe.path,
      pure: pipe.metadata.pure,
    });
  }

  /**
   * Check if a pipe is registered
   */
  has(name: string): boolean {
    return this.pipes.has(name);
  }

  /**
   * Get a registered pipe
   */
  get(name: string): RegisteredPipe | undefined {
    return this.pipes.get(name);
  }

  /**
   * Get all registered pipes
   */
  getAll(): RegisteredPipe[] {
    return Array.from(this.pipes.values());
  }

  /**
   * Clear all registered pipes
   */
  clear(): void {
    this.pipes.clear();
  }

  /**
   * Convert to Record for use with transformPipeExpression
   */
  toRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [name, pipe] of this.pipes) {
      record[name] = pipe.functionName;
    }
    return record;
  }
}

/**
 * Collect all custom pipe usages from a template
 */
export function collectCustomPipeUsages(
  template: string,
  registry: PipeRegistry,
): Set<string> {
  const usages = new Set<string>();

  // Match pipe usage in interpolations: {{ value | pipeName }}
  const interpolationPattern = /\{\{[^}]*\|([^}|:]+)/g;

  let match;
  while ((match = interpolationPattern.exec(template)) !== null) {
    const pipeName = match[1].trim();

    // Check if this is a registered custom pipe
    if (registry.has(pipeName)) {
      usages.add(pipeName);
    }
  }

  return usages;
}

/**
 * Generate imports for custom pipes used in a template
 */
export function generatePipeImports(
  usedPipes: Set<string>,
  registry: PipeRegistry,
): string[] {
  const imports: string[] = [];

  for (const name of usedPipes) {
    const pipe = registry.get(name);
    if (pipe) {
      imports.push(
        `import { ${pipe.functionName} } from "${pipe.importPath}";`,
      );
    }
  }

  return imports;
}

/**
 * Global pipe registry instance
 */
export const pipeRegistry = new PipeRegistry();
