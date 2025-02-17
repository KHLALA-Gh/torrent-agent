/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+.ts?$": [
      "ts-jest",
      {
        useESM: true,
        extensionsToTreatAsEsm: [".ts"],
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(.{1,2}/.*).js$": "$1",
  },
};
