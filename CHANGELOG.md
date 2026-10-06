# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-10-06

### Added
- Initial release of **EnvGuard** zero-dependency schema validation for Node.js / TypeScript.
- Type-safe validators: `string`, `number`, `port`, `boolean`, `enum`, `url`, `email`, and `custom`.
- Field modifiers: `.optional()`, `.default()`, `.secret()`, and `.describe()`.
- Full TypeScript static type inference (`InferEnv<typeof schema>`).
- Comprehensive error formatting grouping all missing/invalid variables without exposing secrets.
- Dual CJS and ESM bundle outputs with complete declaration files.
