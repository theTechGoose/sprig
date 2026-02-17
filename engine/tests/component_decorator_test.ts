/**
 * Tests for @Component decorator parsing
 */

import { assertEquals } from "jsr:@std/assert";
import { parseComponentDecorator } from "../parser/component.ts";

Deno.test("@Component() - empty parens", () => {
  const source = `
@Component()
export class MyComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.className, "MyComponent");
  assertEquals(result?.template, "./mod.html");
  assertEquals(result?.island, undefined); // undefined = auto-detect
  assertEquals(result?.styling, undefined);
});

Deno.test("@Component({}) - empty object", () => {
  const source = `
@Component({})
export class MyComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.className, "MyComponent");
  assertEquals(result?.template, "./mod.html");
  assertEquals(result?.island, undefined); // undefined = auto-detect
});

Deno.test("@Component({ template }) - explicit template", () => {
  const source = `
@Component({ template: './custom.html' })
export class MyComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.template, "./custom.html");
});

Deno.test("@Component({ styling }) - with styling", () => {
  const source = `
@Component({ styling: './mod.css' })
export class MyComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.template, "./mod.html"); // default
  assertEquals(result?.styling, "./mod.css");
});

Deno.test("@Component({ island: true }) - explicit island", () => {
  const source = `
@Component({ island: true })
export class MyComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.island, true);
});

Deno.test("@Component with all options", () => {
  const source = `
@Component({
  template: './view.html',
  styling: './styles.css',
  island: true
})
export class FullComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result?.className, "FullComponent");
  assertEquals(result?.template, "./view.html");
  assertEquals(result?.styling, "./styles.css");
  assertEquals(result?.island, true);
});

Deno.test("no decorator returns null", () => {
  const source = `
export class NotAComponent {}
`;
  const result = parseComponentDecorator(source);

  assertEquals(result, null);
});
