/**
 * Tests for dev routes generation
 */

import { assertEquals } from "jsr:@std/assert";
import {
  generateDevRoute,
  generateDevIndex,
} from "../generator/dev-routes.ts";
import {
  parseDevProps,
  generateDefaultProps,
  mergeDevProps,
} from "../parser/dev-props.ts";
import type { SprigComponent } from "../parser/mod.ts";
import type { TranspilerConfig } from "../config/transpiler-config.ts";
import type { InputMetadata } from "../parser/input.ts";

const testConfig: TranspilerConfig = {
  devMode: true,
  devRoutesPath: "dev",
  devRoutePrefix: "/dev",
  generateDevRoutes: true,
};

function createMockComponent(
  name: string,
  island: boolean = false,
  inputs: InputMetadata[] = [],
): SprigComponent {
  return {
    path: `/src/components/${name}`,
    relativePath: `components/${name}`,
    type: "component",
    metadata: {
      className: name,
      template: "./mod.html",
      island,
    },
    template: "<div>Test</div>",
    source: `@Component({ template: './mod.html' }) export class ${name} {}`,
    originalFilename: "mod.ts",
    inputs,
  };
}

// Tests for generateDefaultProps

Deno.test("generateDefaultProps - string type", () => {
  const inputs: InputMetadata[] = [
    { name: "title", propertyName: "title", type: "string", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.title, "Sample title");
});

Deno.test("generateDefaultProps - number type", () => {
  const inputs: InputMetadata[] = [
    { name: "count", propertyName: "count", type: "number", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.count, 42);
});

Deno.test("generateDefaultProps - boolean type", () => {
  const inputs: InputMetadata[] = [
    { name: "active", propertyName: "active", type: "boolean", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.active, true);
});

Deno.test("generateDefaultProps - string array type", () => {
  const inputs: InputMetadata[] = [
    { name: "items", propertyName: "items", type: "string[]", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.items, ["Item 1", "Item 2", "Item 3"]);
});

Deno.test("generateDefaultProps - number array type", () => {
  const inputs: InputMetadata[] = [
    { name: "values", propertyName: "values", type: "number[]", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.values, [1, 2, 3]);
});

Deno.test("generateDefaultProps - with default value", () => {
  const inputs: InputMetadata[] = [
    { name: "name", propertyName: "name", type: "string", defaultValue: '"John"', required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.name, "John");
});

Deno.test("generateDefaultProps - with boolean default", () => {
  const inputs: InputMetadata[] = [
    { name: "enabled", propertyName: "enabled", type: "boolean", defaultValue: "false", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.enabled, false);
});

Deno.test("generateDefaultProps - with number default", () => {
  const inputs: InputMetadata[] = [
    { name: "age", propertyName: "age", type: "number", defaultValue: "25", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.age, 25);
});

Deno.test("generateDefaultProps - with JSON array default", () => {
  const inputs: InputMetadata[] = [
    { name: "tags", propertyName: "tags", type: "string[]", defaultValue: '["a", "b"]', required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.tags, ["a", "b"]);
});

Deno.test("generateDefaultProps - unknown type", () => {
  const inputs: InputMetadata[] = [
    { name: "data", propertyName: "data", type: "CustomType", required: false },
  ];

  const props = generateDefaultProps(inputs);

  assertEquals(props.data, "[data]");
});

// Tests for mergeDevProps

Deno.test("mergeDevProps - no mod.json", () => {
  const inputs: InputMetadata[] = [
    { name: "title", propertyName: "title", type: "string", required: false },
  ];

  const result = mergeDevProps(null, inputs);

  assertEquals(result.props.title, "Sample title");
  assertEquals(result.scenarios, undefined);
});

Deno.test("mergeDevProps - mod.json overrides defaults", () => {
  const inputs: InputMetadata[] = [
    { name: "title", propertyName: "title", type: "string", required: false },
    { name: "count", propertyName: "count", type: "number", required: false },
  ];

  const modJsonProps = {
    props: { title: "Custom Title" },
  };

  const result = mergeDevProps(modJsonProps, inputs);

  assertEquals(result.props.title, "Custom Title");
  assertEquals(result.props.count, 42); // Default from generateDefaultProps
});

Deno.test("mergeDevProps - preserves scenarios", () => {
  const inputs: InputMetadata[] = [];

  const modJsonProps = {
    props: { name: "Default" },
    scenarios: {
      loading: { name: null },
      error: { name: "Error" },
    },
  };

  const result = mergeDevProps(modJsonProps, inputs);

  assertEquals(result.scenarios?.loading.name, null);
  assertEquals(result.scenarios?.error.name, "Error");
});

// Tests for generateDevRoute

Deno.test("generateDevRoute - basic component", async () => {
  const component = createMockComponent("UserCard");

  const result = await generateDevRoute(component, testConfig);

  assertEquals(result.componentName, "UserCard");
  assertEquals(result.outputPath, "routes/dev/user-card/index.tsx");
  assertEquals(result.content.includes("import UserCard from"), true);
  assertEquals(result.content.includes("function DevUserCard"), true);
});

Deno.test("generateDevRoute - island component", async () => {
  const component = createMockComponent("Counter", true);

  const result = await generateDevRoute(component, testConfig);

  assertEquals(result.content.includes('@/islands/Counter.tsx"'), true);
});

Deno.test("generateDevRoute - component with inputs", async () => {
  const inputs: InputMetadata[] = [
    { name: "name", propertyName: "name", type: "string", required: false },
    { name: "age", propertyName: "age", type: "number", defaultValue: "25", required: false },
  ];
  const component = createMockComponent("Profile", false, inputs);

  const result = await generateDevRoute(component, testConfig);

  // Should include generated props
  assertEquals(result.content.includes('"name":'), true);
  assertEquals(result.content.includes('"age":'), true);
});

Deno.test("generateDevRoute - slug conversion", async () => {
  const component = createMockComponent("UserProfileCard");

  const result = await generateDevRoute(component, testConfig);

  assertEquals(result.outputPath, "routes/dev/user-profile-card/index.tsx");
});

// Tests for generateDevIndex

Deno.test("generateDevIndex - empty components", () => {
  const result = generateDevIndex([], testConfig);

  assertEquals(result.outputPath, "routes/dev/index.tsx");
  assertEquals(result.content.includes("Components ({0})"), true);
});

Deno.test("generateDevIndex - with components", () => {
  const components = [
    createMockComponent("UserCard"),
    createMockComponent("Counter", true),
  ];

  const result = generateDevIndex(components, testConfig);

  assertEquals(result.content.includes("UserCard"), true);
  assertEquals(result.content.includes("Counter"), true);
  assertEquals(result.content.includes("/dev/user-card"), true);
  assertEquals(result.content.includes("/dev/counter"), true);
});

Deno.test("generateDevIndex - shows island badge", () => {
  const components = [createMockComponent("Counter", true)];

  const result = generateDevIndex(components, testConfig);

  assertEquals(result.content.includes("Island"), true);
});

Deno.test("generateDevIndex - shows input count", () => {
  const inputs: InputMetadata[] = [
    { name: "name", propertyName: "name", type: "string", required: false },
    { name: "age", propertyName: "age", type: "number", required: false },
  ];
  const components = [createMockComponent("Profile", false, inputs)];

  const result = generateDevIndex(components, testConfig);

  assertEquals(result.content.includes("2 props"), true);
});

Deno.test("generateDevIndex - singular prop label", () => {
  const inputs: InputMetadata[] = [
    { name: "name", propertyName: "name", type: "string", required: false },
  ];
  const components = [createMockComponent("Profile", false, inputs)];

  const result = generateDevIndex(components, testConfig);

  assertEquals(result.content.includes("1 prop)"), true);
});
