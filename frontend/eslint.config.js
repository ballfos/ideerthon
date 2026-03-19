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
            "src/tests/**",
            "src/__tests__/**",
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
            // 【全体ルール】AIの規律を保つ（バランス調整版）
            // ==========================================

            "no-restricted-syntax": [
                "error",
                { selector: "ClassDeclaration", message: "Class禁止。純粋関数を使用せよ。" },
                { selector: "TemplateLiteral > ConditionalExpression", message: "リテラル内での三項演算子禁止。tailwindならutils/ui/cn関数を使え" },
            ],

            // AIがあほになるので無し 
            // // 頻出する定数は許可するが、マジックナンバー禁止は維持
            // "no-magic-numbers": ["warn", {
            //     ignore: [0, 1, 2, -1],
            //     enforceConst: true,
            //     ignoreArrayIndexes: true,
            // }],

            // 状態変更の禁止・関数型プログラミングの徹底 (error)
            "functional/no-let": "warn",

            "perfectionist/sort-objects": ["error", { type: "alphabetical" }],
            "perfectionist/sort-imports": ["error", { type: "alphabetical" }],
            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_"
                }
            ],

            "react/destructuring-assignment": ["error", "always"],
            // "react/no-array-index-key": "error",

            "zod/no-any-schema": "error",

            // TypeScript 厳格ルール
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/restrict-template-expressions": "off",
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
            "check-file/filename-naming-convention": ["error", { "src/!(routes)/**/*.{ts,tsx}": "KEBAB_CASE" }],
            "check-file/folder-naming-convention": ["error", { "src/!(routes)/**/": "KEBAB_CASE" }],
        },
    }
);