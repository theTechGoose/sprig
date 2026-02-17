/**
 * Generate component and island files
 */

import { join } from "@std/path";
import type { SprigComponent, SprigService, InputMetadata } from "../parser/mod.ts";
import {
  parseClass,
  transformMethodBody,
  generatePropsInterface,
  generatePropsDestructuring,
  type ClassProperty,
  type ClassMethod,
  type ClassGetter,
  type InputInfo,
} from "../parser/mod.ts";
import { htmlToJsx, requiresIsland } from "../transformer/mod.ts";

/**
 * Detect which inputs are assigned to within method bodies.
 * These inputs need to be converted to signals for mutability.
 */
function detectAssignedInputs(
  inputs: InputMetadata[],
  methods: ClassMethod[],
  getters: ClassGetter[],
): Set<string> {
  const assignedInputs = new Set<string>();

  // Combine all code bodies to search
  const allBodies = [
    ...methods.map(m => m.body),
    ...getters.map(g => g.body),
  ].join("\n");

  for (const input of inputs) {
    // Look for assignment pattern: this.inputName = (not ==)
    const assignPattern = new RegExp(`this\\.${input.propertyName}\\s*=(?!=)`, "g");
    if (assignPattern.test(allBodies)) {
      assignedInputs.add(input.propertyName);
    }
  }

  return assignedInputs;
}

export interface GeneratedComponent {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Generated TSX content */
  content: string;
}

/**
 * Generate island or component file from Sprig component
 */
