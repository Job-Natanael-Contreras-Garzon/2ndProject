// Revisión de código con ESLint. Se corre con: pnpm lint
import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "playwright-report/**",
            "test-results/**",
        ],
    },

    js.configs.recommended,

    // Backend: Node con CommonJS y pruebas con Jest
    {
        files: ["backend/**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: { ...globals.node, ...globals.jest },
        },
    },

    // Frontend: Vue en el navegador (y pruebas con Vitest)
    ...pluginVue.configs["flat/essential"].map((config) => ({
        ...config,
        files: ["frontend/**/*.{js,vue}"],
    })),
    {
        files: ["frontend/**/*.{js,vue}"],
        languageOptions: {
            sourceType: "module",
            globals: { ...globals.browser },
        },
    },

    // Pruebas E2E de Playwright y archivos de configuración (módulos de Node)
    {
        files: ["tests/**/*.js", "*.config.js", "frontend/*.config.js"],
        languageOptions: { sourceType: "module", globals: { ...globals.node } },
    },

    {
        rules: {
            // Aviso, no error: ayuda a limpiar sin bloquear
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
            // Los nombres de una sola palabra son parte del repo base (Modal, Navbar...)
            "vue/multi-word-component-names": "off",
        },
    },
];
