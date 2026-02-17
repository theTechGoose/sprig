/**
 * Tests for the tokenizer
 */

import { assertEquals, assertArrayIncludes } from "jsr:@std/assert";
import { tokenize, TokenType } from "../parser/tokenizer/mod.ts";

Deno.test("tokenize - simple element", () => {
  const tokens = tokenize("<div></div>");

  const types = tokens.map((t) => t.type);
  assertEquals(types, [
    TokenType.TAG_OPEN,
    TokenType.TAG_NAME,
    TokenType.TAG_CLOSE,
    TokenType.TAG_END_OPEN,
    TokenType.TAG_NAME,
    TokenType.TAG_CLOSE,
    TokenType.EOF,
  ]);

  assertEquals(tokens[1].value, "div");
  assertEquals(tokens[4].value, "div");
});

Deno.test("tokenize - self-closing element", () => {
  const tokens = tokenize("<input />");

  const types = tokens.map((t) => t.type);
  assertEquals(types, [
    TokenType.TAG_OPEN,
    TokenType.TAG_NAME,
    TokenType.TAG_SELF_CLOSE,
    TokenType.EOF,
  ]);

  assertEquals(tokens[1].value, "input");
});

Deno.test("tokenize - element with attributes", () => {
  const tokens = tokenize('<div class="container" id="main"></div>');

  const types = tokens.map((t) => t.type);
  assertEquals(types, [
    TokenType.TAG_OPEN,
    TokenType.TAG_NAME,
    TokenType.ATTR_NAME,
    TokenType.ATTR_EQUALS,
    TokenType.ATTR_VALUE,
    TokenType.ATTR_NAME,
    TokenType.ATTR_EQUALS,
    TokenType.ATTR_VALUE,
    TokenType.TAG_CLOSE,
    TokenType.TAG_END_OPEN,
    TokenType.TAG_NAME,
    TokenType.TAG_CLOSE,
    TokenType.EOF,
  ]);

  assertEquals(tokens[2].value, "class");
  assertEquals(tokens[4].value, "container");
  assertEquals(tokens[5].value, "id");
  assertEquals(tokens[7].value, "main");
});

Deno.test("tokenize - property binding [prop]", () => {
  const tokens = tokenize('<input [value]="name" />');

  const types = tokens.map((t) => t.type);
  assertEquals(types, [
    TokenType.TAG_OPEN,
    TokenType.TAG_NAME,
    TokenType.ATTR_NAME,
    TokenType.ATTR_EQUALS,
    TokenType.ATTR_VALUE,
    TokenType.TAG_SELF_CLOSE,
    TokenType.EOF,
  ]);

  assertEquals(tokens[2].value, "[value]");
  assertEquals(tokens[4].value, "name");
});

Deno.test("tokenize - event binding (event)", () => {
  const tokens = tokenize('<button (click)="handleClick()">Click</button>');

  const attrNameToken = tokens.find((t) => t.value === "(click)");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);

  const handlerToken = tokens.find((t) => t.value === "handleClick()");
  assertEquals(handlerToken?.type, TokenType.ATTR_VALUE);
});

Deno.test("tokenize - two-way binding [(prop)]", () => {
  const tokens = tokenize('<input [(value)]="name" />');

  const attrNameToken = tokens.find((t) => t.value === "[(value)]");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);

  const valueToken = tokens.find((t) => t.value === "name");
  assertEquals(valueToken?.type, TokenType.ATTR_VALUE);
});

Deno.test("tokenize - structural directive *if", () => {
  const tokens = tokenize('<div *if="showIt"></div>');

  const attrNameToken = tokens.find((t) => t.value === "*if");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);

  const valueToken = tokens.find((t) => t.value === "showIt");
  assertEquals(valueToken?.type, TokenType.ATTR_VALUE);
});

Deno.test("tokenize - structural directive *for", () => {
  const tokens = tokenize('<div *for="let item of items"></div>');

  const attrNameToken = tokens.find((t) => t.value === "*for");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);

  const valueToken = tokens.find((t) => t.value === "let item of items");
  assertEquals(valueToken?.type, TokenType.ATTR_VALUE);
});

Deno.test("tokenize - class binding [class.name]", () => {
  const tokens = tokenize('<div [class.active]="isActive"></div>');

  const attrNameToken = tokens.find((t) => t.value === "[class.active]");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);
});

