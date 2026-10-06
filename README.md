# 🛡️ EnvGuard

[![CI](https://github.com/juancastingo/envguard/actions/workflows/ci.yml/badge.svg)](https://github.com/juancastingo/envguard/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/envguard.svg)](https://www.npmjs.com/package/envguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](tsconfig.json)

**EnvGuard** is a zero-dependency TypeScript schema validator for environment variables that catches configuration bugs early with **beautiful startup diagnostics**, **full TypeScript type inference**, and **strict secret protection**.

---

## 📸 Startup Diagnostic Preview

When any environment variable is missing or malformed, EnvGuard collects **all errors at once** and outputs a clean, readable diagnostic report without leaking sensitive secrets:

```text
══════════════════════════════════════════════════════════
 🚨 EnvGuard: Invalid Environment Configuration
══════════════════════════════════════════════════════════
  ❌ PORT
     Error: Invalid number: received "invalid_port"
     Info:  Network port (1-65535)
  ❌ DATABASE_URL
     Error: Invalid URL format: "postgres://bad url"
  ❌ STRIPE_API_KEY [SECRET]
     Error: Missing required environment variable
     Info:  Stripe secret live key
══════════════════════════════════════════════════════════
```

---

## ✨ Why EnvGuard?

- **Zero Runtime Dependencies**: Ultra-lightweight; adds virtually zero bundle overhead.
- **Fail Fast & Report Everything**: Collects and formats all missing/invalid fields on boot rather than crashing one error at a time.
- **Secret Safe by Design**: Fields tagged with `.secret()` are explicitly masked in error logs and stack traces so production credentials never leak into CI/terminal output.
- **Full TypeScript Type Inference**: Infers full static types (`InferEnv<typeof envSchema>`) with no extra boilerplate.
- **Built-in Parsers & Types**: Numbers, booleans, enums, network ports, URLs, emails, and custom validators.
- **Dual CJS & ESM Support**: Works seamlessly in modern Node.js, Bun, and Next.js / Vite projects.

---

## 🚀 Installation

```bash
npm install envguard
# or
pnpm add envguard
# or
yarn add envguard
```

---

## 📖 Quick Start

```typescript
import { defineEnv, env, type InferEnv } from "envguard";

const schema = {
  NODE_ENV: env.enum(["development", "staging", "production"] as const).default("development"),
  PORT: env.port(3000),
  DEBUG: env.boolean().default(false),
  DATABASE_URL: env.url().describe("Primary PostgreSQL connection string"),
  STRIPE_SECRET_KEY: env.string().secret().describe("Payment gateway private key"),
  CACHE_TTL_MS: env.number({ min: 1000 }).default(60000),
  SENTRY_DSN: env.url().optional(),
};

// Validates process.env and throws formatted EnvValidationError if invalid
export const config = defineEnv(schema);

// Strongly typed:
// config.PORT is number
// config.NODE_ENV is "development" | "staging" | "production"
// config.DEBUG is boolean
// config.SENTRY_DSN is string | undefined
export type Config = InferEnv<typeof schema>;
```

---

## 🛠️ API Reference

### Built-in Validators

| Validator | Description | Example |
|---|---|---|
| `env.string(options?)` | String with optional `minLength`, `maxLength`, `pattern` | `env.string({ minLength: 8 })` |
| `env.number(options?)` | Parsed numeric value with optional `min`, `max`, `integer` | `env.number({ min: 10, max: 100 })` |
| `env.port(default?)` | Valid network port (1-65535) | `env.port(8080)` |
| `env.boolean()` | Parses `"true"`, `"false"`, `"1"`, `"0"` | `env.boolean().default(false)` |
| `env.enum(values)` | Restricts to literal allowed string choices | `env.enum(["dev", "prod"] as const)` |
| `env.url()` | Validates standard URI/URL format | `env.url()` |
| `env.email()` | Validates standard email address | `env.email()` |
| `env.custom(fn)` | Custom parser/validator | `env.custom((raw) => raw.split(","))` |

### Field Modifiers

- `.default(value)`: Supplies a fallback default value if the variable is omitted.
- `.optional()`: Allows variable to be omitted, inferring type `T | undefined`.
- `.secret()`: Marks the variable as confidential (masked as `[SECRET]` in logs).
- `.describe(text)`: Adds helpful context to startup failure reports.

---

## 🧪 Testing

```bash
npm test
npm run lint
npm run build
```

---

## 📄 License

MIT © [Juan Castiñeira](https://github.com/juancastingo)
