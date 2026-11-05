import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['public/build/**', 'node_modules/**', 'vendor/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['resources/js/**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooks,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // Compiler-oriented rules are opt-in for this codebase; keep the
            // classic rules-of-hooks + exhaustive-deps gates for now.
            'react-hooks/static-components': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/refs': 'off',
            // TypeScript already resolves identifiers; `no-undef` is noisy here.
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        files: ['resources/js/**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
