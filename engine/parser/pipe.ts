/**
 * Parser for @Pipe decorator
 * Parses custom pipe definitions from TypeScript source
 */

export interface PipeMetadata {
  /** Pipe name used in templates (e.g., "reverse") */
  name: string;
  /** Class name of the pipe */
  className: string;
  /** Whether the pipe is pure (default: true) */
  pure: boolean;
}

/**
 * Parse @Pipe decorator from TypeScript source
 *
 * @example
 * ```typescript
 * @Pipe({
 *   name: 'reverse'
 * })
 * export class ReversePipe {
 *   transform(value: string): string {
 *     return value.split('').reverse().join('');
 *   }
 * }
 * ```
 */
export function parsePipeDecorator(source: string): PipeMetadata | null {
  // Match @Pipe({ ... }) decorator
  const decoratorMatch = source.match(
    /@Pipe\s*\(\s*\{([\s\S]*?)\}\s*\)/,
  );

  if (!decoratorMatch) {
    return null;
  }

  const decoratorBody = decoratorMatch[1];

  // Extract name
  const nameMatch = decoratorBody.match(/name\s*:\s*["']([^"']+)["']/);
  if (!nameMatch) {
    return null;
  }

  const name = nameMatch[1];

  // Extract pure flag (defaults to true)
  const pureMatch = decoratorBody.match(/pure\s*:\s*(true|false)/);
  const pure = pureMatch ? pureMatch[1] === "true" : true;

  // Extract class name
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "UnknownPipe";

  return {
    name,
    className,
    pure,
  };
}

/**
 * Check if a source file contains a @Pipe decorator
 */
export function hasPipeDecorator(source: string): boolean {
  return /@Pipe\s*\(/.test(source);
}

/**
 * SprigPipe represents a discovered custom pipe
 */
export interface SprigPipe {
  /** Absolute path to the pipe file */
  path: string;
  /** Relative path from src/ */
  relativePath: string;
  /** Pipe metadata from @Pipe decorator */
  metadata: PipeMetadata;
  /** TypeScript source code */
  source: string;
}

/**
 * Extract the transform method signature from a pipe class
 */
export function extractPipeTransformSignature(source: string): string | null {
  // Match transform method
  const transformMatch = source.match(
    /transform\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/,
  );

  if (!transformMatch) {
    return null;
  }

  return transformMatch[0];
}

/**
 * Generate a function wrapper for a pipe class
 * Converts class-based pipe to a simple function
 */
export function generatePipeFunction(metadata: PipeMetadata): string {
  const funcName = metadata.name;
  const className = metadata.className;

  return `
/**
 * ${funcName} pipe function
 * Wrapper for ${className}.transform()
 */
const _${funcName}Instance = new ${className}();
export function ${funcName}(value: unknown, ...args: unknown[]): unknown {
  return _${funcName}Instance.transform(value, ...args);
}
`;
}
