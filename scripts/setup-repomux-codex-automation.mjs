import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
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

function ensureRepomuxCheckout(repoRoot) {
    const requiredPaths = [
        path.join(repoRoot, 'package.json'),
        path.join(repoRoot, 'codex', 'repomux-automation.template.md'),
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
    const automationWorkspaceRoot = path.resolve(
        options.get('automation-workspace-root') ?? repoRoot
    );
    const worktreeRoot =
        options.get('worktree-root') ??
        '__SET_THIS_TO_YOUR_LOCAL_REPOSITORY_ROOT__';
    const githubScopeHint =
        options.get('github-scope-hint') ?? '__SET_THIS_TO_YOUR_GITHUB_SCOPE__';
    const templatePath = path.join(
        repoRoot,
        'codex',
        'repomux-automation.template.md'
    );
    const outputPath = path.resolve(
        options.get('output') ??
            path.join(repoRoot, '.codex', 'repomux-automation.prompt.md')
    );

    await ensureRepomuxCheckout(repoRoot);

    const template = await readFile(templatePath, 'utf8');
    const renderedTemplate = template
        .replaceAll('{{AUTOMATION_WORKSPACE_ROOT}}', automationWorkspaceRoot)
        .replaceAll('{{WORKTREE_ROOT}}', worktreeRoot)
        .replaceAll('{{GITHUB_SCOPE_HINT}}', githubScopeHint);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderedTemplate);

    process.stdout.write(
        [
            'Codex-ready GitHub automation prompt rendered.',
            `Prompt: ${outputPath}`,
            '',
            'Preferred setup:',
            '1. In this checkout, ask Codex to set up the codex-ready GitHub automation.',
            '2. Let Codex create a suggested automation in the app for review.',
            '3. Confirm the local repository root and GitHub search scope before saving if they are not already known.',
            '4. Make sure GitHub is connected in Codex and local git or gh auth is ready if the run needs clone or push access.',
            '',
            'Manual fallback:',
            `- Paste the prompt from ${outputPath} into a Codex automation yourself.`,
        ].join('\n')
    );
}

await main();
