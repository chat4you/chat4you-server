module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
    },
    extends: ["standard"],
    parserOptions: {
        ecmaVersion: 12,
    },
    rules: {
        indent: ["warn", 4, { SwitchCase: 1 }],
        quotes: ["error", "double"],
        "comma-dangle": ["warn", "always-multiline"],
        semi: ["error", "always", { omitLastInOneLineBlock: true }],
    },
};
