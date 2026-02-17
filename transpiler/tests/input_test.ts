/**
 * Tests for @Input() decorator parsing
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  parseInputDecorators,
  hasInputDecorators,
  generatePropsInterface,
  generatePropsDestructuring,
} from "../parser/input.ts";

Deno.test("parseInputDecorators - simple input", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() name: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].name, "name");
  assertEquals(inputs[0].propertyName, "name");
  assertEquals(inputs[0].type, "string");
  assertEquals(inputs[0].required, true); // No default, not optional
});

Deno.test("parseInputDecorators - input with default value", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() age: number = 25;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].name, "age");
  assertEquals(inputs[0].type, "number");
  assertEquals(inputs[0].defaultValue, "25");
  assertEquals(inputs[0].required, false); // Has default
});

Deno.test("parseInputDecorators - required input", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input({ required: true }) id: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].name, "id");
  assertEquals(inputs[0].required, true);
});

Deno.test("parseInputDecorators - input with alias", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input({ alias: 'userName' }) internalName: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].name, "userName"); // Alias
  assertEquals(inputs[0].propertyName, "internalName"); // Original
  assertEquals(inputs[0].type, "string");
});

Deno.test("parseInputDecorators - optional type annotation", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() nickname?: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].name, "nickname");
  assertEquals(inputs[0].type, "string"); // Without ?
  assertEquals(inputs[0].required, false); // Optional
});

Deno.test("parseInputDecorators - multiple inputs", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() name: string;
  @Input() age: number = 25;
  @Input({ required: true }) id: string;
  @Input({ alias: 'userName' }) internalName: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 4);

  assertEquals(inputs[0].name, "name");
  assertEquals(inputs[0].required, true);

  assertEquals(inputs[1].name, "age");
  assertEquals(inputs[1].defaultValue, "25");

  assertEquals(inputs[2].name, "id");
  assertEquals(inputs[2].required, true);

  assertEquals(inputs[3].name, "userName");
  assertEquals(inputs[3].propertyName, "internalName");
});

Deno.test("parseInputDecorators - string default value", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() greeting: string = "Hello";
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 1);
  assertEquals(inputs[0].defaultValue, '"Hello"');
});

Deno.test("parseInputDecorators - no inputs", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  private name: string;
}
`;

  const inputs = parseInputDecorators(source);

  assertEquals(inputs.length, 0);
});

Deno.test("hasInputDecorators - true when has inputs", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  @Input() name: string;
}
`;

  assertEquals(hasInputDecorators(source), true);
});

Deno.test("hasInputDecorators - false when no inputs", () => {
  const source = `
@Component({ template: './mod.html' })
export class UserCard {
  private name: string;
}
`;

  assertEquals(hasInputDecorators(source), false);
});

Deno.test("generatePropsInterface - creates typed interface", () => {
  const inputs = [
    { name: "name", propertyName: "name", type: "string", required: false },
    { name: "age", propertyName: "age", type: "number", defaultValue: "25", required: false },
    { name: "id", propertyName: "id", type: "string", required: true },
  ];

  const result = generatePropsInterface("UserCard", inputs);

  assertEquals(result, `interface UserCardProps {
  name?: string;
  age?: number;
  id: string;
}`);
});

Deno.test("generatePropsInterface - empty for no inputs", () => {
  const result = generatePropsInterface("UserCard", []);
  assertEquals(result, "");
});

Deno.test("generatePropsDestructuring - creates const assignments", () => {
  const inputs = [
    { name: "name", propertyName: "name", type: "string", required: false },
    { name: "age", propertyName: "age", type: "number", defaultValue: "25", required: false },
    { name: "id", propertyName: "id", type: "string", required: true },
  ];

  const result = generatePropsDestructuring(inputs);

  assertEquals(result, `  const name = props.name;
  const age = props.age ?? 25;
  const id = props.id;`);
});

Deno.test("generatePropsDestructuring - handles alias", () => {
  const inputs = [
    { name: "userName", propertyName: "internalName", type: "string", required: false },
  ];

  const result = generatePropsDestructuring(inputs);

  assertEquals(result, `  const internalName = props.userName;`);
});
