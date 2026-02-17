/**
 * Main transformer module - exports all transformer functionality
 */

export { htmlToJsx, type JsxResult } from "./html-to-jsx.ts";
export {
  analyzeSlots,
  transformSlot,
  hasSlot,
  type SlotContext,
  type SlotInfo,
} from "./slot.ts";
// Legacy outlet support (deprecated, use slot instead)
export { hasOutlet, replaceOutletWithComponent } from "./outlet.ts";
export { resolveTag, collectCustomTags, type TagImport } from "./tags.ts";
export {
  transformInterpolation,
  transformEventBindings,
  hasBindings,
  hasInteractiveBindings,
  requiresIsland,
  extractInterpolatedVariables,
  extractEventHandlers,
} from "./bindings.ts";
export {
  transformPipeExpression,
  transformInterpolationWithPipes,
  getRequiredPipeHelpers,
} from "./pipes.ts";
export {
  parseForExpression,
  generateKeyExpression,
  transformIfDirective,
  transformForDirective,
  extractStructuralDirectives,
  type ForDirectiveInfo,
} from "./directives.ts";
export {
  DirectiveRegistry,
  transformCustomDirective,
  collectCustomDirectiveUsages,
  generateDirectiveImports,
  directiveRegistry,
  type RegisteredDirective,
} from "./custom-directives.ts";
export {
  PipeRegistry,
  collectCustomPipeUsages,
  generatePipeImports,
  pipeRegistry,
  type RegisteredPipe,
} from "./custom-pipes.ts";
