/**
 * Convert kebab-case to PascalCase
 * example-component -> ExampleComponent
 */
export function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Convert PascalCase to kebab-case
 * ExampleComponent -> example-component
 */
export function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

/**
 * Extract class name from export statement
 * "export class ExampleComponent {}" -> "ExampleComponent"
 */
export function extractClassName(source: string): string | null {
  const match = source.match(/export\s+class\s+(\w+)/);
  return match ? match[1] : null;
}
