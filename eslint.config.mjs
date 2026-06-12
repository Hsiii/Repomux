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
            'supabase/functions/**',
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
        files: ['src/app/**/layout.tsx', 'src/app/**/page.tsx'],
        rules: {
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