Deno.test("tokenize - style binding [style.color]", () => {
  const tokens = tokenize('<div [style.color]="textColor"></div>');

  const attrNameToken = tokens.find((t) => t.value === "[style.color]");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);
});

Deno.test("tokenize - text content", () => {
  const tokens = tokenize("<p>Hello World</p>");

  const textToken = tokens.find((t) => t.type === TokenType.TEXT);
  assertEquals(textToken?.value, "Hello World");
});

Deno.test("tokenize - interpolation", () => {
  const tokens = tokenize("<p>Hello {{name}}</p>");

  const textToken = tokens.find((t) => t.type === TokenType.TEXT);
  assertEquals(textToken?.value, "Hello ");

  const interpolationToken = tokens.find((t) => t.type === TokenType.INTERPOLATION);
  assertEquals(interpolationToken?.value, "name");
});

Deno.test("tokenize - interpolation with pipe", () => {
  const tokens = tokenize("<p>{{name | uppercase}}</p>");

  const interpolationToken = tokens.find((t) => t.type === TokenType.INTERPOLATION);
  assertEquals(interpolationToken?.value, "name | uppercase");
});

Deno.test("tokenize - nested elements", () => {
  const tokens = tokenize("<div><span>Text</span></div>");

  const tagNames = tokens
    .filter((t) => t.type === TokenType.TAG_NAME)
    .map((t) => t.value);

  assertEquals(tagNames, ["div", "span", "span", "div"]);
});

Deno.test("tokenize - custom component tag", () => {
  const tokens = tokenize("<my-component></my-component>");

  const tagNames = tokens
    .filter((t) => t.type === TokenType.TAG_NAME)
    .map((t) => t.value);

  assertEquals(tagNames, ["my-component", "my-component"]);
});

Deno.test("tokenize - comment", () => {
  const tokens = tokenize("<!-- This is a comment -->");

  const commentToken = tokens.find((t) => t.type === TokenType.COMMENT);
  assertEquals(commentToken?.value, "This is a comment");
});

Deno.test("tokenize - boolean attribute", () => {
  const tokens = tokenize("<input disabled />");

  const attrNameToken = tokens.find((t) => t.value === "disabled");
  assertEquals(attrNameToken?.type, TokenType.ATTR_NAME);

  // No ATTR_EQUALS or ATTR_VALUE after it
  const attrIndex = tokens.findIndex((t) => t.value === "disabled");
  assertEquals(tokens[attrIndex + 1].type, TokenType.TAG_SELF_CLOSE);
});

Deno.test("tokenize - source location tracking", () => {
  const tokens = tokenize("<div>test</div>");

  // Check first token location
  assertEquals(tokens[0].location.line, 1);
  assertEquals(tokens[0].location.column, 1);
  assertEquals(tokens[0].location.start, 0);
});

Deno.test("tokenize - multiline content", () => {
  const html = `<div>
  <span>Hello</span>
</div>`;

  const tokens = tokenize(html);

  // Should parse without errors
  assertEquals(tokens[tokens.length - 1].type, TokenType.EOF);

  // Check we got all the tag names
  const tagNames = tokens
    .filter((t) => t.type === TokenType.TAG_NAME)
    .map((t) => t.value);
  assertEquals(tagNames, ["div", "span", "span", "div"]);
});

Deno.test("tokenize - single quotes", () => {
  const tokens = tokenize("<div class='container'></div>");

  const valueToken = tokens.find((t) => t.value === "container");
  assertEquals(valueToken?.type, TokenType.ATTR_VALUE);
});

Deno.test("tokenize - complex template", () => {
  const html = `
<div class="container" [class.active]="isActive">
  <h1>{{title | uppercase}}</h1>
  <ul *if="items.length > 0">
    <li *for="let item of items; index as i">
      {{item.name}}
    </li>
  </ul>
  <button (click)="handleClick($event)">Click Me</button>
</div>`;

  const tokens = tokenize(html);

  // Should parse without errors
  assertEquals(tokens[tokens.length - 1].type, TokenType.EOF);

  // Check we found the key attributes
  const attrNames = tokens
    .filter((t) => t.type === TokenType.ATTR_NAME)
    .map((t) => t.value);

  assertArrayIncludes(attrNames, [
    "class",
    "[class.active]",
    "*if",
    "*for",
    "(click)",
  ]);
});
