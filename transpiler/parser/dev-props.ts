/**
 * Parser for mod.json dev props files
 * Used to provide default props for development routes
 */

import { join, dirname } from "@std/path";
import type { InputMetadata } from "./input.ts";

/**
 * Dev props configuration from mod.json
 */
export interface DevProps {
  /** Default props for the component */
  props: Record<string, unknown>;

  /** Named scenarios with different prop configurations */
  scenarios?: Record<string, Record<string, unknown>>;
}

/**
 * Parse a mod.json file from a component directory
 */
export async function parseDevProps(componentPath: string): Promise<DevProps | null> {
  const modJsonPath = join(componentPath, "mod.json");

  try {
    const content = await Deno.readTextFile(modJsonPath);
    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.props || typeof parsed.props !== "object") {
      console.warn(`Warning: mod.json at ${modJsonPath} missing 'props' object`);
      return { props: {}, scenarios: parsed.scenarios };
    }

    return {
      props: parsed.props,
      scenarios: parsed.scenarios,
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // No mod.json file - that's fine
      return null;
    }
    console.warn(`Warning: Could not parse mod.json at ${modJsonPath}:`, error);
    return null;
  }
}

/**
 * Generate default props from @Input metadata when no mod.json exists
 */
export function generateDefaultProps(inputs: InputMetadata[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const input of inputs) {
    const name = input.name;

    // Use default value if available
    if (input.defaultValue !== undefined) {
      // Try to parse the default value
      try {
        // Handle common cases
        if (input.defaultValue === "true") {
          props[name] = true;
        } else if (input.defaultValue === "false") {
          props[name] = false;
        } else if (input.defaultValue === "null") {
          props[name] = null;
        } else if (/^-?\d+$/.test(input.defaultValue)) {
          props[name] = parseInt(input.defaultValue, 10);
        } else if (/^-?\d+\.\d+$/.test(input.defaultValue)) {
          props[name] = parseFloat(input.defaultValue);
        } else if (
          (input.defaultValue.startsWith('"') && input.defaultValue.endsWith('"')) ||
          (input.defaultValue.startsWith("'") && input.defaultValue.endsWith("'"))
        ) {
          // String literal
          props[name] = input.defaultValue.slice(1, -1);
        } else if (input.defaultValue.startsWith("[") || input.defaultValue.startsWith("{")) {
          // JSON literal
          props[name] = JSON.parse(input.defaultValue);
        } else {
          // Use as-is
          props[name] = input.defaultValue;
        }
      } catch {
        props[name] = input.defaultValue;
      }
      continue;
    }

    // Generate placeholder based on type
    const type = input.type?.toLowerCase();

    switch (type) {
      case "string":
        props[name] = `Sample ${name}`;
        break;
      case "number":
        props[name] = 42;
        break;
      case "boolean":
        props[name] = true;
        break;
      case "string[]":
        props[name] = ["Item 1", "Item 2", "Item 3"];
        break;
      case "number[]":
        props[name] = [1, 2, 3];
        break;
      default:
        // Unknown type - use a descriptive placeholder
        props[name] = `[${name}]`;
    }
  }

  return props;
}

/**
 * Merge mod.json props with defaults from @Input
 */
export function mergeDevProps(
  modJsonProps: DevProps | null,
  inputs: InputMetadata[],
): DevProps {
  const defaults = generateDefaultProps(inputs);

  if (!modJsonProps) {
    return { props: defaults };
  }

  // Merge mod.json props over defaults
  return {
    props: { ...defaults, ...modJsonProps.props },
    scenarios: modJsonProps.scenarios,
  };
}
