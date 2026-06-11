export interface Repository {
    fullName: string;
    id: string;
}

export interface GitHubIssue {
    assignees?: ReadonlyArray<{ readonly login?: string }>;
    body?: string;
    html_url: string;
    labels: ReadonlyArray<string | { readonly name?: string }>;
    number: number;
    pull_request?: unknown;
    repository_url: string;
    title: string;
}

export interface GitHubUser {
    login: string;
    name?: string | null;
}

export interface WorkItem {
    assigneeLogins: readonly string[];
    body: string;
    codexReady: boolean;
    id: string;
    number: number;
    repo: string;
    title: string;
    type: 'issue' | 'pr';
    url: string;
}
