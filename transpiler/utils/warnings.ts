/**
 * Warning system for the transpiler
 */

export type WarningLevel = "error" | "warning" | "info";

export interface TranspilerWarning {
  level: WarningLevel;
  code: string;
  message: string;
  /** Source location if available */
  location?: {
    line?: number;
    column?: number;
    source?: string;
  };
}

// Warning codes
export const WarningCodes = {
  // Directive warnings
  INVALID_FOR_SYNTAX: "INVALID_FOR_SYNTAX",
  EMPTY_FOR_EXPRESSION: "EMPTY_FOR_EXPRESSION",
  ORPHAN_ELSE: "ORPHAN_ELSE",
  EMPTY_IF_CONDITION: "EMPTY_IF_CONDITION",
  UNKNOWN_DIRECTIVE: "UNKNOWN_DIRECTIVE",

  // Binding warnings
  EMPTY_BINDING_EXPRESSION: "EMPTY_BINDING_EXPRESSION",
  INVALID_TWO_WAY_BINDING: "INVALID_TWO_WAY_BINDING",
  DANGEROUS_BINDING: "DANGEROUS_BINDING",

  // Pipe warnings
  UNKNOWN_PIPE: "UNKNOWN_PIPE",
  EMPTY_PIPE_NAME: "EMPTY_PIPE_NAME",
  INVALID_PIPE_ARGS: "INVALID_PIPE_ARGS",

  // Parser warnings
  UNCLOSED_TAG: "UNCLOSED_TAG",
  MALFORMED_ATTRIBUTE: "MALFORMED_ATTRIBUTE",
} as const;

/**
 * Warning collector for a single transformation
 */
export class WarningCollector {
  private warnings: TranspilerWarning[] = [];

  warn(code: string, message: string, location?: TranspilerWarning["location"]): void {
    this.warnings.push({ level: "warning", code, message, location });
  }

  error(code: string, message: string, location?: TranspilerWarning["location"]): void {
    this.warnings.push({ level: "error", code, message, location });
  }

  info(code: string, message: string, location?: TranspilerWarning["location"]): void {
    this.warnings.push({ level: "info", code, message, location });
  }

  getWarnings(): TranspilerWarning[] {
    return [...this.warnings];
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  hasErrors(): boolean {
    return this.warnings.some((w) => w.level === "error");
  }

  clear(): void {
    this.warnings = [];
  }

  /**
   * Print warnings to console
   */
  print(): void {
    for (const warning of this.warnings) {
      const prefix = warning.level === "error" ? "ERROR" : warning.level === "warning" ? "WARN" : "INFO";
      const loc = warning.location?.source ? ` in "${warning.location.source}"` : "";
      console.warn(`[${prefix}] ${warning.code}: ${warning.message}${loc}`);
    }
  }
}

/**
 * Global warning collector (for simple usage)
 */
let globalCollector: WarningCollector | null = null;

export function getGlobalWarningCollector(): WarningCollector {
  if (!globalCollector) {
    globalCollector = new WarningCollector();
  }
  return globalCollector;
}

export function resetGlobalWarnings(): void {
  globalCollector = null;
}

/**
 * Dangerous property bindings that could lead to XSS
 */
export const DANGEROUS_BINDINGS = new Set([
  "innerHTML",
  "outerHTML",
  "dangerouslySetInnerHTML",
]);

/**
 * Check if a binding is potentially dangerous
 */
export function isDangerousBinding(propName: string): boolean {
  return DANGEROUS_BINDINGS.has(propName);
}
