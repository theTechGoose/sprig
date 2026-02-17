/**
 * Transpiler configuration
 */

export interface TranspilerConfig {
  /** Enable development mode features */
  devMode: boolean;

  /** Path for dev routes (relative to routes/) */
  devRoutesPath: string;

  /** URL prefix for dev routes */
  devRoutePrefix: string;

  /** Generate dev routes for domain components */
  generateDevRoutes: boolean;
}

/**
 * Default transpiler configuration
 */
export const defaultConfig: TranspilerConfig = {
  devMode: false,
  devRoutesPath: "dev",
  devRoutePrefix: "/dev",
  generateDevRoutes: false,
};

/**
 * Development mode configuration
 */
export const devConfig: TranspilerConfig = {
  devMode: true,
  devRoutesPath: "dev",
  devRoutePrefix: "/dev",
  generateDevRoutes: true,
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(
  userConfig: Partial<TranspilerConfig>,
): TranspilerConfig {
  return {
    ...defaultConfig,
    ...userConfig,
  };
}

/**
 * Check if the transpiler is running in dev mode
 */
export function isDevMode(config: TranspilerConfig): boolean {
  return config.devMode && config.generateDevRoutes;
}
