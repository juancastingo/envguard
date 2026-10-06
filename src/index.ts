/**
 * envguard - Zero-dependency TypeScript schema validator for environment variables.
 * Type-safe, secret-protected, and provides clear startup diagnostic errors.
 */

export type ValidatorResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export interface FieldOptions<T> {
  default?: T;
  optional?: boolean;
  secret?: boolean;
  description?: string;
}

export class EnvField<T> {
  private _isOptional = false;
  private _defaultValue?: T;
  private _isSecret = false;
  private _description?: string;

  constructor(
    private readonly _validate: (raw: string | undefined) => ValidatorResult<T>,
    options?: FieldOptions<T>
  ) {
    if (options) {
      if (options.optional !== undefined) this._isOptional = options.optional;
      if (options.default !== undefined) this._defaultValue = options.default;
      if (options.secret !== undefined) this._isSecret = options.secret;
      if (options.description !== undefined) this._description = options.description;
    }
  }

  public optional(): EnvField<T | undefined> {
    const clone = new EnvField<T | undefined>((raw) => {
      if (raw === undefined || raw === "") {
        return { success: true, value: undefined };
      }
      return this._validate(raw);
    });
    clone._isOptional = true;
    clone._defaultValue = this._defaultValue;
    clone._isSecret = this._isSecret;
    clone._description = this._description;
    return clone;
  }

  public default(val: T): EnvField<T> {
    const clone = new EnvField<T>(this._validate);
    clone._isOptional = false;
    clone._defaultValue = val;
    clone._isSecret = this._isSecret;
    clone._description = this._description;
    return clone;
  }

  public secret(): EnvField<T> {
    const clone = new EnvField<T>(this._validate);
    clone._isOptional = this._isOptional;
    clone._defaultValue = this._defaultValue;
    clone._isSecret = true;
    clone._description = this._description;
    return clone;
  }

  public describe(desc: string): EnvField<T> {
    const clone = new EnvField<T>(this._validate);
    clone._isOptional = this._isOptional;
    clone._defaultValue = this._defaultValue;
    clone._isSecret = this._isSecret;
    clone._description = desc;
    return clone;
  }

  public get isOptional(): boolean {
    return this._isOptional;
  }

  public get defaultValue(): T | undefined {
    return this._defaultValue;
  }

  public get isSecret(): boolean {
    return this._isSecret;
  }

  public get description(): string | undefined {
    return this._description;
  }

  public validateRaw(raw: string | undefined): ValidatorResult<T> {
    if (raw === undefined || raw === "") {
      if (this._defaultValue !== undefined) {
        return { success: true, value: this._defaultValue };
      }
      if (this._isOptional) {
        return { success: true, value: undefined as unknown as T };
      }
      return { success: false, error: "Missing required environment variable" };
    }
    return this._validate(raw);
  }
}

export interface StringOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

