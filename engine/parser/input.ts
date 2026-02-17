/**
 * Parser for @Input() decorator
 * Parses component input props with typed interfaces
 */

/**
 * Metadata for a single @Input() decorated property
 */
export interface InputMetadata {
  /** The prop name (or alias if specified) */
  name: string;
  /** Original property name in the class */
  propertyName: string;
  /** TypeScript type annotation */
  type?: string;
  /** Default value if provided */
  defaultValue?: string;
  /** Whether the input is required */
  required: boolean;
}

/**
 * Options that can be passed to @Input()
 */
export interface InputOptions {
  /** Alias name for the input prop */
  alias?: string;
  /** Whether the input is required (defaults to false) */
  required?: boolean;
}

/**
 * Parse all @Input() decorators from a TypeScript class source
 *
 * @example
 * ```typescript
 * @Component({ template: './mod.html' })
 * export class UserCard {
 *   @Input() name: string;
 *   @Input() age: number = 25;
 *   @Input({ required: true }) id: string;
 *   @Input({ alias: 'userName' }) internalName: string;
 * }
 * ```
 */
export function parseInputDecorators(source: string): InputMetadata[] {
  const inputs: InputMetadata[] = [];

  // Find class body
  const classBodyMatch = source.match(
    /export\s+class\s+\w+\s*\{([\s\S]*)\}\s*$/,
  );

  if (!classBodyMatch) {
    return inputs;
  }

  const classBody = classBodyMatch[1];

  // Pattern to match @Input() or @Input({ ... }) decorator followed by property
  // Handles:
  // @Input() name: string;
  // @Input() name: string = "default";
  // @Input() name?: string;  (optional)
  // @Input() name!: string;  (definite assignment)
  // @Input({ required: true }) name: string;
  // @Input({ alias: 'propName' }) name: string;
  // @Input() callback: () => void = () => {};  (arrow function types)
  // We capture everything between : and ; then split on " = " to handle arrow types
  // Group 3 captures ? or ! (optional or definite assignment markers)
  const inputPattern =
    /@Input\s*\(([^)]*)\)\s*(\w+)([?!])?\s*(?::\s*)?([^;]+)?;/g;

  let match;
  while ((match = inputPattern.exec(classBody)) !== null) {
    const [, optionsStr, propertyName, optionalMarker, typeAndDefault] = match;

    // Parse options if present
    const options = parseInputOptions(optionsStr);

    // Determine the public prop name (alias or property name)
    const name = options.alias || propertyName;

    // Split type and default value on " = " (space-equals-space) to handle arrow function types
    // e.g., "() => void = () => {}" -> type: "() => void", default: "() => {}"
    let type: string | undefined;
    let defaultValue: string | undefined;

    if (typeAndDefault) {
      // Find the assignment operator that's not part of an arrow function
      // Look for " = " pattern (with spaces) that's not preceded by ">"
      const assignMatch = typeAndDefault.match(/^(.+?)\s+=\s+(?!=)(.+)$/);
      if (assignMatch) {
        type = assignMatch[1].trim();
        defaultValue = assignMatch[2].trim();
      } else {
        // No default value, entire thing is the type
        type = typeAndDefault.trim();
      }
    }

    // Determine if required
    // Required if: @Input({ required: true }) OR has ! marker OR (no default value and not optional)
    // ? marker means optional, ! marker means required (definite assignment)
    // Types with "| undefined" or "| null" are also considered optional
    const isOptionalType = optionalMarker === "?" || type?.endsWith("?") ||
      /\|\s*(undefined|null)\s*$/.test(type || "") ||
      /\|\s*(undefined|null)\s*\|/.test(type || "");
    const isDefiniteAssignment = optionalMarker === "!";
    const hasDefault = defaultValue !== undefined;
    const required = options.required ?? (isDefiniteAssignment || (!hasDefault && !isOptionalType));

    // Clean up type annotation (remove trailing ?)
    if (type?.endsWith("?")) {
      type = type.slice(0, -1).trim();
    }

    inputs.push({
      name,
      propertyName,
      type: type || undefined,
      defaultValue,
      required,
    });
  }

  return inputs;
}

/**
 * Parse @Input() decorator options
 */
function parseInputOptions(optionsStr: string): InputOptions {
  const options: InputOptions = {};

  if (!optionsStr.trim()) {
    return options;
  }

  // Match alias: 'name' or alias: "name"
  const aliasMatch = optionsStr.match(/alias\s*:\s*["']([^"']+)["']/);
  if (aliasMatch) {
    options.alias = aliasMatch[1];
  }

  // Match required: true or required: false
  const requiredMatch = optionsStr.match(/required\s*:\s*(true|false)/);
  if (requiredMatch) {
    options.required = requiredMatch[1] === "true";
  }

  return options;
}

/**
 * Check if a source file has any @Input() decorators
 */
export function hasInputDecorators(source: string): boolean {
  return /@Input\s*\(/.test(source);
}

/**
 * Generate TypeScript interface for component props
 *
 * @example
 * // Input
 * [
 *   { name: 'name', propertyName: 'name', type: 'string', required: false },
 *   { name: 'age', propertyName: 'age', type: 'number', defaultValue: '25', required: false },
 *   { name: 'id', propertyName: 'id', type: 'string', required: true },
 * ]
 *
 * // Output
 * interface UserCardProps {
 *   name?: string;
 *   age?: number;
 *   id: string;
 * }
 */
export function generatePropsInterface(
  componentName: string,
  inputs: InputMetadata[],
): string {
  if (inputs.length === 0) {
    return "";
  }

  const lines: string[] = [];
  lines.push(`interface ${componentName}Props {`);

  for (const input of inputs) {
    const optional = input.required ? "" : "?";
    const type = input.type || "unknown";
    lines.push(`  ${input.name}${optional}: ${type};`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate props destructuring for component function
 *
 * @example
 * // Input
 * [
 *   { name: 'name', propertyName: 'name', type: 'string', required: false },
 *   { name: 'age', propertyName: 'age', type: 'number', defaultValue: '25', required: false },
 *   { name: 'id', propertyName: 'id', type: 'string', required: true },
 * ]
 *
 * // Output
 * const name = props.name;
 * const age = props.age ?? 25;
 * const id = props.id;
 */
// JavaScript reserved words that can't be used as variable names
const JS_RESERVED_WORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default",
  "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
  "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
  "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
  "yield", "let", "static", "implements", "interface", "package", "private", "protected",
  "public", "await",
]);

/**
 * Get a safe variable name, escaping reserved words
 */
export function getSafeVarName(name: string): string {
  if (JS_RESERVED_WORDS.has(name)) {
    // Special case: "class" -> "className" for CSS class handling
    if (name === "class") return "className";
    return `_${name}`;
  }
  return name;
}

export function generatePropsDestructuring(inputs: InputMetadata[]): string {
  const lines: string[] = [];

  for (const input of inputs) {
    const varName = getSafeVarName(input.propertyName);

    if (input.defaultValue) {
      // Use nullish coalescing for default value
      // Wrap arrow functions in parentheses: ?? (() => {})
      let defaultVal = input.defaultValue;
      if (defaultVal.startsWith("(") && defaultVal.includes("=>")) {
        defaultVal = `(${defaultVal})`;
      }
      lines.push(`  const ${varName} = props.${input.name} ?? ${defaultVal};`);
    } else {
      lines.push(`  const ${varName} = props.${input.name};`);
    }
  }

  return lines.join("\n");
}
