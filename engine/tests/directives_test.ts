/**
 * Tests for structural directives (*if, *for)
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";

// Helper to transform HTML to JSX and extract just the JSX string
function transform(html: string): string {
  const result = htmlToJsx(html, []);
  return result.jsx;
}

// =============================================================================
// *if Directive Tests
// =============================================================================

Deno.test("*if renders conditional element", () => {
  const input = `<div *if="isVisible">Hello</div>`;
  const result = transform(input);
  assertEquals(result, `{isVisible && <div>Hello</div>}`);
});

Deno.test("*if with self-closing tag", () => {
  const input = `<br *if="showBreak" />`;
  const result = transform(input);
  assertEquals(result, `{showBreak && <br />}`);
});

Deno.test("*if with complex condition", () => {
  const input = `<div *if="user && user.isAdmin">Admin Panel</div>`;
  const result = transform(input);
  assertEquals(result, `{user && user.isAdmin && <div>Admin Panel</div>}`);
});

Deno.test("*if with nested elements", () => {
  const input = `<div *if="isLoggedIn"><span>Welcome</span></div>`;
  const result = transform(input);
  assertEquals(result, `{isLoggedIn && <div><span>Welcome</span></div>}`);
});

Deno.test("*if with other attributes preserved", () => {
  const input = `<div *if="show" class="container" id="main">Content</div>`;
  const result = transform(input);
  assertEquals(result, `{show && <div className="container" id="main">Content</div>}`);
});

Deno.test("*if with *else renders ternary", () => {
  const input = `<div *if="loggedIn" *else="GuestView">Welcome</div>`;
  const result = transform(input);
  assertEquals(result, `{loggedIn ? <div>Welcome</div> : <GuestView />}`);
});

Deno.test("*if with *else and string template reference", () => {
  const input = `<p *if="hasData" *else="EmptyState">Data loaded</p>`;
  const result = transform(input);
  assertEquals(result, `{hasData ? <p>Data loaded</p> : <EmptyState />}`);
});

// =============================================================================
// *for Directive Tests
// =============================================================================

Deno.test("*for renders map with basic syntax", () => {
  const input = `<li *for="let item of items">{{item.name}}</li>`;
  const result = transform(input);
  assertEquals(result, `{items.map((item) => <li key={item}>{item.name}</li>)}`);
});

Deno.test("*for with index renders map with index parameter", () => {
  const input = `<li *for="let item of items; index as i">{{i}}: {{item}}</li>`;
  const result = transform(input);
  assertEquals(result, `{items.map((item, i: number) => <li key={i}>{i}: {item}</li>)}`);
});

Deno.test("*for with trackBy uses trackBy expression as key", () => {
  const input = `<li *for="let user of users; trackBy: user.id">{{user.name}}</li>`;
  const result = transform(input);
  assertEquals(result, `{users.map((user) => <li key={user.id}>{user.name}</li>)}`);
});

Deno.test("*for with index and trackBy", () => {
  const input = `<li *for="let user of users; index as idx; trackBy: user.id">{{idx}}: {{user.name}}</li>`;
  const result = transform(input);
  assertEquals(result, `{users.map((user, idx: number) => <li key={user.id}>{idx}: {user.name}</li>)}`);
});

Deno.test("*for with nested elements", () => {
  const input = `<div *for="let item of items"><span>{{item.title}}</span><p>{{item.desc}}</p></div>`;
  const result = transform(input);
  assertEquals(result, `{items.map((item) => <div key={item}><span>{item.title}</span><p>{item.desc}</p></div>)}`);
});

Deno.test("*for with other attributes preserved", () => {
  const input = `<div *for="let item of items" class="item-card">{{item}}</div>`;
  const result = transform(input);
  // Attribute order: className comes first (from static attributes), then key is appended
  assertEquals(result, `{items.map((item) => <div className="item-card" key={item}>{item}</div>)}`);
});

Deno.test("*for self-closing element", () => {
  const input = `<hr *for="let _ of dividers" />`;
  const result = transform(input);
  // Note: extra space before key is from removing *for attribute
  assertEquals(result, `{dividers.map((_) => <hr  key={_}/>)}`);
});

// =============================================================================
// Combined Directive Tests
// =============================================================================

Deno.test("*if and *for cannot be on same element - *if wraps *for", () => {
  // When both are present, *if should take precedence and wrap the *for
  const input = `<ul *if="hasItems"><li *for="let item of items">{{item}}</li></ul>`;
  const result = transform(input);
  assertEquals(result, `{hasItems && <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}`);
});

Deno.test("multiple elements with directives", () => {
  const input = `<div *if="showA">A</div><div *if="showB">B</div>`;
  const result = transform(input);
  // Multiple top-level elements should be wrapped in fragment
  assertEquals(result, `<>\n      {showA && <div>A</div>}\n      {showB && <div>B</div>}\n    </>`);
});
