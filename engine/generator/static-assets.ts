/**
 * Static asset copying utilities
 *
 * Handles copying static assets from source to dist folder.
 */

import { join, basename } from "@std/path";
import { exists, copy } from "@std/fs";

/**
 * Possible locations for static assets in a Sprig app
 */
const STATIC_FOLDER_CANDIDATES = [
  "src/static",
  "src/assets",
  "static",
  "assets",
];

/**
 * Find the static assets folder in the source directory.
 *
 * @param srcDir - Source directory (project root)
 * @returns Path to static folder, or null if not found
 */
export async function findStaticFolder(
  srcDir: string
): Promise<string | null> {
  for (const candidate of STATIC_FOLDER_CANDIDATES) {
    const candidatePath = join(srcDir, candidate);
    if (await exists(candidatePath)) {
      const stat = await Deno.stat(candidatePath);
      if (stat.isDirectory) {
        return candidatePath;
      }
    }
  }
  return null;
}

interface StaticAssetsOptions {
  /** Use symlinks instead of copying (faster for dev, won't work for deployment) */
  symlink?: boolean;
}

/**
 * Copy or symlink static assets from source to dist.
 *
 * Looks for static assets in: src/static, src/assets, static, assets
 * Outputs to: {outDir}/static/
 *
 * @param projectRoot - Source project root directory
 * @param outDir - Output directory (dist folder)
 * @param options - Options for copying behavior
 */
export async function copyStaticAssets(
  projectRoot: string,
  outDir: string,
  options: StaticAssetsOptions = {}
): Promise<void> {
  const staticFolder = await findStaticFolder(projectRoot);

  if (!staticFolder) {
    // No static folder found - this is fine, not an error
    return;
  }

  // Always output to {outDir}/static/ regardless of source folder name
  const destFolder = join(outDir, "static");
  const useSymlink = options.symlink ?? false;

  try {
    // Ensure the destination directory exists
    await Deno.mkdir(destFolder, { recursive: true });

    if (useSymlink) {
      await symlinkDirectoryContents(staticFolder, destFolder);
    } else {
      await copyDirectoryContents(staticFolder, destFolder);
    }
  } catch (error) {
    console.warn(
      `Warning: Failed to ${useSymlink ? 'symlink' : 'copy'} some static assets: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Recursively copy contents of a directory.
 *
 * @param src - Source directory
 * @param dest - Destination directory
 */
async function copyDirectoryContents(
  src: string,
  dest: string
): Promise<void> {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory) {
      await Deno.mkdir(destPath, { recursive: true });
      await copyDirectoryContents(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    } else if (entry.isSymlink) {
      // Copy symlinks as regular files to avoid issues
      const linkTarget = await Deno.readLink(srcPath);
      try {
        await Deno.copyFile(srcPath, destPath);
      } catch {
        // If symlink copy fails, try to read and write the content
        const content = await Deno.readFile(srcPath);
        await Deno.writeFile(destPath, content);
      }
    }
  }
}

/**
 * Recursively symlink contents of a directory.
 * Creates symlinks to source files for faster dev builds.
 * CSS files are copied (not symlinked) because they contain @import
 * directives that need to resolve from the dist folder.
 *
 * @param src - Source directory
 * @param dest - Destination directory
 */
async function symlinkDirectoryContents(
  src: string,
  dest: string
): Promise<void> {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory) {
      await Deno.mkdir(destPath, { recursive: true });
      await symlinkDirectoryContents(srcPath, destPath);
    } else if (entry.isFile) {
      // Remove existing file/symlink if present
      try {
        await Deno.remove(destPath);
      } catch {
        // Doesn't exist, that's fine
      }

      // CSS files must be copied (not symlinked) because @import directives
      // need to resolve modules from the dist folder's node_modules
      if (entry.name.endsWith('.css')) {
        await Deno.copyFile(srcPath, destPath);
      } else {
        await Deno.symlink(srcPath, destPath);
      }
    }
  }
}

/**
 * Get the list of files that would be copied from static folder.
 * Useful for debugging or displaying what will be copied.
 *
 * @param projectRoot - Source project root directory
 * @returns Array of relative file paths, or null if no static folder
 */
export async function listStaticAssets(
  projectRoot: string
): Promise<string[] | null> {
  const staticFolder = await findStaticFolder(projectRoot);

  if (!staticFolder) {
    return null;
  }

  const files: string[] = [];
  await collectFiles(staticFolder, staticFolder, files);
  return files;
}

/**
 * Recursively collect file paths.
 */
async function collectFiles(
  baseDir: string,
  currentDir: string,
  files: string[]
): Promise<void> {
  for await (const entry of Deno.readDir(currentDir)) {
    const fullPath = join(currentDir, entry.name);
    const relativePath = fullPath.slice(baseDir.length + 1);

    if (entry.isDirectory) {
      await collectFiles(baseDir, fullPath, files);
    } else {
      files.push(relativePath);
    }
  }
}
