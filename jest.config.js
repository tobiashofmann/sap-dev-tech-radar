// jest.config.js
export default {
  testEnvironment: "node",
  // findet *.test.js, *.spec.js, .cjs und .mjs Tests im __tests__ Ordner
  testMatch: ["**/__tests__/**/*.cjs", "**/__tests__/**/*.mjs", "**/__tests__/**/*.[jt]s", "**/?(*.)+(spec|test).cjs", "**/?(*.)+(spec|test).mjs", "**/?(*.)+(spec|test).[jt]s"],
};
