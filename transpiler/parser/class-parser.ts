/**
 * Parser for TypeScript class properties and methods
 */

import { getSafeVarName } from "./input.ts";

export interface ClassProperty {
  name: string;
  initialValue: string;
  type?: string;
}

export interface ClassMethod {
  name: string;
  params: string[];
  body: string;
  /** Whether this is an async method */
  isAsync?: boolean;
}

export interface ClassGetter {
  name: string;
  body: string;
  returnType?: string;
}

export interface InjectedDependency {
  name: string;
  type: string;
  visibility: "private" | "public" | "protected";
}

export interface ParsedClass {
  className: string;
  properties: ClassProperty[];
  methods: ClassMethod[];
  /** Getter methods (get foo() { ... }) */
  getters: ClassGetter[];
  /** Constructor-injected dependencies */
  dependencies: InjectedDependency[];
  /** Module-level code before the class (interfaces, types, constants) */
  moduleCode?: string;
}

/**
 * Parse class properties and methods from TypeScript source
 */
export function parseClass(source: string): ParsedClass | null {
  // Extract class name
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  if (!classMatch) {
    return null;
  }

  const className = classMatch[1];

  // Extract module-level code before @Component decorator or class
  // This captures interfaces, types, and constants
  let moduleCode: string | undefined;
  const decoratorMatch = source.match(/@Component\s*\(/);
  const classDefMatch = source.match(/export\s+class\s+/);

  if (decoratorMatch || classDefMatch) {
    const startIndex = decoratorMatch
      ? decoratorMatch.index!
      : classDefMatch!.index!;

    // Get everything before the decorator/class
    const beforeClass = source.slice(0, startIndex).trim();

    // Filter out import statements but keep interfaces, types, constants
    const lines = beforeClass.split('\n');
    const moduleLines: string[] = [];
    let inMultiLineDecl = false;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (const line of lines) {
      // Skip import statements
      if (line.trim().startsWith('import ')) continue;

      // Track if we're in a multi-line declaration (both {} and [])
      if (line.includes('{')) braceDepth += (line.match(/\{/g) || []).length;
      if (line.includes('}')) braceDepth -= (line.match(/\}/g) || []).length;
      if (line.includes('[')) bracketDepth += (line.match(/\[/g) || []).length;
      if (line.includes(']')) bracketDepth -= (line.match(/\]/g) || []).length;

      // Keep interface, type, const, let, var declarations
      if (
        line.trim().startsWith('interface ') ||
        line.trim().startsWith('type ') ||
        line.trim().startsWith('const ') ||
        line.trim().startsWith('let ') ||
        line.trim().startsWith('var ') ||
        line.trim().startsWith('export interface ') ||
        line.trim().startsWith('export type ') ||
        line.trim().startsWith('export const ') ||
        inMultiLineDecl
      ) {
        moduleLines.push(line);
        inMultiLineDecl = braceDepth > 0 || bracketDepth > 0;
      }
    }

    if (moduleLines.length > 0) {
      moduleCode = moduleLines.join('\n');
    }
  }

  // Find class body (everything between the class braces)
  const classBodyMatch = source.match(
    /export\s+class\s+\w+\s*\{([\s\S]*)\}\s*$/,
  );
  if (!classBodyMatch) {
    return { className, properties: [], methods: [], getters: [], dependencies: [], moduleCode };
  }

  const classBody = classBodyMatch[1];

  const properties = parseProperties(classBody);
  const methods = parseMethods(classBody);
  const getters = parseGetters(classBody);
  const dependencies = parseConstructorDependencies(classBody);

  return { className, properties, methods, getters, dependencies, moduleCode };
}

/**
 * Parse constructor dependencies: constructor(private counter: CounterService)
 */
function parseConstructorDependencies(classBody: string): InjectedDependency[] {
  const dependencies: InjectedDependency[] = [];

  // Match constructor(...)
  const constructorMatch = classBody.match(/constructor\s*\(([^)]*)\)/);
  if (!constructorMatch) {
    return dependencies;
  }

  const paramsStr = constructorMatch[1];
  if (!paramsStr.trim()) {
    return dependencies;
  }

  // Parse each parameter: private/public/protected name: Type
  const paramPattern = /(private|public|protected)\s+(\w+)\s*:\s*(\w+)/g;

  let match;
  while ((match = paramPattern.exec(paramsStr)) !== null) {
    const [, visibility, name, type] = match;
    dependencies.push({
      name,
      type,
      visibility: visibility as "private" | "public" | "protected",
    });
  }

  return dependencies;
}

/**
 * Parse class properties like: count = 0; or name: string = "hello";
 * Also handles complex types like: items: Array<{id: number}> = [];
 * Also handles visibility modifiers: private cardRef: HTMLElement | null = null;
 */
