/**
 * Outlet transformation utilities
 */

/**
 * Check if HTML template contains an <outlet /> tag
 */
export function hasOutlet(html: string): boolean {
  return /<outlet\s*\/?>/i.test(html);
}

/**
 * Replace <outlet /> with Fresh's <Component /> in JSX
 * This is handled in html-to-jsx.ts during transformation
 */
export function replaceOutletWithComponent(jsx: string): string {
  return jsx.replace(/<outlet\s*\/?>/gi, "<Component />");
}
