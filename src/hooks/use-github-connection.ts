import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchGitHubSession } from '../lib/github';
import type { GitHubUser } from '../types/app';

interface UseGitHubConnectionResult {
    connectGitHub: () => void;
    disconnectGitHub: () => void;
    githubUserQuery: UseQueryResult<GitHubUser | undefined>;
    isGitHubConnected: boolean;
}

function getGitHubOAuthErrorMessage(error: string): string {
    switch (error) {
        case 'github_oauth_code': {
            return 'GitHub did not return an authorization code.';
        }

        case 'github_oauth_exchange': {
            return 'Unable to complete GitHub authentication.';
        }

        case 'github_oauth_state': {
            return 'GitHub authentication state did not match.';
        }

        default: {
            return 'GitHub authentication failed.';
        }
    }
}

export function useGitHubConnection(
    setStatusMessage: Dispatch<SetStateAction<string>>
): UseGitHubConnectionResult {
    const queryClient = useQueryClient();
    const [hasHandledOAuthError, setHasHandledOAuthError] = useState(false);

    const githubUserQuery = useQuery({
        queryFn: fetchGitHubSession,
        queryKey: ['github-session'],
        retry: false,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (hasHandledOAuthError) {
            return undefined;
        }

        const url = new URL(globalThis.location.href);
        const error = url.searchParams.get('error');

        if (error === null) {
            setHasHandledOAuthError(true);
            return undefined;
        }

        setStatusMessage(getGitHubOAuthErrorMessage(error));
        url.searchParams.delete('error');
        globalThis.history.replaceState({}, '', url);
        setHasHandledOAuthError(true);

        return undefined;
    }, [hasHandledOAuthError, setStatusMessage]);

    function connectGitHub() {
        setStatusMessage('');
        globalThis.location.assign('/api/github/login');
    }

    function disconnectGitHub() {
        fetch('/api/github/logout', {
            method: 'POST',
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Unable to disconnect GitHub.');
                }

                setStatusMessage('');
                await queryClient.invalidateQueries({
                    queryKey: ['github-session'],
                });
                await queryClient.invalidateQueries({
                    queryKey: ['accessible-repositories'],
                });
                await queryClient.invalidateQueries({
                    queryKey: ['work-items'],
                });
            })
            .catch((error: unknown) => {
                setStatusMessage(
                    error instanceof Error
                        ? error.message
                        : 'Unable to disconnect GitHub.'
                );
            });
    }

    return {
        connectGitHub,
        disconnectGitHub,
        githubUserQuery,
        isGitHubConnected: githubUserQuery.data !== undefined,
    };
}
