/**
 * Integration tests for full template transformations
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";

// Helper to transform HTML to JSX and extract just the JSX string
function transform(html: string): string {
  const result = htmlToJsx(html, []);
  return result.jsx;
}

// =============================================================================
// Complete Template Transformation Tests
// =============================================================================

Deno.test("complete form with bindings and directives", () => {
  const input = `
<form (submit)="handleSubmit()">
  <input type="text" [(value)]="username" [disabled]="isLoading" placeholder="Username" />
  <input type="password" [(value)]="password" [disabled]="isLoading" />
  <button type="submit" [disabled]="isLoading" [class.loading]="isLoading">
    {{isLoading ? 'Submitting...' : 'Submit'}}
  </button>
  <p *if="error" [class.error]="true">{{error | uppercase}}</p>
</form>
  `.trim();

  const result = transform(input);

  // Verify key transformations are present
  assertEquals(result.includes('onSubmit={() => handleSubmit()}'), true);
  assertEquals(result.includes('value={username}'), true);
  assertEquals(result.includes('onInput={(e) => username.value = e.target.value}'), true);
  assertEquals(result.includes('disabled={isLoading}'), true);
  assertEquals(result.includes('{isLoading ? \'Submitting...\' : \'Submit\'}'), true);
  assertEquals(result.includes('{error && <p'), true);
  assertEquals(result.includes('{error.toUpperCase()}'), true);
});

Deno.test("list rendering with complex items", () => {
  const input = `
<ul>
  <li *for="let user of users; trackBy: user.id" [class.admin]="user.isAdmin">
    <span>{{user.name | titlecase}}</span>
    <span [style.color]="user.isAdmin ? 'red' : 'black'">{{user.role}}</span>
    <button (click)="deleteUser(user.id)" [disabled]="!canDelete">Delete</button>
  </li>
</ul>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes('users.map((user)'), true);
  assertEquals(result.includes('key={user.id}'), true);
  assertEquals(result.includes('toTitleCase(user.name)'), true);
  assertEquals(result.includes('style={{color: user.isAdmin ? \'red\' : \'black\'}}'), true);
  assertEquals(result.includes('onClick={() => deleteUser(user.id)}'), true);
  assertEquals(result.includes('disabled={!canDelete}'), true);
});

Deno.test("conditional rendering with multiple branches", () => {
  const input = `
<div>
  <div *if="status === 'loading'">Loading...</div>
  <div *if="status === 'error'" [class.error]="true">{{errorMessage}}</div>
  <div *if="status === 'success'">
    <h1>{{data.title | uppercase}}</h1>
    <p>{{data.description}}</p>
  </div>
</div>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes("{status === 'loading' && <div>Loading...</div>}"), true);
  assertEquals(result.includes("{status === 'error' && <div"), true);
  assertEquals(result.includes("{status === 'success' && <div>"), true);
  assertEquals(result.includes("{data.title.toUpperCase()}"), true);
});

Deno.test("nested directives and bindings", () => {
  const input = `
<div *if="showCategories">
  <section *for="let category of categories; trackBy: category.id">
    <h2>{{category.name}}</h2>
    <ul>
      <li *for="let item of category.items; index as i; trackBy: item.id"
          [class.selected]="item.id === selectedId"
          [style.backgroundColor]="i % 2 === 0 ? '#f0f0f0' : '#fff'">
        {{i + 1}}. {{item.name | titlecase}}
        <span *if="item.badge">[{{item.badge | uppercase}}]</span>
      </li>
    </ul>
  </section>
</div>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes('{showCategories && <div>'), true);
  assertEquals(result.includes('categories.map((category)'), true);
  assertEquals(result.includes('category.items.map((item, i: number)'), true);
  assertEquals(result.includes('key={item.id}'), true);
  assertEquals(result.includes('className={(item.id === selectedId ? "selected" : "")}'), true);
  assertEquals(result.includes("style={{backgroundColor: i % 2 === 0 ? '#f0f0f0' : '#fff'}}"), true);
  assertEquals(result.includes('{item.badge && <span>'), true);
});

Deno.test("style and class bindings combined", () => {
  const input = `
<div
  class="card"
  [class.active]="isActive"
  [class.highlighted]="isHighlighted"
  [style.width]="width + 'px'"
  [style.height]="height + 'px'"
  [style.opacity]="isVisible ? 1 : 0">
  Content
</div>
  `.trim();

  const result = transform(input);

  // Should merge static class with dynamic classes
  assertEquals(result.includes('className={"card"'), true);
  assertEquals(result.includes('isActive ? " active" : ""'), true);
  assertEquals(result.includes('isHighlighted ? " highlighted" : ""'), true);
  // Should merge all style bindings
  assertEquals(result.includes("style={{width: width + 'px', height: height + 'px', opacity: isVisible ? 1 : 0}}"), true);
});

Deno.test("pipes in various contexts", () => {
  const input = `
<div>
  <h1>{{title | uppercase}}</h1>
  <p>{{description | slice:0:100}}...</p>
  <span>Price: {{price | currency:'USD'}}</span>
  <span>Date: {{createdAt | date:'short'}}</span>
  <pre>{{config | json}}</pre>
  <p>{{author | default:'Anonymous'}}</p>
</div>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes('{title.toUpperCase()}'), true);
  assertEquals(result.includes('{description.slice(0, 100)}'), true);
  assertEquals(result.includes("{formatCurrency(price, 'USD')}"), true);
  assertEquals(result.includes("{formatDate(createdAt, 'short')}"), true);
  assertEquals(result.includes('{JSON.stringify(config)}'), true);
  assertEquals(result.includes("{(author ?? 'Anonymous')}"), true);
});

Deno.test("two-way binding with validation", () => {
  const input = `
<form>
  <div>
    <label>Email</label>
    <input
      type="email"
      [(value)]="email"
      [class.invalid]="!isEmailValid"
      [attr.aria-invalid]="!isEmailValid" />
    <span *if="!isEmailValid" [class.error]="true">Invalid email</span>
  </div>
  <div>
    <label>Password</label>
    <input
      type="password"
      [(value)]="password"
      [class.invalid]="!isPasswordValid" />
    <span *if="!isPasswordValid">{{passwordError}}</span>
  </div>
</form>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes('value={email}'), true);
  assertEquals(result.includes('onInput={(e) => email.value = e.target.value}'), true);
  assertEquals(result.includes('className={(!isEmailValid ? "invalid" : "")}'), true);
  assertEquals(result.includes('aria-invalid={!isEmailValid}'), true);
  assertEquals(result.includes('{!isEmailValid && <span'), true);
  assertEquals(result.includes('value={password}'), true);
});

Deno.test("attribute bindings for accessibility", () => {
  const input = `
<button
  [attr.aria-label]="buttonLabel"
  [attr.aria-disabled]="isDisabled"
  [attr.aria-expanded]="isExpanded"
  [attr.data-testid]="testId"
  [disabled]="isDisabled"
  (click)="handleClick()">
  {{buttonText}}
</button>
  `.trim();

  const result = transform(input);

  assertEquals(result.includes('aria-label={buttonLabel}'), true);
  assertEquals(result.includes('aria-disabled={isDisabled}'), true);
  assertEquals(result.includes('aria-expanded={isExpanded}'), true);
  assertEquals(result.includes('data-testid={testId}'), true);
  assertEquals(result.includes('disabled={isDisabled}'), true);
  assertEquals(result.includes('onClick={() => handleClick()}'), true);
});

Deno.test("chained pipes", () => {
  const input = `<p>{{text | uppercase | slice:0:20}}</p>`;
  const result = transform(input);
  assertEquals(result, `<p>{text.toUpperCase().slice(0, 20)}</p>`);
});

Deno.test("empty template", () => {
  const result = transform("");
  assertEquals(result, "");
});

Deno.test("text only template", () => {
  const result = transform("Hello World");
  assertEquals(result, "Hello World");
});

Deno.test("interpolation only template", () => {
  const result = transform("{{message}}");
  assertEquals(result, "{message}");
});
