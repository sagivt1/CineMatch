import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/tests/setup.env.ts"],          // רק env
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.db.ts"],   // beforeAll/afterAll
  clearMocks: true,
};

export default config;