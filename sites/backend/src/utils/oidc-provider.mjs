import { readFileSync, writeFileSync } from 'node:fs'
import { UserModel } from '../models/user.mjs'
import { Provider } from 'oidc-provider'
import { getJwks } from './crypto.mjs'

/*
 * Path where the OIDC JWKS is persisted between restarts.
 * Regenerating the signing keys on every restart would invalidate all
 * previously issued tokens (ID tokens, access tokens) — users would be
 * effectively logged out of the forum after every backend restart.
 */
const JWKS_FILE = 'oidc-jwks.json'

/*
 * This will be called at startup
 */
export async function loadOidcProvider(tools) {
  // Don't continue if the provider is not enabled
  if (!tools.config.oidc?.provider) return

  // Load or generate the JWKS used to sign tokens.
  // We persist it so that keys survive server restarts.
  const jwks = await loadOrCreateJwks()

  // Extend config with key set and account lookup
  const config = {
    ...tools.config.oidc.provider,
    jwks,
    findAccount: (ctx, uuid) => findAccount(ctx, uuid, tools),
    loadExistingGrant,
  }

  // Instantiate OIDC provider
  tools.oidcProvider = new Provider('https://backend.freesewing.eu', config)

  // Required when the provider sits behind a reverse proxy (nginx/caddy/etc.)
  tools.oidcProvider.proxy = true

  // Mount the provider's built-in protocol endpoints (/oidc/auth, /oidc/token,
  // /oidc/me, /jwks, etc.) onto the Express app.
  tools.app.use(tools.oidcProvider.callback())
}

/*
 * Loads the JWKS from disk if it exists, otherwise generates a new one and
 * saves it. This ensures signing keys are stable across server restarts.
 */
async function loadOrCreateJwks() {
  try {
    const raw = readFileSync(JWKS_FILE, 'utf-8')
    const jwks = JSON.parse(raw)
    // Basic sanity check: must have at least one key
    if (jwks?.keys?.length > 0) return jwks
  } catch {
    // File doesn't exist yet or is malformed — fall through to generate
  }

  const jwks = await getJwks()
  writeFileSync(JWKS_FILE, JSON.stringify(jwks))
  return jwks
}

/*
 * Looks up a FreeSewing user by id and returns an OIDC account object.
 * Called by the provider when it needs to include claims in tokens.
 */
async function findAccount(ctx, uuid, tools) {
  const User = new UserModel(tools)
  await User.read({ uuid })

  // Return undefined if the user doesn't exist so the provider rejects the request
  if (!User.exists) return undefined

  const account = User.asAccount()

  return {
    accountId: account.uuid,
    role: account.role,
    async claims(use, scope) {
      // sub claim is always returned
      const claims = { sub: uuid }

      // profile claims
      if (scope.includes('profile')) {
        claims.name = account.username
        claims.preferred_username = account.username
        claims.picture = `https://static.freesewing.eu/user/${uuid.slice(0, 1)}/${uuid.slice(0, 2)}/${uuid}.webp`
        // updatedAt must be a Unix timestamp (seconds)
        claims.updated_at = Math.floor(new Date(User.record.updatedAt).getTime() / 1e3)
        claims.bio = account.bio
        claims.moderator = account.role === 'admin'
        claims.role = account.role
      }

      // email claims
      if (scope.includes('email')) {
        claims.email = account.email
        claims.email_verified = true
      }

      return claims
    },
  }
}

/*
 * Called by the provider to load or create the grant for a given client/user
 * pair. For the first-party forum client we auto-approve all requested scopes
 * so the user never sees a separate consent screen.
 *
 * For any other (unknown) client we return undefined, which causes the provider
 * to halt the flow and return an error — no unknown client can silently obtain
 * a grant.
 */
async function loadExistingGrant(ctx) {
  // If a grant was already created for this session+client, reuse it
  const grantId =
    ctx.oidc.result?.consent?.grantId || ctx.oidc.session?.grantIdFor(ctx.oidc.client.clientId)

  if (grantId) return ctx.oidc.provider.Grant.find(grantId)

  // Auto-approve consent for first-party clients
  const firstPartyClients = ['forum', 'support', 'morio', 'supermorio', 'semaphoreui', 'matrix']
  if (firstPartyClients.includes(ctx.oidc.client.clientId)) {
    const grant = new ctx.oidc.provider.Grant({
      clientId: ctx.oidc.client.clientId,
      accountId: ctx.oidc.session?.accountId || ctx.oidc.account?.accountId,
    })

    // If this is a privileged client, only allow users with the support role
    if (['support', 'supermorio', 'semaphoreui'].includes(ctx.oidc.client.clientId)) {
      // This will break the flow, but it's required because freescout does not handle this
      if (!['support', 'admin'].includes(ctx.oidc.account?.role)) return undefined
    }

    // Grant exactly the scopes that were requested
    if (ctx.oidc.params?.scope) {
      ctx.oidc.params.scope.split(' ').forEach((scope) => grant.addOIDCScope(scope))
    }

    await grant.save()
    return grant
  }

  // Unknown client — deny the grant
  return undefined
}