export const env = {
  string(options?: StringOptions): EnvField<string> {
    return new EnvField<string>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      if (options?.minLength !== undefined && raw.length < options.minLength) {
        return {
          success: false,
          error: `Length must be at least ${options.minLength} chars (got ${raw.length})`,
        };
      }
      if (options?.maxLength !== undefined && raw.length > options.maxLength) {
        return {
          success: false,
          error: `Length must be at most ${options.maxLength} chars (got ${raw.length})`,
        };
      }
      if (options?.pattern !== undefined && !options.pattern.test(raw)) {
        return {
          success: false,
          error: `Value does not match required pattern ${options.pattern}`,
        };
      }
      return { success: true, value: raw };
    });
  },

  number(options?: NumberOptions): EnvField<number> {
    return new EnvField<number>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        return { success: false, error: `Invalid number: received "${raw}"` };
      }
      if (options?.integer && !Number.isInteger(parsed)) {
        return { success: false, error: `Must be an integer: received ${parsed}` };
      }
      if (options?.min !== undefined && parsed < options.min) {
        return { success: false, error: `Must be >= ${options.min} (got ${parsed})` };
      }
      if (options?.max !== undefined && parsed > options.max) {
        return { success: false, error: `Must be <= ${options.max} (got ${parsed})` };
      }
      return { success: true, value: parsed };
    });
  },

  port(defaultPort = 3000): EnvField<number> {
    return env
      .number({ integer: true, min: 1, max: 65535 })
      .default(defaultPort)
      .describe("Network port (1-65535)");
  },

  boolean(): EnvField<boolean> {
    return new EnvField<boolean>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      const lower = raw.trim().toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") {
        return { success: true, value: true };
      }
      if (lower === "false" || lower === "0" || lower === "no") {
        return { success: true, value: false };
      }
      return {
        success: false,
        error: `Invalid boolean: expected "true" or "false" (got "${raw}")`,
      };
    });
  },

  enum<const T extends readonly string[]>(allowedValues: T): EnvField<T[number]> {
    return new EnvField<T[number]>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      if ((allowedValues as readonly string[]).includes(raw)) {
        return { success: true, value: raw as T[number] };
      }
      return {
        success: false,
        error: `Invalid value "${raw}". Must be one of: [${allowedValues.join(", ")}]`,
      };
    });
  },

  url(): EnvField<string> {
    return new EnvField<string>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      try {
        new URL(raw);
        return { success: true, value: raw };
      } catch {
        return { success: false, error: `Invalid URL format: "${raw}"` };
      }
    });
  },

  email(): EnvField<string> {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return new EnvField<string>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      if (emailRe.test(raw)) {
        return { success: true, value: raw };
      }
      return { success: false, error: `Invalid email address: "${raw}"` };
    });
  },

  custom<T>(validator: (raw: string) => T, errorMessage?: string): EnvField<T> {
    return new EnvField<T>((raw) => {
      if (raw === undefined) return { success: false, error: "Value is undefined" };
      try {
        const res = validator(raw);
        return { success: true, value: res };
      } catch (err) {
        const msg = errorMessage || (err instanceof Error ? err.message : String(err));
        return { success: false, error: msg };
      }
    });
  },
};

export type EnvSchema = Record<string, EnvField<any>>;

export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: S[K] extends EnvField<infer T> ? T : never;
};

export interface EnvGuardOptions {
  env?: Record<string, string | undefined>;
  strict?: boolean;
}

export interface ValidationErrorDetail {
  key: string;
  error: string;
  isSecret: boolean;
  description?: string;
}

export class EnvValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    const formatted = formatErrors(errors);
    super(`Environment validation failed with ${errors.length} error(s):\n\n${formatted}`);
    this.name = "EnvValidationError";
    this.errors = errors;
  }
}

function formatErrors(errors: ValidationErrorDetail[]): string {
  const lines: string[] = [];
  lines.push("══════════════════════════════════════════════════════════");
  lines.push(" 🚨 EnvGuard: Invalid Environment Configuration");
  lines.push("══════════════════════════════════════════════════════════");

  for (const err of errors) {
    const secretTag = err.isSecret ? " [SECRET]" : "";
    lines.push(`  ❌ ${err.key}${secretTag}`);
    lines.push(`     Error: ${err.error}`);
    if (err.description) {
      lines.push(`     Info:  ${err.description}`);
    }
  }

  lines.push("══════════════════════════════════════════════════════════");
  return lines.join("\n");
}

export function defineEnv<S extends EnvSchema>(
  schema: S,
  options?: EnvGuardOptions
): InferEnv<S> {
  const source = options?.env || process.env;
  const errors: ValidationErrorDetail[] = [];
  const result: Record<string, any> = {};

  for (const [key, field] of Object.entries(schema)) {
    const rawVal = source[key];
    const validation = field.validateRaw(rawVal);

    if (validation.success) {
      result[key] = validation.value;
    } else {
      errors.push({
        key,
        error: validation.error,
        isSecret: field.isSecret,
        description: field.description,
      });
    }
  }

  if (errors.length > 0) {
    throw new EnvValidationError(errors);
  }

  return result as InferEnv<S>;
}
