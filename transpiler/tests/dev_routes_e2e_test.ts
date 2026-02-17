/**
 * End-to-end test for dev routes generation
 * Creates a temp directory with Sprig structure and verifies output
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { join } from "@std/path";
import { writeDevRoutes } from "../generator/dev-routes.ts";
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

Deno.test("writeDevRoutes - creates index and component routes", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_dev_routes_test_" });

  try {
    const components = [
      createMockComponent("UserCard"),
      createMockComponent("Counter", true),
      createMockComponent("ProfileForm", false, [
        { name: "name", propertyName: "name", type: "string", required: false },
        { name: "email", propertyName: "email", type: "string", required: true },
      ]),
    ];

    await writeDevRoutes(components, testConfig, tempDir);

    // Verify index was created
    const indexPath = join(tempDir, "routes/dev/index.tsx");
    const indexContent = await Deno.readTextFile(indexPath);

    assertStringIncludes(indexContent, "Component Development");
    assertStringIncludes(indexContent, "UserCard");
    assertStringIncludes(indexContent, "Counter");
    assertStringIncludes(indexContent, "ProfileForm");
    assertStringIncludes(indexContent, "/dev/user-card");
    assertStringIncludes(indexContent, "/dev/counter");
    assertStringIncludes(indexContent, "/dev/profile-form");

    // Verify individual routes were created
    const userCardPath = join(tempDir, "routes/dev/user-card/index.tsx");
    const userCardContent = await Deno.readTextFile(userCardPath);

    assertStringIncludes(userCardContent, "import UserCard from");
    assertStringIncludes(userCardContent, "function DevUserCard");
    assertStringIncludes(userCardContent, "@/components/UserCard.tsx");

    // Verify island gets correct import path
    const counterPath = join(tempDir, "routes/dev/counter/index.tsx");
    const counterContent = await Deno.readTextFile(counterPath);

    assertStringIncludes(counterContent, "@/islands/Counter.tsx");

    // Verify component with inputs has props
    const profilePath = join(tempDir, "routes/dev/profile-form/index.tsx");
    const profileContent = await Deno.readTextFile(profilePath);

    assertStringIncludes(profileContent, '"name":');
    assertStringIncludes(profileContent, '"email":');
    assertStringIncludes(profileContent, "Sample name");
    assertStringIncludes(profileContent, "Sample email");

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("writeDevRoutes - skips non-component types", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_dev_routes_test_" });

  try {
    const components: SprigComponent[] = [
      createMockComponent("UserCard"),
      {
        // Layout - should be skipped (relativePath starts with _)
        path: "/src/_app",
        relativePath: "_app",
        type: "component" as const,
        metadata: {
          className: "AppLayout",
          template: "./mod.html",
          island: false,
        },
        template: "<div><outlet /></div>",
        source: `@Component({ template: './mod.html' }) export class AppLayout {}`,
        originalFilename: "mod.ts",
        inputs: [],
      },
      {
        // Route - should be skipped
        path: "/src/routes/home",
        relativePath: "routes/home",
        type: "route",
        metadata: {
          className: "HomePage",
          template: "./mod.html",
          island: false,
        },
        template: "<h1>Home</h1>",
        source: `@Component({ template: './mod.html' }) export class HomePage {}`,
        originalFilename: "mod.ts",
        inputs: [],
      },
    ];

    await writeDevRoutes(components, testConfig, tempDir);

    // Only UserCard should have a dev route
    const indexPath = join(tempDir, "routes/dev/index.tsx");
    const indexContent = await Deno.readTextFile(indexPath);

    assertStringIncludes(indexContent, "UserCard");
    assertEquals(indexContent.includes("AppLayout"), false);
    assertEquals(indexContent.includes("HomePage"), false);

    // Verify only one component route exists
    const userCardPath = join(tempDir, "routes/dev/user-card/index.tsx");
    assertEquals(await fileExists(userCardPath), true);

    const layoutPath = join(tempDir, "routes/dev/app-layout/index.tsx");
    assertEquals(await fileExists(layoutPath), false);

    const routePath = join(tempDir, "routes/dev/home-page/index.tsx");
    assertEquals(await fileExists(routePath), false);

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("writeDevRoutes - handles empty components", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_dev_routes_test_" });

  try {
    await writeDevRoutes([], testConfig, tempDir);

    // No routes should be created
    const devDir = join(tempDir, "routes/dev");
    assertEquals(await fileExists(devDir), false);

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("writeDevRoutes - generated route is valid JSX", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_dev_routes_test_" });

  try {
    const components = [
      createMockComponent("TestComponent", true, [
        { name: "title", propertyName: "title", type: "string", required: false },
        { name: "count", propertyName: "count", type: "number", required: false },
        { name: "active", propertyName: "active", type: "boolean", required: false },
      ]),
    ];

    await writeDevRoutes(components, testConfig, tempDir);

    const routePath = join(tempDir, "routes/dev/test-component/index.tsx");
    const content = await Deno.readTextFile(routePath);

    // Verify structure
    assertStringIncludes(content, "import { define }");
    assertStringIncludes(content, "import TestComponent from");
    assertStringIncludes(content, "export default define.page");
    assertStringIncludes(content, "<TestComponent {...devProps} />");
    assertStringIncludes(content, "JSON.stringify(devProps, null, 2)");

    // Verify it has proper props
    assertStringIncludes(content, '"title": "Sample title"');
    assertStringIncludes(content, '"count": 42');
    assertStringIncludes(content, '"active": true');

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}
