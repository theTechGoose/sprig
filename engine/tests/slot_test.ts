/**
 * Tests for slot transformation and auto-island detection
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx, requiresIsland, analyzeSlots } from "../transformer/mod.ts";

// Slot analysis tests

Deno.test("analyzeSlots - no slots", () => {
  const info = analyzeSlots("<div>Hello</div>");

  assertEquals(info.hasSlot, false);
  assertEquals(info.hasDefaultSlot, false);
  assertEquals(info.namedSlots, []);
});

Deno.test("analyzeSlots - default slot", () => {
  const info = analyzeSlots("<div><slot /></div>");

  assertEquals(info.hasSlot, true);
  assertEquals(info.hasDefaultSlot, true);
  assertEquals(info.namedSlots, []);
});

Deno.test("analyzeSlots - named slot", () => {
  const info = analyzeSlots('<div><slot name="header" /></div>');

  assertEquals(info.hasSlot, true);
  assertEquals(info.hasDefaultSlot, false);
  assertEquals(info.namedSlots, ["header"]);
});

Deno.test("analyzeSlots - multiple named slots", () => {
  const info = analyzeSlots('<div><slot name="header" /><slot name="footer" /></div>');

  assertEquals(info.hasSlot, true);
  assertEquals(info.hasDefaultSlot, false);
  assertEquals(info.namedSlots, ["header", "footer"]);
});

Deno.test("analyzeSlots - mixed slots", () => {
  const info = analyzeSlots('<div><slot name="header" /><slot /><slot name="footer" /></div>');

  assertEquals(info.hasSlot, true);
  assertEquals(info.hasDefaultSlot, true);
  assertEquals(info.namedSlots, ["header", "footer"]);
});

// Slot transformation in component context

Deno.test("slot in component context becomes children", () => {
  const result = htmlToJsx("<div><slot /></div>", [], undefined, "component");

  assertEquals(result.jsx.includes("{children}"), true);
  assertEquals(result.slotInfo?.hasDefaultSlot, true);
});

Deno.test("named slot in component context becomes prop", () => {
  const result = htmlToJsx('<div><slot name="header" /></div>', [], undefined, "component");

  assertEquals(result.jsx.includes("{header}"), true);
  assertEquals(result.slotInfo?.namedSlots.includes("header"), true);
});

// Slot transformation in layout context

Deno.test("slot in layout context becomes Component", () => {
  const result = htmlToJsx("<div><slot /></div>", [], undefined, "layout");

  assertEquals(result.jsx.includes("<Component />"), true);
  assertEquals(result.hasSlot, true);
});

// Legacy outlet support

Deno.test("outlet still works (legacy support)", () => {
  const result = htmlToJsx("<div><outlet /></div>", [], undefined, "layout");

  assertEquals(result.jsx.includes("<Component />"), true);
  assertEquals(result.hasOutlet, true);
});

// Auto-island detection tests

Deno.test("requiresIsland - false for interpolation only", () => {
  assertEquals(requiresIsland("<p>{{name}}</p>"), false);
});

Deno.test("requiresIsland - false for property binding only", () => {
  assertEquals(requiresIsland('<input [value]="name" />'), false);
});

Deno.test("requiresIsland - true for event binding", () => {
  assertEquals(requiresIsland('<button (click)="onClick()">Click</button>'), true);
});

Deno.test("requiresIsland - true for two-way binding", () => {
  assertEquals(requiresIsland('<input [(value)]="name" />'), true);
});

Deno.test("requiresIsland - false for mixed interpolation and property", () => {
  assertEquals(requiresIsland('<p [title]="tooltip">{{name}}</p>'), false);
});

Deno.test("requiresIsland - true for mixed with event", () => {
  assertEquals(requiresIsland('<button (click)="submit()">{{label}}</button>'), true);
});