export function generateComponent(
  component: SprigComponent,
  allComponents: SprigComponent[],
  allServices: SprigService[] = [],
): GeneratedComponent {
  const parsedClass = parseClass(component.source);
  const dependencies = parsedClass?.dependencies || [];
  const hasDependencies = dependencies.length > 0;
  const inputs = component.inputs || [];
  const hasInputs = inputs.length > 0;

  // Determine if component should be an island:
  // 1. If explicitly set in decorator (island: true/false), respect that
  // 2. Otherwise auto-detect based on:
  //    - Has event handlers or two-way bindings (needs JS)
  //    - Has service dependencies (runtime behavior)
  const hasClassState = parsedClass ? parsedClass.properties.length > 0 : false;
  const needsClientJs = requiresIsland(component.template);

  let isIsland: boolean;
  if (component.metadata.island !== undefined) {
    // Explicit setting takes precedence
    isIsland = component.metadata.island;
  } else {
    // Auto-detect: only based on interactive features, not class state
    // (class state could be for SSR interpolation)
    isIsland = needsClientJs || hasDependencies;
  }

  // Transform JSX, replacing service references in template
  let template = component.template;
  if (hasDependencies) {
    template = transformServiceReferencesInTemplate(template, dependencies);
  }

  let { jsx, imports, usedPipes, usedDirectives, slotInfo, templateRefs } = htmlToJsx(template, allComponents);

  // Detect which inputs are assigned to (need to be signals) for JSX transformation
  const signalInputNames = (isIsland && parsedClass)
    ? [...detectAssignedInputs(inputs, parsedClass.methods, parsedClass.getters)]
    : [];

  // For islands, transform property and getter references to use .value (signals)
  const hasSignals = parsedClass && (parsedClass.properties.length > 0 || parsedClass.getters.length > 0 || signalInputNames.length > 0);
  if (isIsland && hasSignals) {
    jsx = transformPropertyReferencesToSignals(jsx, parsedClass!.properties, parsedClass!.getters, signalInputNames);
  }

  // Determine if component uses slots (needs children prop)
  const usesSlots = slotInfo?.hasSlot || false;
  const usesDefaultSlot = slotInfo?.hasDefaultSlot || false;
  const namedSlots = slotInfo?.namedSlots || [];

  // Check for template refs
  const hasTemplateRefs = templateRefs && templateRefs.length > 0;

  const folder = isIsland ? "islands" : "components";
  const outputPath = `${folder}/${component.metadata.className}.tsx`;

  // Build imports section
  const importLines: string[] = [];

  // Add preact types import if using slots
  if (usesSlots) {
    importLines.push('import type { ComponentChildren } from "preact";');
  }

  // Check for lifecycle methods (ngOnInit, onInit, onDestroy)
  const initMethods = ["ngOnInit", "onInit"];
  const destroyMethods = ["ngOnDestroy", "onDestroy"];
  const hasInitMethod = parsedClass?.methods.some(m => initMethods.includes(m.name)) ?? false;
  const hasDestroyMethod = parsedClass?.methods.some(m => destroyMethods.includes(m.name)) ?? false;
  const hasLifecycleMethod = hasInitMethod || hasDestroyMethod;

  // Check for getters
  const hasGetters = parsedClass?.getters && parsedClass.getters.length > 0;

  // Add signal imports if island with local state or getters
  if (isIsland && (hasClassState || hasGetters) && parsedClass) {
    if (hasGetters && hasClassState) {
      importLines.push('import { useSignal, computed } from "@preact/signals";');
    } else if (hasGetters) {
      importLines.push('import { computed } from "@preact/signals";');
    } else {
      importLines.push('import { useSignal } from "@preact/signals";');
    }
  }

  // Add preact/hooks imports (useEffect, useRef)
  if (isIsland && (hasLifecycleMethod || hasTemplateRefs)) {
    const hooks: string[] = [];
    if (hasLifecycleMethod) hooks.push("useEffect");
    if (hasTemplateRefs) hooks.push("useRef");
    importLines.push(`import { ${hooks.join(", ")} } from "preact/hooks";`);
  }

  // Add service imports via DI container
  if (dependencies.length > 0) {
    const serviceImports = dependencies
      .map((dep) => `get${dep.type}`)
      .join(", ");
    importLines.push(`import { ${serviceImports} } from "@/services/container.ts";`);
  }

  // Add custom pipe imports
  if (usedPipes && usedPipes.length > 0) {
    for (const pipe of usedPipes) {
      importLines.push(`import { ${pipe.functionName} } from "${pipe.importPath}";`);
    }
  }

  // Add custom directive imports
  if (usedDirectives && usedDirectives.length > 0) {
    for (const directive of usedDirectives) {
      importLines.push(`import { ${directive.transformFn} } from "${directive.importPath}";`);
    }
  }

  for (const imp of imports) {
    importLines.push(
      `import ${imp.componentName} from "${imp.importPath}";`,
    );
  }

  const importsSection = importLines.length > 0
    ? importLines.join("\n") + "\n\n"
    : "";

  // Include module-level code (interfaces, types, constants) if present
  const moduleCodeSection = parsedClass?.moduleCode
    ? parsedClass.moduleCode + "\n\n"
    : "";

  // Generate state and methods for islands
  let stateSection = "";
  let refsSection = "";
  let methodsSection = "";
  let serviceSection = "";
  let effectSection = "";

  // Generate template refs as useRef
  // Use HTMLElement | null which works with any HTML element and allows property access
  if (hasTemplateRefs && templateRefs) {
    for (const refName of templateRefs) {
      refsSection += `  const ${refName} = useRef<HTMLElement | null>(null);\n`;
    }
  }

  // Generate service instance references via DI container
  if (hasDependencies) {
    for (const dep of dependencies) {
      const camelName = dep.type.charAt(0).toLowerCase() + dep.type.slice(1);
      // Resolve from container (handles both singletons and transients)
      serviceSection += `  const ${camelName} = get${dep.type}();\n`;
    }
  }

  if (parsedClass) {
    if (isIsland) {
      // Detect which inputs are assigned to (need to be signals)
      const assignedInputs = detectAssignedInputs(inputs, parsedClass.methods, parsedClass.getters);

      // Generate local state (properties) as signals for islands
      for (const prop of parsedClass.properties) {
        // Include type annotation if property has one (e.g., observer: IntersectionObserver | null)
        if (prop.type) {
          stateSection += `  const ${prop.name} = useSignal<${prop.type}>(${prop.initialValue});\n`;
        } else {
          stateSection += `  const ${prop.name} = useSignal(${prop.initialValue});\n`;
        }
      }

      // Generate signals for assigned inputs (inputs that are mutated)
      for (const input of inputs) {
        if (assignedInputs.has(input.propertyName)) {
          const typeAnnotation = input.type ? `<${input.type}>` : "";
          const defaultValue = input.defaultValue || (input.type?.includes("[]") ? "[]" : "undefined");
          stateSection += `  const ${input.propertyName} = useSignal${typeAnnotation}(props.${input.name} ?? ${defaultValue});\n`;
        }
      }

      // Convert inputs to InputInfo format for transformation
      // Mark assigned inputs as signals so they get .value treatment
      const inputInfos: InputInfo[] = inputs.map(input => ({
        name: input.name,
        propertyName: input.propertyName,
        isSignal: assignedInputs.has(input.propertyName),
      }));

      // Generate computed signals for getters
      for (const getter of parsedClass.getters) {
        let transformedBody = transformMethodBody(getter.body, parsedClass.properties, parsedClass.methods, parsedClass.getters, templateRefs || [], inputInfos);
        transformedBody = transformServiceReferencesInMethodBody(transformedBody, dependencies, allServices);

        // Check if body is multi-statement (has control flow, multiple returns, or variable declarations)
        const hasControlFlow = /\b(if|for|while|switch)\s*\(/.test(transformedBody);
        const returnCount = (transformedBody.match(/\breturn\s+/g) || []).length;
        const hasVarDecl = /\b(const|let|var)\s+\w+\s*=/.test(transformedBody);
        const isMultiStatement = hasControlFlow || returnCount > 1 || hasVarDecl;

        // Include type annotation if present to preserve type information
        const typeAnnotation = getter.returnType ? `<${getter.returnType}>` : "";

        if (isMultiStatement) {
          // Multi-statement getter: wrap in block
          stateSection += `  const ${getter.name} = computed${typeAnnotation}(() => { ${transformedBody} });\n`;
        } else {
          // Simple getter: extract return value
          const returnMatch = transformedBody.match(/return\s+(.+?)(?:;|\s*$)/);
          if (returnMatch) {
            stateSection += `  const ${getter.name} = computed${typeAnnotation}(() => ${returnMatch[1]});\n`;
          } else {
            // No explicit return, wrap in block
            stateSection += `  const ${getter.name} = computed${typeAnnotation}(() => { ${transformedBody} });\n`;
          }
        }
      }

      // Generate methods for islands
      // Separate lifecycle methods from regular methods
      const initMethodNames = ["ngOnInit", "onInit", "onMount"];
      const destroyMethodNames = ["ngOnDestroy", "onDestroy"];

      // Find init and destroy methods
      let initBody = "";
      let destroyBody = "";

      for (const method of parsedClass.methods) {
        let transformedBody = transformMethodBody(method.body, parsedClass.properties, parsedClass.methods, parsedClass.getters, templateRefs || [], inputInfos);
        // Also transform service references in method bodies
        transformedBody = transformServiceReferencesInMethodBody(transformedBody, dependencies, allServices);

        if (initMethodNames.includes(method.name)) {
          initBody = transformedBody;
        } else if (destroyMethodNames.includes(method.name)) {
          destroyBody = transformedBody;
        } else {
          // Regular method
          const params = method.params.join(", ");
          const asyncKeyword = method.isAsync ? "async " : "";
          methodsSection += `\n  const ${method.name} = ${asyncKeyword}(${params}) => {\n    ${transformedBody}\n  };\n`;
        }
      }

      // Generate combined useEffect for lifecycle methods
      if (initBody || destroyBody) {
        if (initBody && destroyBody) {
          effectSection += `\n  useEffect(() => {\n    ${initBody}\n    return () => {\n      ${destroyBody}\n    };\n  }, []);\n`;
        } else if (initBody) {
          effectSection += `\n  useEffect(() => {\n    ${initBody}\n  }, []);\n`;
        } else if (destroyBody) {
          effectSection += `\n  useEffect(() => {\n    return () => {\n      ${destroyBody}\n    };\n  }, []);\n`;
        }
      }
    } else {
      // For server components, generate properties as simple const values
      for (const prop of parsedClass.properties) {
        stateSection += `  const ${prop.name} = ${prop.initialValue};\n`;
      }

      // Generate getters for server components (computed at render time)
      for (const getter of parsedClass.getters) {
        // Remove "this." references since we're in a function, not a class
        let body = getter.body.replace(/this\./g, "");

        // Check if body is multi-statement
        const isMultiStatement =
          /\b(const|let|var)\s+\w+\s*=/.test(body) ||
          /\bif\s*\(/.test(body) ||
          (body.match(/return\s+/g) || []).length > 1 ||
          body.split(";").filter(s => s.trim()).length > 1;

        if (isMultiStatement) {
          // Multi-statement getter needs to be an IIFE
          stateSection += `  const ${getter.name} = (() => {\n    ${body.trim().split('\n').join('\n    ')}\n  })();\n`;
        } else {
          // Simple getter - strip leading "return " and trailing semicolon
          body = body.replace(/^\s*return\s+/, "");
          body = body.replace(/;\s*$/, "");
          stateSection += `  const ${getter.name} = ${body};\n`;
        }
      }

      // Generate methods for server components
      for (const method of parsedClass.methods) {
        // Skip lifecycle methods
        if (['ngOnInit', 'onInit', 'ngOnDestroy', 'onDestroy', 'constructor'].includes(method.name)) {
          continue;
        }

        // Remove "this." references
        let body = method.body.replace(/this\./g, "");
        const params = method.params.join(", ");

        // Check if body already has braces or is multi-statement
        const hasBlockBraces = body.trim().startsWith("{") && body.trim().endsWith("}");
        const isMultiStatement = body.includes(";") ||
          /\b(const|let|var)\s+/.test(body) ||
          body.includes("\n");

        if (isMultiStatement && !hasBlockBraces) {
          methodsSection += `  const ${method.name} = (${params}) => {\n    ${body.trim()}\n  };\n`;
        } else {
          methodsSection += `  const ${method.name} = (${params}) => ${body};\n`;
        }
      }
    }
  }

  // Generate props destructuring for @Input and slots
  // Exclude assigned inputs - they're already generated as signals in stateSection
  let propsSection = "";
  const assignedInputs = parsedClass && isIsland
    ? detectAssignedInputs(inputs, parsedClass.methods, parsedClass.getters)
    : new Set<string>();
  const regularInputs = inputs.filter(i => !assignedInputs.has(i.propertyName));
  if (regularInputs.length > 0) {
    propsSection = generatePropsDestructuring(regularInputs) + "\n";
  }
  // Add slot destructuring
  if (usesDefaultSlot) {
    propsSection += "  const { children } = props;\n";
  }
  for (const slotName of namedSlots) {
    propsSection += `  const { ${slotName} } = props;\n`;
  }

  const bodyPrefix = serviceSection + propsSection + refsSection + stateSection + effectSection + methodsSection;
  const hasBody = bodyPrefix.trim().length > 0;

  // Generate props interface if component has inputs or slots
  let propsInterface = "";
  let funcSignature = `${component.metadata.className}()`;
  const needsProps = hasInputs || usesSlots;

  if (needsProps) {
    // Build props interface with inputs and slot types
    let propsLines: string[] = [];

    // Add @Input props
    if (hasInputs) {
      for (const input of inputs) {
        const optional = input.required ? "" : "?";
        const type = input.type || "unknown";
        propsLines.push(`  ${input.name}${optional}: ${type};`);
      }
    }

    // Add slot props
    if (usesDefaultSlot) {
      propsLines.push(`  children?: ComponentChildren;`);
    }
    for (const slotName of namedSlots) {
      propsLines.push(`  ${slotName}?: ComponentChildren;`);
    }

    propsInterface = `interface ${component.metadata.className}Props {\n${propsLines.join("\n")}\n}\n\n`;
    funcSignature = `${component.metadata.className}(props: ${component.metadata.className}Props)`;
  }

  // Handle JSX that starts with { (conditional/map expression from *if or *for)
  // The transformer generates `{condition && element}` which is valid inside JSX
  // but invalid as a direct return value. We need to:
  // 1. Remove the outer {} braces
  // 2. Wrap in () parentheses for proper expression grouping
  let wrappedJsx = jsx;
  const trimmedJsx = jsx.trimStart();
  if (trimmedJsx.startsWith("{") && trimmedJsx.endsWith("}")) {
    // Remove outer braces and wrap in parentheses: {x && y} -> (x && y)
    const inner = trimmedJsx.slice(1, -1);
    wrappedJsx = `(${inner})`;
  }

  const content = hasBody
    ? `${importsSection}${moduleCodeSection}${propsInterface}export default function ${funcSignature} {
${bodyPrefix}
  return ${wrappedJsx};
}
`
    : `${importsSection}${moduleCodeSection}${propsInterface}export default function ${funcSignature} {
  return ${wrappedJsx};
}
`;

  return { outputPath, content };
}

/**
 * Transform service references in template: {{counter.count}} -> {counterService.count}
 */
function transformServiceReferencesInTemplate(
  template: string,
  dependencies: Array<{ name: string; type: string }>,
): string {
  let result = template;

  for (const dep of dependencies) {
    const camelName = dep.type.charAt(0).toLowerCase() + dep.type.slice(1);

    // Replace this.depName.prop with serviceName.prop
    const thisPattern = new RegExp(`this\\.${dep.name}\\.`, "g");
    result = result.replace(thisPattern, `${camelName}.`);

    // Replace depName.method() in event bindings like (click)="counter.increment()"
    const eventPattern = new RegExp(`${dep.name}\\.`, "g");
    result = result.replace(eventPattern, `${camelName}.`);

    // Replace {{depName.prop}} with {{serviceName.prop}}
    const interpolationPattern = new RegExp(`{{\\s*${dep.name}\\.`, "g");
    result = result.replace(interpolationPattern, `{{${camelName}.`);
  }

  return result;
}

/**
 * Transform service references in method bodies
 */
function transformServiceReferencesInMethodBody(
  body: string,
  dependencies: Array<{ name: string; type: string }>,
  _allServices: SprigService[],
): string {
  let result = body;

  for (const dep of dependencies) {
    const camelName = dep.type.charAt(0).toLowerCase() + dep.type.slice(1);
    // Replace this.depName with camelName (the resolved service variable)
    const thisPattern = new RegExp(`this\\.${dep.name}`, "g");
    result = result.replace(thisPattern, camelName);
  }

  return result;
}

/**
 * Write all island components to disk
 */
export async function writeIslands(
  components: SprigComponent[],
  allComponents: SprigComponent[],
  outDir: string,
  allServices: SprigService[] = [],
): Promise<void> {
  const islands = components.filter((c) => c.metadata.island);

  for (const island of islands) {
    const { outputPath, content } = generateComponent(island, allComponents, allServices);
    const fullPath = join(outDir, outputPath);
    const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, content);
  }
}

/**
 * Write all non-island components to disk
 */
export async function writeComponents(
  components: SprigComponent[],
  allComponents: SprigComponent[],
  outDir: string,
  allServices: SprigService[] = [],
): Promise<void> {
  const regularComponents = components.filter(
    (c) => !c.metadata.island && c.type === "component",
  );

  for (const component of regularComponents) {
    const { outputPath, content } = generateComponent(component, allComponents, allServices);
    const fullPath = join(outDir, outputPath);
    const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, content);
  }
}

