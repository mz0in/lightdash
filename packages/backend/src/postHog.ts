import { FeatureFlags, SessionUser } from '@lightdash/common';
import { PostHog } from 'posthog-node';
import { lightdashConfig } from './config/lightdashConfig';

export const postHogClient = lightdashConfig.posthog.projectApiKey
    ? new PostHog(lightdashConfig.posthog.projectApiKey, {
          host: lightdashConfig.posthog.apiHost,
      })
    : undefined;

/**
 * Convenience method to check if a feature flag is enabled for a given user.
 *
 * The flag argument should be a member of the FeatureFlags enum defined in `common`.
 */
export async function isFeatureFlagEnabled(
    flag: FeatureFlags,
    user: Pick<SessionUser, 'userUuid' | 'organizationUuid'>,
    {
        postHog = postHogClient,
    }: {
        postHog?: PostHog;
    } = {},
): Promise<boolean> {
    /** If we don't have a PostHog client instance, we return false for all checks */
    if (!postHog) {
        return false;
    }

    const isEnabled = await postHog.isFeatureEnabled(
        flag,
        user.userUuid,
        user.organizationUuid != null
            ? {
                  groups: {
                      organization: user.organizationUuid,
                  },
              }
            : {},
    );

    // isFeatureEnabled returns boolean | undefined, so we force it into a boolean:
    return !!isEnabled;
}
