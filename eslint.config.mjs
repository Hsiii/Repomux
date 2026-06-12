import { completeConfigBase } from 'eslint-config-complete';

export default [
    ...completeConfigBase,

    {
        ignores: [
            '.next/**',
            'dist/**',
            'next-env.d.ts',
            'node_modules/**',
            'packages/create-hsi-app/**',
            'scripts/**',
        ],
    },

    {
        rules: {
            '@stylistic/quotes': [
                'error',
                'single',
                {
                    avoidEscape: true,
                },
            ],
            'import-x/no-unassigned-import': [
                'error',
                {
                    allow: ['**/*.css'],
                },
            ],
        },
    },

    {
        files: [
            'src/app/**/layout.tsx',
            'src/app/**/page.tsx',
            'src/app/robots.ts',
            'src/app/sitemap.ts',
        ],
        rules: {
            'complete/no-mutable-return': 'off',
            'import-x/no-default-export': 'off',
        },
    },

    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        rules: {
            'n/file-extension-in-import': 'off',
        },
    },
];
