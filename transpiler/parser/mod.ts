/**
 * Main parser module - exports all parser functionality
 */

export { parseComponentDecorator, type ComponentMetadata } from "./component.ts";
export { parseHtml, parseAttributesFull, type HtmlElement, type DirectiveInfo, type BindingInfo } from "./html.ts";
export { scanSprigApp, type SprigComponent, type SprigService, type ScanResult } from "./scanner.ts";
export {
  parseClass,
  transformMethodBody,
  type ParsedClass,
  type ClassProperty,
  type ClassMethod,
  type ClassGetter,
  type InjectedDependency,
  type InputInfo,
} from "./class-parser.ts";
export {
  parseServiceDecorator,
  parseServiceClass,
  type ServiceMetadata,
  type ParsedService,
  type ServiceProperty,
  type ServiceMethod,
} from "./service.ts";
export {
  parseDirectiveDecorator,
  hasDirectiveDecorator,
  getDirectiveName,
  type DirectiveMetadata,
  type SprigDirective,
} from "./directive.ts";
export {
  parsePipeDecorator,
  hasPipeDecorator,
  generatePipeFunction,
  type PipeMetadata,
  type SprigPipe,
} from "./pipe.ts";
export {
  parseInputDecorators,
  hasInputDecorators,
  generatePropsInterface,
  generatePropsDestructuring,
  getSafeVarName,
  type InputMetadata,
  type InputOptions,
} from "./input.ts";
export {
  parseDevProps,
  generateDefaultProps,
  mergeDevProps,
  type DevProps,
} from "./dev-props.ts";
