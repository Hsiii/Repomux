import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function parseArgs(argv) {
    const options = new Map();

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (!argument.startsWith('--')) {
            continue;
        }

        const key = argument.slice(2);
        const value = argv[index + 1];

        if (value === undefined || value.startsWith('--')) {
            throw new Error(`Missing value for --${key}`);
        }

        options.set(key, value);
        index += 1;
    }

    return options;
}

function resolveCodexHome(rawValue) {
    if (rawValue !== undefined) {
        return path.resolve(rawValue);
    }

    if (process.env.CODEX_HOME !== undefined && process.env.CODEX_HOME !== '') {
        return path.resolve(process.env.CODEX_HOME);
    }

    return path.join(os.homedir(), '.codex');
}

function ensureRepomuxCheckout(repoRoot) {
    const requiredPaths = [
        path.join(repoRoot, 'package.json'),
        path.join(repoRoot, 'codex', 'repomux-automation.template.md'),
        path.join(repoRoot, '.agents', 'skills', 'repomux-codex-automation'),
    ];

    return Promise.all(
        requiredPaths.map(async (requiredPath) => await access(requiredPath))
    )
        .then(() => undefined)
        .catch(() => {
            throw new Error(
                `Expected a Repomux checkout at ${repoRoot}, but required automation files were missing.`
            );
        });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const repoRoot = path.resolve(options.get('repo-root') ?? process.cwd());
    const codexHome = resolveCodexHome(options.get('codex-home'));
    const appUrl = options.get('app-url') ?? 'http://localhost:5173';
    const worktreeRoot = path.resolve(
        options.get('worktree-root') ?? path.dirname(repoRoot)
    );
    const templatePath = path.join(
        repoRoot,
        'codex',
        'repomux-automation.template.md'
    );
    const promptDir = path.join(codexHome, 'repomux');
    const promptPath = path.join(promptDir, 'repomux-automation.prompt.md');
    const installedSkillDir = path.join(
        codexHome,
        'skills',
        'repomux-codex-automation'
    );
    const sourceSkillDir = path.join(
        repoRoot,
        '.agents',
        'skills',
        'repomux-codex-automation'
    );

    await ensureRepomuxCheckout(repoRoot);

    const template = await readFile(templatePath, 'utf8');
    const renderedTemplate = template
        .replaceAll('__REPOMUX_APP_URL__', appUrl)
        .replaceAll('__REPOMUX_REPO_ROOT__', repoRoot)
        .replaceAll('__WORKTREE_ROOT__', worktreeRoot);

    await mkdir(promptDir, { recursive: true });
    await writeFile(promptPath, renderedTemplate);

    await mkdir(path.dirname(installedSkillDir), { recursive: true });
    await cp(sourceSkillDir, installedSkillDir, {
        force: true,
        recursive: true,
    });

    process.stdout.write(
        [
            'Repomux Codex automation installed.',
            `Prompt: ${promptPath}`,
            `Skill: ${installedSkillDir}`,
            '',
            'Next steps:',
            '1. Open the Codex automation UI.',
            `2. Paste the prompt from ${promptPath}.`,
            '3. Use your preferred schedule or run it manually.',
        ].join('\n')
    );
}

await main();
