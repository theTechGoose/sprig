/**
 * Benchmark for transpiler performance
 */

import { htmlToJsx } from "../transformer/html-to-jsx.ts";

// Simple template
const simpleTemplate = `<div>Hello {{name}}</div>`;

// Medium template with bindings
const mediumTemplate = `
<div class="container">
  <h1>{{title | uppercase}}</h1>
  <p [class.highlight]="isHighlighted">{{description}}</p>
  <button [disabled]="isLoading" (click)="handleClick()">Submit</button>
</div>
`;

// Complex template with directives
const complexTemplate = `
<div class="app">
  <header *if="showHeader">
    <h1>{{title | uppercase}}</h1>
    <nav>
      <a *for="let link of links; trackBy: link.id"
         [class.active]="link.active"
         [attr.href]="link.url">
        {{link.label}}
      </a>
    </nav>
  </header>
  <main>
    <section *for="let section of sections; index as i">
      <h2>{{i + 1}}. {{section.title | titlecase}}</h2>
      <p>{{section.content | slice:0:200}}...</p>
      <ul *if="section.items.length > 0">
        <li *for="let item of section.items; trackBy: item.id"
            [class.completed]="item.done"
            [style.color]="item.color">
          {{item.name}}
          <span *if="item.badge">[{{item.badge | uppercase}}]</span>
        </li>
      </ul>
    </section>
  </main>
  <footer>
    <p>{{copyright | default:'© 2024'}}</p>
  </footer>
</div>
`;

// Very complex template (realistic full page)
const veryComplexTemplate = `
<div class="dashboard">
  <aside *if="showSidebar" [class.collapsed]="sidebarCollapsed" [style.width]="sidebarWidth + 'px'">
    <div class="logo">
      <img [attr.src]="logoUrl" [attr.alt]="appName" />
    </div>
    <nav>
      <ul>
        <li *for="let item of menuItems; trackBy: item.id">
          <a [attr.href]="item.path"
             [class.active]="currentPath === item.path"
             [class.has-children]="item.children?.length > 0"
             (click)="handleNavClick(item)">
            <span class="icon">{{item.icon}}</span>
            <span class="label">{{item.label}}</span>
            <span *if="item.badge" class="badge">{{item.badge}}</span>
          </a>
          <ul *if="item.children?.length > 0 && item.expanded">
            <li *for="let child of item.children; trackBy: child.id">
              <a [attr.href]="child.path" [class.active]="currentPath === child.path">
                {{child.label}}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </aside>
  <main [class.expanded]="sidebarCollapsed">
    <header class="top-bar">
      <button (click)="toggleSidebar()" [attr.aria-label]="sidebarCollapsed ? 'Expand' : 'Collapse'">
        <span class="hamburger"></span>
      </button>
      <div class="search">
        <input type="text" [(value)]="searchQuery" placeholder="Search..." />
        <button (click)="search()">Search</button>
      </div>
      <div class="user-menu">
        <img [attr.src]="user.avatar" [attr.alt]="user.name" class="avatar" />
        <span>{{user.name}}</span>
        <div *if="userMenuOpen" class="dropdown">
          <a (click)="goToProfile()">Profile</a>
          <a (click)="goToSettings()">Settings</a>
          <a (click)="logout()">Logout</a>
        </div>
      </div>
    </header>
    <div class="content">
      <div *if="loading" class="loading-spinner">Loading...</div>
      <div *if="error" [class.error]="true">{{error | uppercase}}</div>
      <div *if="!loading && !error">
        <h1>{{pageTitle | titlecase}}</h1>
        <div class="stats-grid">
          <div *for="let stat of stats; trackBy: stat.id"
               class="stat-card"
               [style.borderColor]="stat.color">
            <h3>{{stat.label}}</h3>
            <p class="value">{{stat.value | number}}</p>
            <p class="change" [class.positive]="stat.change > 0" [class.negative]="stat.change < 0">
              {{stat.change | percent}}
            </p>
          </div>
        </div>
        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th *for="let col of columns; trackBy: col.key"
                    [class.sortable]="col.sortable"
                    [class.sorted]="sortKey === col.key"
                    (click)="col.sortable && sortBy(col.key)">
                  {{col.label}}
                  <span *if="sortKey === col.key">{{sortDir === 'asc' ? '↑' : '↓'}}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *for="let row of rows; index as i; trackBy: row.id"
                  [class.even]="i % 2 === 0"
                  [class.selected]="selectedIds.includes(row.id)"
                  (click)="selectRow(row)">
                <td *for="let col of columns; trackBy: col.key">
                  {{row[col.key] | default:'-'}}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pagination">
            <button [disabled]="page === 1" (click)="prevPage()">Previous</button>
            <span>Page {{page}} of {{totalPages}}</span>
            <button [disabled]="page === totalPages" (click)="nextPage()">Next</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
`;

function benchmark(name: string, template: string, iterations: number = 1000): void {
  // Warmup
  for (let i = 0; i < 10; i++) {
    htmlToJsx(template, []);
  }

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    htmlToJsx(template, []);
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const avgUs = avgMs * 1000;

  console.log(`${name}:`);
  console.log(`  Total: ${totalMs.toFixed(2)}ms for ${iterations} iterations`);
  console.log(`  Average: ${avgMs.toFixed(4)}ms (${avgUs.toFixed(2)}μs) per transform`);
  console.log(`  Throughput: ${(1000 / avgMs).toFixed(0)} transforms/sec`);
  console.log(`  Template size: ${template.length} chars`);
  console.log();
}

console.log("=== Sprig Transpiler Benchmark ===\n");

benchmark("Simple template", simpleTemplate, 10000);
benchmark("Medium template (bindings)", mediumTemplate, 5000);
benchmark("Complex template (directives)", complexTemplate, 2000);
benchmark("Very complex template (full page)", veryComplexTemplate, 1000);

// Single run timing for very complex
console.log("=== Single Transform Timing ===\n");

const singleStart = performance.now();
const result = htmlToJsx(veryComplexTemplate, []);
const singleEnd = performance.now();

console.log(`Very complex template single transform: ${(singleEnd - singleStart).toFixed(4)}ms`);
console.log(`Output JSX size: ${result.jsx.length} chars`);
