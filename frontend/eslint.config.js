import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactPerf from "eslint-plugin-react-perf";
import functional from "eslint-plugin-functional";
import perfectionist from "eslint-plugin-perfectionist";
import checkFile from "eslint-plugin-check-file";
import boundaries from "eslint-plugin-boundaries";
import unusedImports from "eslint-plugin-unused-imports";
import unicorn from "eslint-plugin-unicorn";
import zod from "eslint-plugin-zod";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import globals from "globals";

export default tseslint.config(
    // 1. 自動生成ファイルの無視
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "src/gen/**",
            "src/routeTree.gen.ts",
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    ...tanstackRouter.configs["flat/recommended"],

    {
        languageOptions: {
            globals: { ...globals.browser },
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooks,
            "react-perf": reactPerf,
            functional,
            perfectionist,
            "check-file": checkFile,
            boundaries,
            "unused-imports": unusedImports,
            unicorn,
            zod,
        },
        settings: {
            react: { version: "detect" },
            "boundaries/elements": [
                { type: "components", name: "components", pattern: "src/components/*" },
                { type: "features", name: "features", pattern: "src/features/*" },
                { type: "lib", name: "lib", pattern: "src/lib/*" },
                { type: "routes", name: "routes", pattern: "src/routes/*" },
                { type: "utils", name: "utils", pattern: "src/utils/*" },
            ],
        },
        rules: {
            // ==========================================
            // 【全体ルール】AIの規律を保つ
            // ==========================================
            "max-params": ["error", 1],

            "no-restricted-syntax": [
                "error",
                { selector: "ClassDeclaration", message: "Class禁止。純粋関数を使用せよ。" },
                // ★ throw はここでグローバルに禁止
                { selector: "ThrowStatement", message: "throw禁止。lib/ 配下でラップするか Result型を返せ。" },
                { selector: "JSXOpeningElement > JSXSpreadAttribute", message: "Props Spread禁止。" },
                { selector: "TemplateLiteral > :not(Identifier)", message: "リテラル内での演算禁止。" },
                { selector: "JSXExpressionContainer > LogicalExpression[operator='&&']", message: "JSX内での '&&' 禁止。三項演算子を使用せよ。" },
            ],

            // no-function は削除（functionキーワードを許可）

            "no-magic-numbers": ["error", { ignore: [0, 1], enforceConst: true }],
            "functional/no-let": "error",
            "functional/immutable-data": "error",
            "perfectionist/sort-objects": ["error", { type: "alphabetical" }],
            "perfectionist/sort-imports": ["error", { type: "alphabetical" }],
            "unused-imports/no-unused-imports": "error",

            "react/destructuring-assignment": ["error", "always"],
            "react/no-array-index-key": "error",
            "react-perf/jsx-no-new-object-as-prop": "error",
            "zod/no-any-schema": "error",
        },
    },

    // ==========================================
    // 【聖域：Adapter層】src/lib & src/utils
    // ==========================================
    {
        files: ["src/lib/**/*.ts", "src/utils/**/*.ts"],
        rules: {
            // ★ ここで no-restricted-syntax を OFF にすることで throw を許可
            "no-restricted-syntax": "off",
            "max-params": "off",
            "functional/no-let": "off",
            "functional/immutable-data": "off",
        },
    },

    // ==========================================
    // 【境界：Architecture】
    // ==========================================
    {
        files: ["src/**/*.{ts,tsx}"],
        rules: {
            "boundaries/entry-point": [
                "error",
                {
                    default: "disallow",
                    rules: [
                        { target: "src/features/*", allow: "src/features/*/index.ts" },
                    ],
                },
            ],
        },
    },

    // ==========================================
    // 【命名 & その他】
    // ==========================================
    {
        files: ["src/**/*.{ts,tsx}"],
        rules: {
            "check-file/filename-naming-convention": ["error", { "src/**/*.{ts,tsx}": "KEBAB_CASE" }],
            "check-file/folder-naming-convention": ["error", { "src/**/": "KEBAB_CASE" }],
        },
    }
);