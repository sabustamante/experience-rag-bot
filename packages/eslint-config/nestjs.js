/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js"],
  rules: {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-extraneous-class": "off",
  },
};