function parseProperties(classBody: string): ClassProperty[] {
  const properties: ClassProperty[] = [];

  // Match: [visibility] [readonly] propertyName = value; or propertyName: complexType = value;
  // The type can include generics, objects, arrays, unions etc.
  // We capture everything between : and = as the type
  // Class properties have minimal indentation (2 spaces typically)
  // Use (?!let|const|var) to skip local variable declarations
  // Handle optional visibility modifiers: private, public, protected, readonly
  const propPattern = /^[ ]{0,4}(?:(?:private|public|protected)\s+)?(?:readonly\s+)?(?!let\s|const\s|var\s)(\w+)\s*(?::\s*([^=]+?))?\s*=\s*([^;]+);?/gm;

  let match;
  while ((match = propPattern.exec(classBody)) !== null) {
    const [, name, typeRaw, initialValue] = match;
    const type = typeRaw?.trim();

    // The regex requires `=` so we're guaranteed to be matching property assignments
    // Function calls as initial values (structuredClone, computed, etc.) are valid
    properties.push({
      name,
      initialValue: initialValue.trim(),
      type,
    });
  }

  return properties;
}

// JavaScript reserved keywords that should not be treated as method names
const JS_KEYWORDS = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
  "return", "throw", "try", "catch", "finally", "new", "delete", "typeof",
  "void", "instanceof", "in", "of", "class", "extends", "super", "import",
  "export", "default", "function", "const", "let", "var", "async", "await",
  "yield", "static", "get", "set", "with", "debugger", "enum",
]);

/**
 * Parse class methods like: increment() { this.count++; }
 * Also handles async methods: async runAll() { ... }
 * Also handles return type annotations: wait(): Promise<boolean> { ... }
 * Also handles complex return types with nested braces: getPoint(): { x: number; y: number } | null { ... }
 */
function parseMethods(classBody: string): ClassMethod[] {
  const methods: ClassMethod[] = [];

  // Match method signature up to closing paren: [visibility] [async] methodName(params)
  // Don't try to match return type in regex - handle it separately to support nested braces
  // Handle visibility modifiers: private, public, protected
  const methodPattern = /^[ \t]*(?:(?:private|public|protected)\s+)?(async\s+)?(\w+)\s*\(([^)]*)\)/gm;

  let match;
  while ((match = methodPattern.exec(classBody)) !== null) {
    const [fullMatch, asyncKeyword, name, paramsStr] = match;

    // Skip constructor and JavaScript reserved keywords
    if (name === "constructor" || JS_KEYWORDS.has(name)) {
      continue;
    }

    let pos = match.index + fullMatch.length;

    // Skip whitespace
    while (pos < classBody.length && /\s/.test(classBody[pos])) {
      pos++;
    }

    // Check for return type annotation
    if (classBody[pos] === ":") {
      pos++; // skip ':'

      // Skip whitespace after colon
      while (pos < classBody.length && /\s/.test(classBody[pos])) {
        pos++;
      }

      // Find the body opening brace, handling nested <> and {} in type annotations
      // The body brace comes AFTER the type ends - we need to track all brackets
      let angleDepth = 0;
      let braceDepth = 0;
      let hasSeenTypeContent = false;

      while (pos < classBody.length) {
        const char = classBody[pos];
        if (char === "<") {
          angleDepth++;
          hasSeenTypeContent = true;
        } else if (char === ">") {
          angleDepth--;
          hasSeenTypeContent = true;
        } else if (char === "{") {
          // Only treat as body brace if we've seen content and all brackets closed
          if (hasSeenTypeContent && angleDepth === 0 && braceDepth === 0) {
            // This is the body opening brace
            break;
          }
          // Otherwise it's part of the type (object type literal)
          braceDepth++;
          hasSeenTypeContent = true;
        } else if (char === "}") {
          braceDepth--;
          hasSeenTypeContent = true;
        } else if (!/\s/.test(char)) {
          hasSeenTypeContent = true;
        }
        pos++;
      }
    }

    // Skip whitespace before body
    while (pos < classBody.length && /\s/.test(classBody[pos])) {
      pos++;
    }

    // Must be at opening brace
    if (classBody[pos] !== "{") {
      continue; // Not a valid method
    }

    pos++; // skip opening brace

    // Extract the body
    const body = extractMethodBody(classBody, pos);

    const params = paramsStr
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const isAsync = !!asyncKeyword;
    methods.push({ name, params, body, isAsync });
  }

  return methods;
}

/**
 * Parse getter methods: get foo(): Type { return bar; }
 * Handles complex return types with nested braces like Array<{ x: number }>
 */
