/**
 * Pipe transformer for Angular-like pipe syntax
 * Converts {{value | pipeName:arg1:arg2}} to JavaScript expressions
 */

export interface CustomPipe {
  name: string;
  functionName: string;
}

/**
 * Built-in pipe definitions
 */
const BUILT_IN_PIPES: Record<string, (value: string, args: string[]) => string> = {
  uppercase: (value) => `${value}.toUpperCase()`,
  lowercase: (value) => `${value}.toLowerCase()`,
  titlecase: (value) => `toTitleCase(${value})`,
  json: (value) => `JSON.stringify(${value})`,

  // Async pipe - unwraps promises reactively using signals
  async: (value) => `asyncPipe(${value})`,

  slice: (value, args) => {
    if (args.length === 0) {
      return `${value}.slice()`;
    } else if (args.length === 1) {
      return `${value}.slice(${args[0]})`;
    } else {
      return `${value}.slice(${args[0]}, ${args[1]})`;
    }
  },

  currency: (value, args) => {
    if (args.length === 0) {
      return `formatCurrency(${value})`;
    } else {
      return `formatCurrency(${value}, ${args[0]})`;
    }
  },

  date: (value, args) => {
    if (args.length === 0) {
      return `formatDate(${value})`;
    } else {
      return `formatDate(${value}, ${args[0]})`;
    }
  },

  number: (value, args) => {
    if (args.length === 0) {
      return `Number(${value})`;
    } else {
      return `formatNumber(${value}, ${args[0]})`;
    }
  },

  percent: (value) => `formatPercent(${value})`,

  default: (value, args) => {
    const defaultValue = args[0] || "''";
    return `(${value} ?? ${defaultValue})`;
  },
};

/**
 * Parse a pipe expression into its components
 * Handles quoted strings that may contain pipe characters
 * Also handles JavaScript || operator (not a pipe)
 */
function parsePipeExpression(expression: string): { value: string; pipes: Array<{ name: string; args: string[] }> } {
  const pipes: Array<{ name: string; args: string[] }> = [];

  // Split by | but respect quoted strings and || operators
  const parts: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if ((char === '"' || char === "'") && (i === 0 || expression[i - 1] !== "\\")) {
      if (inQuote === char) {
        inQuote = null;
      } else if (!inQuote) {
        inQuote = char;
      }
    }

    if (char === "|" && !inQuote) {
      // Check if this is || (JavaScript OR operator) - not a pipe
      if (i + 1 < expression.length && expression[i + 1] === "|") {
        // Add both | characters and skip the next one
        current += "||";
        i++;
      } else {
        parts.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  if (parts.length === 0) {
    return { value: expression.trim(), pipes: [] };
  }

  const value = parts[0];

  // Parse each pipe: pipeName:arg1:arg2
  for (let i = 1; i < parts.length; i++) {
    const pipePart = parts[i];
    const pipeArgs = parsePipeArgs(pipePart);

    if (pipeArgs.length > 0) {
      pipes.push({
        name: pipeArgs[0],
        args: pipeArgs.slice(1),
      });
    }
  }

  return { value, pipes };
}

/**
 * Parse pipe arguments, respecting quoted strings
 * pipeName:arg1:'string arg':arg3 -> ['pipeName', 'arg1', "'string arg'", 'arg3']
 */
function parsePipeArgs(pipeExpr: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < pipeExpr.length; i++) {
    const char = pipeExpr[i];

    if ((char === '"' || char === "'") && (i === 0 || pipeExpr[i - 1] !== "\\")) {
      if (inQuote === char) {
        inQuote = null;
      } else if (!inQuote) {
        inQuote = char;
      }
      current += char;
    } else if (char === ":" && !inQuote) {
      if (current.trim()) {
        args.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Check if value needs to be wrapped in parentheses for method chaining
 * Complex expressions like "a + b" need wrapping
 */
function needsParens(value: string): boolean {
  // Simple identifiers, property access, method calls, array access don't need parens
  // But expressions with operators do
  const simplePattern = /^[\w$][\w$.\[\]()]*$/;
  const parenWrapped = /^\([^)]+\)$/;

  if (simplePattern.test(value) || parenWrapped.test(value)) {
    return false;
  }

  // Check for operators that would need wrapping
  const operators = ['+', '-', '*', '/', '%', '&&', '||', '?', ':', '<', '>', '=', '!'];
  for (const op of operators) {
    if (value.includes(op)) {
      return true;
    }
  }

  return false;
}

/**
 * Transform a pipe expression to JavaScript
 * @param expression - The expression including pipes (e.g., "value | uppercase | slice:0:10")
 * @param customPipes - Map of custom pipe names to function names
 * @returns The transformed JavaScript expression
 */
export function transformPipeExpression(
  expression: string,
  customPipes?: Record<string, string>,
): string {
  const { value, pipes } = parsePipeExpression(expression);

  if (pipes.length === 0) {
    return value.trim();
  }

  let result = value;

  for (const pipe of pipes) {
    const pipeHandler = BUILT_IN_PIPES[pipe.name];

    if (pipeHandler) {
      // Built-in pipe
      // Some pipes need the value wrapped if it's a complex expression
      const wrappedValue = needsParens(result) ? `(${result})` : result;
      result = pipeHandler(wrappedValue, pipe.args);
    } else if (customPipes && customPipes[pipe.name]) {
      // Custom pipe - call as function
      const fnName = customPipes[pipe.name];
      if (pipe.args.length > 0) {
        result = `${fnName}(${result}, ${pipe.args.join(", ")})`;
      } else {
        result = `${fnName}(${result})`;
      }
    } else {
      // Unknown pipe - treat as custom pipe with same name
      if (pipe.args.length > 0) {
        result = `${pipe.name}(${result}, ${pipe.args.join(", ")})`;
      } else {
        result = `${pipe.name}(${result})`;
      }
    }
  }

  return result;
}

/**
 * Transform interpolation text that may contain pipes
 * {{value | pipe}} -> {transformedExpression}
 */
export function transformInterpolationWithPipes(
  text: string,
  customPipes?: Record<string, string>,
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
    const transformed = transformPipeExpression(expr.trim(), customPipes);
    return `{${transformed}}`;
  });
}

/**
 * Get the list of helper functions needed for the used pipes
 */
export function getRequiredPipeHelpers(html: string): string[] {
  const helpers: Set<string> = new Set();

  // Find all pipe usages in interpolations
  const pipePattern = /\{\{[^}]*\|[^}]*\}\}/g;
  const matches = html.match(pipePattern) || [];

  for (const match of matches) {
    const expr = match.slice(2, -2); // Remove {{ and }}
    const { pipes } = parsePipeExpression(expr);

    for (const pipe of pipes) {
      if (pipe.name === "async") {
        helpers.add("asyncPipe");
      } else if (pipe.name === "titlecase") {
        helpers.add("toTitleCase");
      } else if (pipe.name === "currency") {
        helpers.add("formatCurrency");
      } else if (pipe.name === "date") {
        helpers.add("formatDate");
      } else if (pipe.name === "number" && pipe.args.length > 0) {
        helpers.add("formatNumber");
      } else if (pipe.name === "percent") {
        helpers.add("formatPercent");
      }
    }
  }

  return Array.from(helpers);
}
