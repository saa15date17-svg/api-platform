import { UserManager, User } from 'oidc-client-ts';

const ZITADEL_ISSUER = import.meta.env.VITE_ZITADEL_ISSUER || '';
const ZITADEL_CLIENT_ID = import.meta.env.VITE_ZITADEL_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_ZITADEL_REDIRECT_URI || window.location.origin;
const POST_LOGOUT_URI = import.meta.env.VITE_ZITADEL_POST_LOGOUT_URI || window.location.origin;

export const oidcConfig = {
  authority: ZITADEL_ISSUER,
  client_id: ZITADEL_CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  post_logout_redirect_uri: POST_LOGOUT_URI,
  response_type: 'code',
  scope: 'openid profile email offline_access',
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
};

export const userManager = new UserManager(oidcConfig);

export async function signInRedirect(): Promise<void> {
  await userManager.signinRedirect();
}

export async function signInCallback(): Promise<User | null> {
  const user = await userManager.signinRedirectCallback();
  return user;
}

export async function signOutRedirect(): Promise<void> {
  await userManager.signoutRedirect();
}

export async function getUser(): Promise<User | null> {
  return userManager.getUser();
}

export async function signInSilent(): Promise<User | null> {
  return userManager.signinSilent();
}
