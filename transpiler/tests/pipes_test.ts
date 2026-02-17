/**
 * Tests for pipe transformations in interpolations
 */

import { assertEquals } from "jsr:@std/assert";
import { transformPipeExpression } from "../transformer/pipes.ts";

// =============================================================================
// Built-in Pipe Tests
// =============================================================================

Deno.test("uppercase pipe", () => {
  const result = transformPipeExpression("name | uppercase");
  assertEquals(result, "name.toUpperCase()");
});

Deno.test("lowercase pipe", () => {
  const result = transformPipeExpression("name | lowercase");
  assertEquals(result, "name.toLowerCase()");
});

Deno.test("titlecase pipe", () => {
  const result = transformPipeExpression("name | titlecase");
  assertEquals(result, "toTitleCase(name)");
});

Deno.test("json pipe", () => {
  const result = transformPipeExpression("data | json");
  assertEquals(result, "JSON.stringify(data)");
});

Deno.test("slice pipe with two args", () => {
  const result = transformPipeExpression("text | slice:0:10");
  assertEquals(result, "text.slice(0, 10)");
});

Deno.test("slice pipe with one arg", () => {
  const result = transformPipeExpression("arr | slice:5");
  assertEquals(result, "arr.slice(5)");
});

Deno.test("currency pipe without arg", () => {
  const result = transformPipeExpression("price | currency");
  assertEquals(result, "formatCurrency(price)");
});

Deno.test("currency pipe with currency code", () => {
  const result = transformPipeExpression("price | currency:'EUR'");
  assertEquals(result, "formatCurrency(price, 'EUR')");
});

Deno.test("currency pipe with USD", () => {
  const result = transformPipeExpression("amount | currency:'USD'");
  assertEquals(result, "formatCurrency(amount, 'USD')");
});

Deno.test("date pipe without format", () => {
  const result = transformPipeExpression("createdAt | date");
  assertEquals(result, "formatDate(createdAt)");
});

Deno.test("date pipe with format", () => {
  const result = transformPipeExpression("createdAt | date:'short'");
  assertEquals(result, "formatDate(createdAt, 'short')");
});

Deno.test("date pipe with long format", () => {
  const result = transformPipeExpression("timestamp | date:'long'");
  assertEquals(result, "formatDate(timestamp, 'long')");
});

Deno.test("number pipe without format", () => {
  const result = transformPipeExpression("value | number");
  assertEquals(result, "Number(value)");
});

Deno.test("number pipe with format", () => {
  const result = transformPipeExpression("value | number:'1.2-2'");
  assertEquals(result, "formatNumber(value, '1.2-2')");
});

Deno.test("percent pipe", () => {
  const result = transformPipeExpression("ratio | percent");
  assertEquals(result, "formatPercent(ratio)");
});

Deno.test("default pipe", () => {
  const result = transformPipeExpression("value | default:'N/A'");
  assertEquals(result, "(value ?? 'N/A')");
});

Deno.test("default pipe with number", () => {
  const result = transformPipeExpression("count | default:0");
  assertEquals(result, "(count ?? 0)");
});

// =============================================================================
// Pipe Chaining Tests
// =============================================================================

Deno.test("chained pipes: uppercase then slice", () => {
  const result = transformPipeExpression("text | uppercase | slice:0:5");
  assertEquals(result, "text.toUpperCase().slice(0, 5)");
});

Deno.test("chained pipes: lowercase then slice then uppercase", () => {
  const result = transformPipeExpression("text | lowercase | slice:0:10 | uppercase");
  assertEquals(result, "text.toLowerCase().slice(0, 10).toUpperCase()");
});

Deno.test("chained pipes: default then uppercase", () => {
  const result = transformPipeExpression("name | default:'unknown' | uppercase");
  assertEquals(result, "(name ?? 'unknown').toUpperCase()");
});

Deno.test("chained pipes with function calls", () => {
  const result = transformPipeExpression("value | currency:'USD' | default:'$0.00'");
  assertEquals(result, "(formatCurrency(value, 'USD') ?? '$0.00')");
});

// =============================================================================
// Expression with Pipe Tests
// =============================================================================

Deno.test("pipe with property access", () => {
  const result = transformPipeExpression("user.name | uppercase");
  assertEquals(result, "user.name.toUpperCase()");
});

Deno.test("pipe with method call result", () => {
  const result = transformPipeExpression("getName() | uppercase");
  assertEquals(result, "getName().toUpperCase()");
});

Deno.test("pipe with array access", () => {
  const result = transformPipeExpression("items[0] | json");
  assertEquals(result, "JSON.stringify(items[0])");
});

// =============================================================================
// Custom Pipe Tests
// =============================================================================

Deno.test("custom pipe without args", () => {
  const result = transformPipeExpression("text | reverse", { reverse: "reverse" });
  assertEquals(result, "reverse(text)");
});

Deno.test("custom pipe with args", () => {
  const result = transformPipeExpression("text | truncate:100:'...'", { truncate: "truncate" });
  assertEquals(result, "truncate(text, 100, '...')");
});

Deno.test("custom pipe chained with built-in", () => {
  const result = transformPipeExpression("text | reverse | uppercase", { reverse: "reverse" });
  assertEquals(result, "reverse(text).toUpperCase()");
});

// =============================================================================
// Edge Cases
// =============================================================================

Deno.test("no pipe - returns expression unchanged", () => {
  const result = transformPipeExpression("simpleValue");
  assertEquals(result, "simpleValue");
});

Deno.test("expression with no pipes and spaces", () => {
  const result = transformPipeExpression("  value  ");
  assertEquals(result, "value");
});

Deno.test("pipe with quoted string containing pipe character", () => {
  // The pipe inside quotes should not be treated as a pipe separator
  const result = transformPipeExpression("value | default:'a|b'");
  assertEquals(result, "(value ?? 'a|b')");
});

Deno.test("pipe with complex expression", () => {
  const result = transformPipeExpression("a + b | uppercase");
  assertEquals(result, "(a + b).toUpperCase()");
});
