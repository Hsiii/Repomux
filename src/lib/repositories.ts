import type { Repository } from '../types/app.js';
import { supabase } from './supabase.js';

const activeRepositoriesKey = 'repomux.activeRepositories';

export function getStoredActiveRepositories(): readonly string[] | undefined {
    const storedValue = globalThis.localStorage.getItem(activeRepositoriesKey);

    if (storedValue === null) {
        return undefined;
    }

    return storedValue
        .split('\n')
        .filter((repositoryName) => repositoryName !== '');
}

export function setStoredActiveRepositories(
    repositoryNames: readonly string[]
): void {
    globalThis.localStorage.setItem(
        activeRepositoriesKey,
        repositoryNames.join('\n')
    );
}

export function normalizeRepository(input: string): string {
    const trimmedInput = input.trim();
    const sshMatch =
        /^git@github\.com:(?<owner>[\w.-]+)\/(?<repo>[\w.-]+?)(?:\.git)?$/u.exec(
            trimmedInput
        );

    if (sshMatch?.groups !== undefined) {
        return `${sshMatch.groups.owner}/${sshMatch.groups.repo}`;
    }

    try {
        const repositoryUrl = new URL(trimmedInput);

        if (repositoryUrl.hostname !== 'github.com') {
            return trimmedInput;
        }

        const pathSegments = repositoryUrl.pathname.split('/').filter(Boolean);

        if (pathSegments.length < 2) {
            return trimmedInput;
        }

        const [owner, repo] = pathSegments;

        return `${owner}/${repo.replace(/\.git$/u, '')}`;
    } catch {
        return trimmedInput.replace(/\.git$/u, '');
    }
}

export async function loadRepositories(): Promise<readonly Repository[]> {
    if (supabase === undefined) {
        return [];
    }

    const { data, error } = await supabase
        .from('repositories')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

    if (error !== null) {
        throw new Error(error.message);
    }

    return data.map((repository) => ({
        fullName: repository.full_name as string,
        id: repository.id as string,
    }));
}