function parseGetters(classBody: string): ClassGetter[] {
  const getters: ClassGetter[] = [];

  // Match getter declaration: get name()
  // Don't try to capture return type in regex - handle it separately
  const getterPattern = /^[ \t]*get\s+(\w+)\s*\(\s*\)/gm;

  let match;
  while ((match = getterPattern.exec(classBody)) !== null) {
    const [fullMatch, name] = match;
    let pos = match.index + fullMatch.length;

    // Skip whitespace
    while (pos < classBody.length && /\s/.test(classBody[pos])) {
      pos++;
    }

    let returnType: string | undefined;

    // Check for return type annotation
    if (classBody[pos] === ":") {
      pos++; // skip ':'
      const typeStart = pos;

      // Skip whitespace after colon
      while (pos < classBody.length && /\s/.test(classBody[pos])) {
        pos++;
      }

      // Find the body opening brace, handling nested <> and {}
      // Track hasSeenTypeContent to not mistake the first { in an object type for the body
      let angleDepth = 0;
      let braceDepth = 0;
      let hasSeenTypeContent = false;

      while (pos < classBody.length) {
        const char = classBody[pos];
        if (char === "<") {
          angleDepth++;
          hasSeenTypeContent = true;
        } else if (char === ">") {
          angleDepth--;
          hasSeenTypeContent = true;
        } else if (char === "{") {
          // Only treat as body brace if we've seen content and all brackets closed
          if (hasSeenTypeContent && angleDepth === 0 && braceDepth === 0) {
            // This is the body opening brace
            break;
          }
          // Otherwise it's part of the type (object type literal)
          braceDepth++;
          hasSeenTypeContent = true;
        } else if (char === "}") {
          braceDepth--;
          hasSeenTypeContent = true;
        } else if (!/\s/.test(char)) {
          hasSeenTypeContent = true;
        }
        pos++;
      }

      returnType = classBody.slice(typeStart, pos).trim();
      // Remove leading colon if present
      if (returnType.startsWith(":")) {
        returnType = returnType.slice(1).trim();
      }
    }

    // Skip whitespace before body
    while (pos < classBody.length && /\s/.test(classBody[pos])) {
      pos++;
    }

    // Must be at opening brace
    if (classBody[pos] !== "{") {
      continue; // Not a valid getter
    }

    pos++; // skip opening brace

    // Extract the body
    const body = extractMethodBody(classBody, pos);

    getters.push({ name, body, returnType });
  }

  return getters;
}

/**
 * Extract method body by finding matching braces
 */
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

/**
 * Input prop info for transformation
 */
export interface InputInfo {
  name: string;
  propertyName: string;
  /** If true, this input is mutated and should be treated as a signal */
  isSignal?: boolean;
}

/**
 * Transform method body:
 * - Replace this.inputProp with inputProp (plain value from props)
 * - Replace this.prop with prop.value for signals (properties)
 * - Replace this.getter with getter.value for computed signals (getters)
 * - Replace this.ref with ref.current for template refs
 * - Replace this.method() with method() for method calls
 */
