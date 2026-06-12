import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(name) {
    const value = process.env[name];

    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

async function main() {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    const accessToken = getRequiredEnv('REPO_MUX_SMOKE_ACCESS_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError !== null) {
        throw new Error(
            `Unable to load authenticated user: ${userError.message}`
        );
    }

    if (user === null) {
        throw new Error(
            'Smoke token did not resolve to an authenticated user.'
        );
    }

    const smokeTag = `repomux-smoke-${Date.now()}`;
    const repoName = `smoke/${smokeTag}`;

    const { data: insertedRow, error: insertError } = await supabase
        .from('repositories')
        .insert({
            full_name: repoName,
            is_active: true,
            notes: smokeTag,
            user_id: user.id,
        })
        .select('id, full_name, is_active, notes, user_id')
        .single();

    if (insertError !== null) {
        throw new Error(`Insert failed: ${insertError.message}`);
    }

    if (insertedRow.full_name !== repoName || insertedRow.user_id !== user.id) {
        throw new Error(
            'Inserted repository row did not match the authenticated user.'
        );
    }

    const { data: selectedRow, error: selectError } = await supabase
        .from('repositories')
        .select('id, full_name, is_active, notes, user_id')
        .eq('id', insertedRow.id)
        .single();

    if (selectError !== null) {
        throw new Error(`Select failed: ${selectError.message}`);
    }

    if (selectedRow.user_id !== user.id) {
        throw new Error(
            'Selected repository row was not scoped to the authenticated user.'
        );
    }

    const { data: updatedRow, error: updateError } = await supabase
        .from('repositories')
        .update({
            is_active: false,
            notes: `${smokeTag}-updated`,
        })
        .eq('id', insertedRow.id)
        .select('id, full_name, is_active, notes, user_id')
        .single();

    if (updateError !== null) {
        throw new Error(`Update failed: ${updateError.message}`);
    }

    if (
        updatedRow.is_active !== false ||
        updatedRow.notes !== `${smokeTag}-updated`
    ) {
        throw new Error(
            'Updated repository row did not persist the expected archive state.'
        );
    }

    console.log(
        JSON.stringify(
            {
                repositoryId: updatedRow.id,
                scopeVerified: updatedRow.user_id,
                smokeTag,
                success: true,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
