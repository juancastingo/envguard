import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineEnv, env, EnvValidationError } from "../src/index.js";

describe("envguard validation", () => {
  test("successfully validates and parses valid environment variables", () => {
    const mockEnv = {
      NODE_ENV: "production",
      PORT: "8080",
      DEBUG: "true",
      DATABASE_URL: "https://db.prod.internal/app",
      API_KEY: "secret_12345",
      TIMEOUT: "5000",
    };

    const config = defineEnv(
      {
        NODE_ENV: env.enum(["development", "staging", "production"] as const),
        PORT: env.port(3000),
        DEBUG: env.boolean(),
        DATABASE_URL: env.url(),
        API_KEY: env.string().secret(),
        TIMEOUT: env.number({ min: 1000 }).default(3000),
        OPTIONAL_FEATURE: env.string().optional(),
      },
      { env: mockEnv }
    );

    assert.equal(config.NODE_ENV, "production");
    assert.equal(config.PORT, 8080);
    assert.equal(config.DEBUG, true);
    assert.equal(config.DATABASE_URL, "https://db.prod.internal/app");
    assert.equal(config.API_KEY, "secret_12345");
    assert.equal(config.TIMEOUT, 5000);
    assert.equal(config.OPTIONAL_FEATURE, undefined);
  });

  test("uses default values when variables are omitted", () => {
    const config = defineEnv(
      {
        PORT: env.port(4000),
        TIMEOUT: env.number().default(2500),
      },
      { env: {} }
    );

    assert.equal(config.PORT, 4000);
    assert.equal(config.TIMEOUT, 2500);
  });

  test("throws EnvValidationError with all collected errors and secret protection", () => {
    const invalidEnv = {
      PORT: "not-a-port",
      DATABASE_URL: "invalid-url",
      // API_KEY is missing
    };

    assert.throws(
      () => {
        defineEnv(
          {
            PORT: env.port(),
            DATABASE_URL: env.url(),
            API_KEY: env.string().secret().describe("Production API token"),
          },
          { env: invalidEnv }
        );
      },
      (err: any) => {
        assert(err instanceof EnvValidationError);
        assert.equal(err.errors.length, 3);

        const secretErr = err.errors.find((e: any) => e.key === "API_KEY");
        assert(secretErr);
        assert.equal(secretErr.isSecret, true);
        assert(err.message.includes("[SECRET]"));
        assert(err.message.includes("Production API token"));
        return true;
      }
    );
  });

  test("supports custom validators", () => {
    const customEnv = {
      CSV_ITEMS: "item1,item2,item3",
    };

    const config = defineEnv(
      {
        CSV_ITEMS: env.custom((raw) => raw.split(",")),
      },
      { env: customEnv }
    );

    assert.deepEqual(config.CSV_ITEMS, ["item1", "item2", "item3"]);
  });
});
