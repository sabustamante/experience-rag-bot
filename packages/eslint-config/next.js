/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js"],
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    "no-console": "off",
  },
};
