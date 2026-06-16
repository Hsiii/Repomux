export interface Repository {
    fullName: string;
    id: string;
}

export interface GitHubIssue {
    assignees?: ReadonlyArray<{ readonly login?: string }>;
    body?: string;
    comments: number;
    html_url: string;
    labels: ReadonlyArray<string | { readonly name?: string }>;
    number: number;
    pull_request?: unknown;
    repository_url: string;
    title: string;
    user?: { readonly login?: string };
}

export interface GitHubUser {
    avatar_url?: string;
    login: string;
    name?: string | null;
}

export interface WorkItem {
    assigneeLogins: readonly string[];
    authorLogin: string;
    body: string;
    codexReady: boolean;
    commentsCount: number;
    id: string;
    number: number;
    repo: string;
    title: string;
    type: 'issue' | 'pr';
    url: string;
}