/**
 * Transform property and getter references in JSX to use .value for signals (islands only)
 * Transforms: {visible} -> {visible.value}
 *            {visible && ...} -> {visible.value && ...}
 *            {!visible && ...} -> {!visible.value && ...}
 *            {selected !== 'hidden' ...} -> {selected.value !== 'hidden' ...}
 * Does NOT transform:
 *            - Method calls: selectLanguage(...)
 *            - Object properties: item.name
 *            - Already transformed: visible.value
 */
function transformPropertyReferencesToSignals(
  jsx: string,
  properties: ClassProperty[],
  getters: ClassGetter[] = [],
  signalInputNames: string[] = [],
): string {
  let result = jsx;

  // Combine properties, getters, and signal inputs - all use .value
  const allSignals = [
    ...properties.map(p => p.name),
    ...getters.map(g => g.name),
    ...signalInputNames,
  ];

  for (const name of allSignals) {
    // Match signal name that:
    // - Is preceded by { or space or ( or ! (start of expression, boolean not)
    // - Is followed by:
    //   - space or } or && or || or ? or : or . or ) or ] (end of expression or operators)
    //   - comparison operators: ===, !==, ==, !=, <=, >=, <, >
    // - Is NOT followed by ( (which would make it a method call)
    // - Is NOT followed by .value (already transformed)
    const pattern = new RegExp(
      `(\\{|\\s|\\(|!)${name}(?!\\.value)(?!\\s*\\()(?=\\s*(?:[}&|?:.)\\]]|[!=<>]=?=?))`,
      "g"
    );

    result = result.replace(pattern, `$1${name}.value`);
  }

  return result;
}
