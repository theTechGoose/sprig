/**
 * Slot transformation utilities
 *
 * <slot /> behavior depends on context:
 * - In layouts: renders route content (Fresh's <Component />)
 * - In components: renders children passed to the component
 *
 * Named slots: <slot name="header" /> renders the "header" prop
 */

export type SlotContext = "layout" | "component";

export interface SlotInfo {
  /** Whether template contains any slots */
  hasSlot: boolean;
  /** Named slots used (e.g., ["header", "footer"]) */
  namedSlots: string[];
  /** Whether default slot is used */
  hasDefaultSlot: boolean;
}

/**
 * Analyze template for slot usage
 * Handles both <slot> and Angular's <ng-content>
 */
export function analyzeSlots(html: string): SlotInfo {
  const hasSlotTag = /<slot[\s>\/]/i.test(html);
  const hasNgContent = /<ng-content[\s>\/]/i.test(html);
  const hasSlot = hasSlotTag || hasNgContent;
  const namedSlots: string[] = [];
  let hasDefaultSlot = false;

  if (!hasSlot) {
    return { hasSlot: false, namedSlots: [], hasDefaultSlot: false };
  }

  // Find all slot tags
  const slotPattern = /<slot([^>]*?)(?:\/>|>(?:<\/slot>)?)/gi;
  let match;

  while ((match = slotPattern.exec(html)) !== null) {
    const attrs = match[1] || "";
    const nameMatch = attrs.match(/name=["']([^"']+)["']/);

    if (nameMatch) {
      namedSlots.push(nameMatch[1]);
    } else {
      hasDefaultSlot = true;
    }
  }

  // Find all ng-content tags
  // <ng-content select=".header"> -> named slot "header"
  // <ng-content> -> default slot
  const ngContentPattern = /<ng-content([^>]*?)(?:\/>|>(?:<\/ng-content>)?)/gi;

  while ((match = ngContentPattern.exec(html)) !== null) {
    const attrs = match[1] || "";
    const selectMatch = attrs.match(/select=["']([^"']+)["']/);

    if (selectMatch) {
      // Convert CSS selector to slot name (e.g., ".header" -> "header", "[slot=foo]" -> "foo")
      let slotName = selectMatch[1];
      if (slotName.startsWith(".")) {
        slotName = slotName.slice(1);
      } else if (slotName.includes("[slot=")) {
        const slotAttrMatch = slotName.match(/\[slot=["']?([^"'\]]+)/);
        if (slotAttrMatch) {
          slotName = slotAttrMatch[1];
        }
      }
      namedSlots.push(slotName);
    } else {
      hasDefaultSlot = true;
    }
  }

  return { hasSlot, namedSlots, hasDefaultSlot };
}

/**
 * Transform slot tag to appropriate JSX based on context
 */
export function transformSlot(
  slotAttrs: string,
  context: SlotContext,
): string {
  // Parse name attribute if present
  const nameMatch = slotAttrs.match(/name=["']([^"']+)["']/);
  const slotName = nameMatch ? nameMatch[1] : null;

  if (context === "layout") {
    // In layouts, slot renders the route content
    // Named slots don't make sense in layouts, but handle gracefully
    return "<Component />";
  }

  // In components, slot renders children or named prop
  if (slotName) {
    return `{${slotName}}`;
  }

  return "{children}";
}

/**
 * Check if HTML template contains a <slot /> tag
 * (Replaces old hasOutlet function)
 */
export function hasSlot(html: string): boolean {
  return /<slot[\s>\/]/i.test(html);
}
