/**
 * Parser for @Service decorator
 */

export interface ServiceMetadata {
  className: string;
  /** Whether this is a singleton (default: true) */
  singleton: boolean;
  /** Methods to call when DI initializes */
  onStartup: string[];
}

/**
 * Parse @Service decorator from TypeScript source
 */
export function parseServiceDecorator(source: string): ServiceMetadata | null {
  // Match @Service() or @Service decorator
  const decoratorMatch = source.match(/@Service\s*\(\s*(?:\{([\s\S]*?)\})?\s*\)?/);
  if (!decoratorMatch) {
    return null;
  }

  const decoratorBody = decoratorMatch[1] || "";

  // Extract singleton flag (defaults to true)
  const singletonMatch = decoratorBody.match(/singleton\s*:\s*(true|false)/);
  const singleton = singletonMatch ? singletonMatch[1] === "true" : true;

  // Extract onStartup array
  const onStartupMatch = decoratorBody.match(/onStartup\s*:\s*\[([\s\S]*?)\]/);
  const onStartup: string[] = [];
  if (onStartupMatch) {
    const methods = onStartupMatch[1].match(/"([^"]+)"|'([^']+)'/g);
    if (methods) {
      for (const m of methods) {
        onStartup.push(m.replace(/["']/g, ""));
      }
    }
  }

  // Extract class name
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "UnknownService";

  return {
    className,
    singleton,
    onStartup,
  };
}

export interface ServiceProperty {
  name: string;
  initialValue: string;
  type?: string;
}

export interface ServiceMethod {
  name: string;
  params: string[];
  body: string;
}

export interface ParsedService {
  className: string;
  properties: ServiceProperty[];
  methods: ServiceMethod[];
}

/**
 * Parse service class properties and methods
 */
export function parseServiceClass(source: string): ParsedService | null {
  // Extract class name
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  if (!classMatch) {
    return null;
  }

  const className = classMatch[1];

  // Find class body
  const classBodyMatch = source.match(
    /export\s+class\s+\w+\s*\{([\s\S]*)\}\s*$/,
  );
  if (!classBodyMatch) {
    return { className, properties: [], methods: [] };
  }

  const classBody = classBodyMatch[1];

  const properties = parseServiceProperties(classBody);
  const methods = parseServiceMethods(classBody);

  return { className, properties, methods };
}

function parseServiceProperties(classBody: string): ServiceProperty[] {
  const properties: ServiceProperty[] = [];

  // Match: propertyName = value; or propertyName: type = value;
  const propPattern = /^\s*(\w+)\s*(?::\s*(\w+))?\s*=\s*([^;]+);?/gm;

  let match;
  while ((match = propPattern.exec(classBody)) !== null) {
    const [, name, type, initialValue] = match;

    // Skip if this looks like a method
    if (initialValue.includes("(") && initialValue.includes(")")) {
      continue;
    }

    properties.push({
      name,
      initialValue: initialValue.trim(),
      type,
    });
  }

  return properties;
}

function parseServiceMethods(classBody: string): ServiceMethod[] {
  const methods: ServiceMethod[] = [];

  // Match method definitions: methodName(params) { body }
  const methodPattern = /(\w+)\s*\(([^)]*)\)\s*\{/g;

  let match;
  while ((match = methodPattern.exec(classBody)) !== null) {
    const [fullMatch, name, paramsStr] = match;

    // Skip constructor
    if (name === "constructor") {
      continue;
    }

    const startIndex = match.index + fullMatch.length;
    const body = extractMethodBody(classBody, startIndex);

    const params = paramsStr
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    methods.push({ name, params, body });
  }

  return methods;
}

function extractMethodBody(source: string, startIndex: number): string {
  let depth = 1;
  let i = startIndex;

  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    i++;
  }

  return source.slice(startIndex, i - 1).trim();
}
