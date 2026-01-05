// This is a server-side helper. It should NOT be imported into any client-side code.
// It directly uses a short-lived access token from environment variables.

const { DROPBOX_ACCESS_TOKEN } = process.env;

/**
 * Gets the Dropbox access token directly from environment variables.
 * Note: This is a short-lived token and must be manually regenerated and updated
 * in the environment variables when it expires.
 * @returns A promise that resolves with the access token.
 */
export async function getAccessToken(): Promise<string> {
    if (!DROPBOX_ACCESS_TOKEN) {
        console.error('CRITICAL: DROPBOX_ACCESS_TOKEN is not configured on the server.');
        throw new Error('Dropbox Access Token is not configured on the server. Please generate one from your Dropbox App Console and set it as an environment variable.');
    }

    return DROPBOX_ACCESS_TOKEN;
}
