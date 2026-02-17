/**
 * Tests for the AST parser
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { tokenize } from "../parser/tokenizer/mod.ts";
import { parseTokensToAst, type ElementNode, type TextNode, type InterpolationNode } from "../parser/ast/mod.ts";

function parse(html: string) {
  const tokens = tokenize(html);
  return parseTokensToAst(tokens);
}

Deno.test("parse - simple element", () => {
  const ast = parse("<div></div>");

  assertEquals(ast.type, "document");
  assertEquals(ast.children.length, 1);

  const div = ast.children[0] as ElementNode;
  assertEquals(div.type, "element");
  assertEquals(div.tagName, "div");
  assertEquals(div.selfClosing, false);
  assertEquals(div.children.length, 0);
});

Deno.test("parse - self-closing element", () => {
  const ast = parse("<input />");

  const input = ast.children[0] as ElementNode;
  assertEquals(input.type, "element");
  assertEquals(input.tagName, "input");
  assertEquals(input.selfClosing, true);
});

Deno.test("parse - element with text content", () => {
  const ast = parse("<p>Hello World</p>");

  const p = ast.children[0] as ElementNode;
  assertEquals(p.tagName, "p");
  assertEquals(p.children.length, 1);

  const text = p.children[0] as TextNode;
  assertEquals(text.type, "text");
  assertEquals(text.content, "Hello World");
});

Deno.test("parse - element with standard attributes", () => {
  const ast = parse('<div class="container" id="main"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.attributes.length, 2);

  assertEquals(div.attributes[0].name, "class");
  assertEquals(div.attributes[0].value, "container");
  assertEquals(div.attributes[1].name, "id");
  assertEquals(div.attributes[1].value, "main");
});

Deno.test("parse - property binding", () => {
  const ast = parse('<input [value]="name" />');

  const input = ast.children[0] as ElementNode;
  assertEquals(input.bindings.length, 1);

  const binding = input.bindings[0];
  assertEquals(binding.kind, "property");
  assertEquals(binding.name, "value");
  assertEquals(binding.expression, "name");
});

Deno.test("parse - class binding", () => {
  const ast = parse('<div [class.active]="isActive"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.bindings.length, 1);

  const binding = div.bindings[0];
  assertEquals(binding.kind, "class");
  assertEquals(binding.name, "active");
  assertEquals(binding.expression, "isActive");
});

Deno.test("parse - style binding", () => {
  const ast = parse('<div [style.color]="textColor"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.bindings.length, 1);

  const binding = div.bindings[0];
  assertEquals(binding.kind, "style");
  assertEquals(binding.name, "color");
  assertEquals(binding.expression, "textColor");
});

Deno.test("parse - attribute binding", () => {
  const ast = parse('<a [attr.href]="url"></a>');

  const a = ast.children[0] as ElementNode;
  assertEquals(a.bindings.length, 1);

  const binding = a.bindings[0];
  assertEquals(binding.kind, "attribute");
  assertEquals(binding.name, "href");
  assertEquals(binding.expression, "url");
});

Deno.test("parse - event binding", () => {
  const ast = parse('<button (click)="handleClick()"></button>');

  const button = ast.children[0] as ElementNode;
  assertEquals(button.events.length, 1);

  const event = button.events[0];
  assertEquals(event.name, "click");
  assertEquals(event.handler, "handleClick()");
});

Deno.test("parse - two-way binding", () => {
  const ast = parse('<input [(value)]="name" />');

  const input = ast.children[0] as ElementNode;
  assertEquals(input.twoWayBindings.length, 1);

  const binding = input.twoWayBindings[0];
  assertEquals(binding.name, "value");
  assertEquals(binding.expression, "name");
});

Deno.test("parse - *if directive", () => {
  const ast = parse('<div *if="showIt"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.directives.length, 1);

  const directive = div.directives[0];
  assertEquals(directive.name, "if");
  assertEquals(directive.expression, "showIt");
  assertEquals(directive.isBuiltIn, true);
});

Deno.test("parse - *for directive", () => {
  const ast = parse('<div *for="let item of items"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.directives.length, 1);

  const directive = div.directives[0];
  assertEquals(directive.name, "for");
  assertEquals(directive.expression, "let item of items");
  assertEquals(directive.isBuiltIn, true);
});

Deno.test("parse - *else directive", () => {
  const ast = parse('<div *if="condition" *else="FallbackComponent"></div>');

  const div = ast.children[0] as ElementNode;
  assertEquals(div.directives.length, 2);

  const ifDirective = div.directives.find((d) => d.name === "if");
  const elseDirective = div.directives.find((d) => d.name === "else");

  assertExists(ifDirective);
  assertExists(elseDirective);
  assertEquals(elseDirective.expression, "FallbackComponent");
  assertEquals(elseDirective.isBuiltIn, true);
});

Deno.test("parse - custom directive", () => {
  const ast = parse('<p *highlight="\'yellow\'"></p>');

  const p = ast.children[0] as ElementNode;
  assertEquals(p.directives.length, 1);

  const directive = p.directives[0];
  assertEquals(directive.name, "highlight");
  assertEquals(directive.expression, "'yellow'");
  assertEquals(directive.isBuiltIn, false);
});

Deno.test("parse - interpolation in text", () => {
  const ast = parse("<p>Hello {{name}}</p>");

  const p = ast.children[0] as ElementNode;
  assertEquals(p.children.length, 2);

  const text = p.children[0] as TextNode;
  assertEquals(text.type, "text");
  assertEquals(text.content, "Hello ");

  const interpolation = p.children[1] as InterpolationNode;
  assertEquals(interpolation.type, "interpolation");
  assertEquals(interpolation.expression, "name");
});

Deno.test("parse - interpolation with pipe", () => {
  const ast = parse("<p>{{name | uppercase}}</p>");

  const p = ast.children[0] as ElementNode;
  const interpolation = p.children[0] as InterpolationNode;

  assertEquals(interpolation.expression, "name | uppercase");
});

Deno.test("parse - nested elements", () => {
  const ast = parse("<div><span>Text</span></div>");

  const div = ast.children[0] as ElementNode;
  assertEquals(div.tagName, "div");
  assertEquals(div.children.length, 1);

  const span = div.children[0] as ElementNode;
  assertEquals(span.tagName, "span");
  assertEquals(span.children.length, 1);

  const text = span.children[0] as TextNode;
  assertEquals(text.content, "Text");
});

Deno.test("parse - custom component tag", () => {
  const ast = parse("<my-component></my-component>");

  const component = ast.children[0] as ElementNode;
  assertEquals(component.tagName, "my-component");
});

Deno.test("parse - complex template", () => {
  const html = `
<div class="container" [class.active]="isActive">
  <h1>{{title | uppercase}}</h1>
  <ul *if="items.length > 0">
    <li *for="let item of items">
      {{item.name}}
    </li>
  </ul>
  <button (click)="handleClick()">Click Me</button>
</div>`;

  const ast = parse(html);

  // Document should have one top-level element (div)
  // Note: there's whitespace text before and after
  const elements = ast.children.filter((c) => c.type === "element");
  assertEquals(elements.length, 1);

  const div = elements[0] as ElementNode;
  assertEquals(div.tagName, "div");
  assertEquals(div.attributes.length, 1); // class
  assertEquals(div.bindings.length, 1); // [class.active]

  // Find the h1
  const h1 = div.children.find((c) => c.type === "element" && (c as ElementNode).tagName === "h1") as ElementNode;
  assertExists(h1);

  // Find the ul with *if
  const ul = div.children.find((c) => c.type === "element" && (c as ElementNode).tagName === "ul") as ElementNode;
  assertExists(ul);
  assertEquals(ul.directives.length, 1);
  assertEquals(ul.directives[0].name, "if");

  // Find the button with (click)
  const button = div.children.find((c) => c.type === "element" && (c as ElementNode).tagName === "button") as ElementNode;
  assertExists(button);
  assertEquals(button.events.length, 1);
  assertEquals(button.events[0].name, "click");
});

Deno.test("parse - void elements (no closing tag)", () => {
  const ast = parse("<img><br><hr><input>");

  assertEquals(ast.children.length, 4);

  const tagNames = ast.children
    .filter((c) => c.type === "element")
    .map((c) => (c as ElementNode).tagName);

  assertEquals(tagNames, ["img", "br", "hr", "input"]);
});

Deno.test("parse - boolean attribute", () => {
  const ast = parse("<input disabled />");

  const input = ast.children[0] as ElementNode;
  const disabledAttr = input.attributes.find((a) => a.name === "disabled");

  assertExists(disabledAttr);
  assertEquals(disabledAttr.value, null);
});

Deno.test("parse - mixed attributes and bindings", () => {
  const ast = parse('<input type="text" [value]="name" (input)="onInput($event)" [(ngModel)]="model" />');

  const input = ast.children[0] as ElementNode;

  // Standard attribute
  assertEquals(input.attributes.length, 1);
  assertEquals(input.attributes[0].name, "type");

  // Property binding
  assertEquals(input.bindings.length, 1);
  assertEquals(input.bindings[0].name, "value");

  // Event binding
  assertEquals(input.events.length, 1);
  assertEquals(input.events[0].name, "input");

  // Two-way binding
  assertEquals(input.twoWayBindings.length, 1);
  assertEquals(input.twoWayBindings[0].name, "ngModel");
});

Deno.test("parse - source location tracking", () => {
  const ast = parse("<div></div>");

  const div = ast.children[0] as ElementNode;

  assertEquals(div.location.line, 1);
  assertEquals(div.location.column, 1);
  assertEquals(div.location.start, 0);
});

Deno.test("parse - outlet component", () => {
  const ast = parse("<outlet />");

  const outlet = ast.children[0] as ElementNode;
  assertEquals(outlet.tagName, "outlet");
  assertEquals(outlet.selfClosing, true);
});
