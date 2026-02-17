/**
 * Main generator module - exports all generator functionality
 */

export { generateBoilerplate, writeBoilerplate, type BoilerplateFiles } from "./boilerplate.ts";
export { generateComponent, writeIslands, writeComponents, type GeneratedComponent } from "./components.ts";
export { writeBootstrapLayout } from "./layouts.ts";
export { generateRoute, writeRoutes, type GeneratedRoute } from "./routes.ts";
export { generateService, writeServices, writeServicesIndex, type GeneratedService } from "./services.ts";
export {
  generateDirective,
  writeDirectives,
  generateDirectivesIndex,
  writeDirectivesIndex,
  type GeneratedDirective,
} from "./directives.ts";
export {
  generatePipe,
  writePipes,
  generatePipesIndex,
  writePipesIndex,
  type GeneratedPipe,
} from "./pipes.ts";
export {
  generateDevRoute,
  generateDevIndex,
  writeDevRoutes,
  type GeneratedDevRoute,
} from "./dev-routes.ts";
export {
  compileComponentStyle,
  writeComponentStyles,
  generateStyleImport,
  type CompiledStyle,
} from "./styles.ts";
export {
  copyStaticAssets,
  findStaticFolder,
  listStaticAssets,
} from "./static-assets.ts";