export function transformMethodBody(
  body: string,
  properties: ClassProperty[],
  methods: ClassMethod[] = [],
  getters: ClassGetter[] = [],
  templateRefs: string[] = [],
  inputs: InputInfo[] = [],
): string {
  let result = body;

  // Transform input prop references
  // For regular inputs: this.inputName -> inputName (plain value from props)
  // For signal inputs (mutated): this.inputName -> inputName.value
  // Use safe var name to handle reserved words like "class" -> "className"
  // IMPORTANT: Use word boundary \b to avoid matching longer names (e.g., this.contractor vs this.contractorName)
  for (const input of inputs) {
    const safeVarName = getSafeVarName(input.propertyName);
    const thisPattern = new RegExp(`this\\.${input.propertyName}\\b`, "g");
    if (input.isSignal) {
      // Mutated input - treat as signal
      result = result.replace(thisPattern, `${safeVarName}.value`);
    } else {
      // Regular input - plain value from props
      result = result.replace(thisPattern, safeVarName);
    }
  }

  // Transform template ref references: this.refName -> refName.current
  for (const refName of templateRefs) {
    const thisPattern = new RegExp(`this\\.${refName}\\b`, "g");
    result = result.replace(thisPattern, `${refName}.current`);
  }

  // Transform property references: this.propName -> propName.value
  // IMPORTANT: Use word boundary \b to avoid matching longer names
  for (const prop of properties) {
    const thisPattern = new RegExp(`this\\.${prop.name}\\b`, "g");
    result = result.replace(thisPattern, `${prop.name}.value`);
  }

  // Fix local variable shadowing after property transformation
  // When a local variable has the same name as a signal, rename it to avoid collision
  const signalNames = new Set([
    ...properties.map(p => p.name),
    ...getters.map(g => g.name),
  ]);

  for (const name of signalNames) {
    // Check if there's ANY local variable declaration with this signal's name
    // Pattern: const/let/var name = <anything>
    // This catches both `const ctx = ctx.value` and `const ctx = canvas.getContext(...)`
    const localDeclPattern = new RegExp(
      `\\b(const|let|var)\\s+${name}(\\s*:\\s*[^=]+)?\\s*=`,
      "g"
    );

    if (localDeclPattern.test(result)) {
      // Reset regex state after test
      localDeclPattern.lastIndex = 0;

      // Rename the declaration(s): const name -> const _name
      result = result.replace(localDeclPattern, (match, declKeyword, typeAnnotation) => {
        const typeStr = typeAnnotation || "";
        return `${declKeyword} _${name}${typeStr} =`;
      });

      // Rename all bare uses of `name` (not `name.value`) to `_name`
      // Match: word boundary + name + word boundary, but NOT followed by .value
      // Also not preceded by . (method access like canvas.getContext)
      const bareUsePattern = new RegExp(
        `(?<!\\.)\\b${name}\\b(?!\\.value)`,
        "g"
      );
      result = result.replace(bareUsePattern, `_${name}`);
    }
  }

  // Transform getter references: this.getterName -> getterName.value
  // IMPORTANT: Use word boundary \b to avoid matching longer names
  for (const getter of getters) {
    const thisPattern = new RegExp(`this\\.${getter.name}\\b`, "g");
    result = result.replace(thisPattern, `${getter.name}.value`);
  }

  // Transform method calls: this.methodName( -> methodName(
  // Also handle: this.methodName.bind(this) -> methodName
  for (const method of methods) {
    // Handle .bind(this) pattern first (remove binding, not needed for arrow functions)
    const bindPattern = new RegExp(`this\\.${method.name}\\.bind\\(this\\)`, "g");
    result = result.replace(bindPattern, method.name);

    // Then handle direct calls
    const methodPattern = new RegExp(`this\\.${method.name}\\(`, "g");
    result = result.replace(methodPattern, `${method.name}(`);
  }

  // Transform array mutations on signals to create new arrays (for reactivity)
  // propName.value.push(x) -> propName.value = [...propName.value, x]
  for (const prop of properties) {
    result = transformArrayMutation(result, prop.name, "push");
    result = transformArrayMutation(result, prop.name, "unshift");

    // Handle pop: propName.value.pop() -> (propName.value = propName.value.slice(0, -1))
    const popPattern = new RegExp(`${prop.name}\\.value\\.pop\\(\\)`, "g");
    result = result.replace(popPattern, `(${prop.name}.value = ${prop.name}.value.slice(0, -1))`);

    // Handle shift: propName.value.shift() -> (propName.value = propName.value.slice(1))
    const shiftPattern = new RegExp(`${prop.name}\\.value\\.shift\\(\\)`, "g");
    result = result.replace(shiftPattern, `(${prop.name}.value = ${prop.name}.value.slice(1))`);
  }

  return result;
}

/**
 * Transform array mutation methods (push/unshift) to create new arrays
 * Handles nested parentheses in arguments
 */
function transformArrayMutation(code: string, propName: string, method: "push" | "unshift"): string {
  const searchPattern = `${propName}.value.${method}(`;
  let result = code;
  let searchStart = 0;

  while (true) {
    const startIdx = result.indexOf(searchPattern, searchStart);
    if (startIdx === -1) break;

    const argsStart = startIdx + searchPattern.length;
    const argsEnd = findMatchingParen(result, argsStart - 1);
    if (argsEnd === -1) {
      searchStart = argsStart;
      continue;
    }

    const args = result.slice(argsStart, argsEnd);

    let replacement: string;
    if (method === "push") {
      replacement = `${propName}.value = [...${propName}.value, ${args}]`;
    } else {
      replacement = `${propName}.value = [${args}, ...${propName}.value]`;
    }

    result = result.slice(0, startIdx) + replacement + result.slice(argsEnd + 1);
    searchStart = startIdx + replacement.length;
  }

  return result;
}

/**
 * Find the index of the closing parenthesis that matches the opening one at startIdx
 */
function findMatchingParen(code: string, startIdx: number): number {
  if (code[startIdx] !== "(") return -1;

  let depth = 1;
  let i = startIdx + 1;
  let inString: string | null = null;

  while (i < code.length && depth > 0) {
    const char = code[i];
    const prevChar = code[i - 1];

    // Track string boundaries
    if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
      if (inString === char) {
        inString = null;
      } else if (!inString) {
        inString = char;
      }
    }

    if (!inString) {
      if (char === "(") depth++;
      else if (char === ")") depth--;
    }

    i++;
  }

  return depth === 0 ? i - 1 : -1;
}
