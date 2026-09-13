import chalk from 'chalk'
// Load environment variables
import dotenv from 'dotenv'
import { asJson } from './utils/index.mjs'
import { randomString } from './utils/crypto.mjs'
import set from 'lodash/set.js'
import get from 'lodash/get.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { postConfig } from '../local-config.mjs'
import { measurements, roles } from '@freesewing/config'
dotenv.config()

/*
 * Make this easy to update
 */
const languages = ['en']

/*
 * Allow these 2 to be imported
 */
export const port = process.env.BACKEND_PORT || 3001
export const api = process.env.BACKEND_URL || `http://localhost:${port}`

/*
 * Generate/Check keys only once.
 *
 * We use distinct keys so that a compromise of one does not
 * automatically compromise the others:
 *   - BACKEND_ENC_KEY   : AES-256 encryption of data at rest
 *   - BACKEND_JWT_KEY   : HMAC signing of JWTs (falls back to enc key) (old symmetric algorithm)
 *   - BACKEND_JWT_PUBLIC_KEY: Public key for verification of JWTs (new assymetric algorithm)
 *   - BACKEND_JWT_PRIVATE_KEY: Public key for verification of JWTs (new assymetric algorithm)
 *   - BACKEND_COOKIE_KEY: Signing of OIDC session cookies (falls back to enc key)
 */
const encryptionKey = process.env.BACKEND_ENC_KEY || ensureKey('encryption', 64)
const jwtKey = process.env.BACKEND_JWT_KEY || ensureKey('jwt', 64)
const jwtPrivateKey = (readFileSync('jwt.private.pem', 'utf-8') || '').trim()
const cookie1Key = process.env.BACKEND_COOKIE_KEY || ensureKey('cookie1', 32)
const cookie2Key = process.env.BACKEND_COOKIE_KEY || ensureKey('cookie2', 32)

/*
 * All environment variables are strings
 * This is a helper method to turn them into a boolean
 */
const envToBool = (input = 'no') => {
  if (['yes', '1', 'true'].includes(input.toLowerCase())) return true
  return false
}

/*
 * Construct config object
 */
const baseConfig = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  // Maintainer contact
  maintainer: 'joost@joost.at',
  // Instance
  instance: process.env.BACKEND_INSTANCE || Date.now(),
  // Feature flags
  use: {
    codeberg: envToBool(process.env.BACKEND_ENABLE_CODEBERG),
    jitsi: envToBool(process.env.BACKEND_ENABLE_JITSI),
    oidc: {
      provider: envToBool(process.env.BACKEND_ENABLE_OIDC_PROVIDER),
      clients: {
        forum: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_FORUM),
        support: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_SUPPORT),
        morio: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_MORIO),
        supermorio: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_SUPERMORIO),
        semaphoreui: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_SEMAPHOREUI),
        matrix: envToBool(process.env.BACKEND_ENABLE_OIDC_CLIENT_MATRIX),
      },
    },
    noCORS: envToBool(process.env.BACKEND_ENABLE_OPEN_API),
  },
  // Config
  api,
  apikeys: {
    levels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    expiryMaxSeconds: 732 * 24 * 3600,
  },
  db: {
    path: process.env.BACKEND_DB_PATH || './tests/database.sqlite',
  },
  bookmarks: {
    types: ['set', 'cset', 'pattern', 'design', 'doc', 'custom'],
  },
  email: {
    from: 'FreeSewing <no-reply@notifications.freesewing.eu>',
    bcc: ['FreeSewing records <records@freesewing.eu>'],
    token: process.env.BACKEND_SCALEWAY_EMAIL_TOKEN,
    project: process.env.BACKEND_SCALEWAY_PROJECT_ID,
    domain: process.env.BACKEND_NOTIFICATIONS_DOMAIN,
  },
  encryption: {
    key: encryptionKey,
  },
  enums: {
    user: {
      consent: [0, 1, 2, 3],
      control: [1, 2, 3, 4, 5],
      language: languages,
      compare: [true, false],
      imperial: [true, false],
      newsletter: [true, false],
    },
  },
  exports: {
    dir: process.env.BACKEND_EXPORTS_DIR || '/tmp',
    url: process.env.BACKEND_EXPORTS_URL || 'https://static.freesewing.eu/export/',
  },
  jwt: {
    secretOrKey: jwtPrivateKey ? jwtPrivateKey : jwtKey,
    issuer: api,
    expiresIn: process.env.BACKEND_JWT_EXPIRY || '7d',
  },
  languages,
  // Rate limits
  limits: {
    auth: 10,
    all: 600,
  },
  // Silent disables all logging
  silent: false,
  measies: measurements,
  media: {
    rootFolder: process.env.BACKEND_MEDIA_ROOT_FOLDER || '/tmp/media',
  },
  mfa: {
    service: process.env.BACKEND_MFA_SERVICE || 'FreeSewing',
  },
  port,
  roles,
  website: {
    domain: process.env.BACKEND_WEBSITE_DOMAIN || 'freesewing.eu',
    scheme: process.env.BACKEND_WEBSITE_SCHEME || 'https',
  },
}

/*
 * Config behind feature flags
 */

// Codeberg config
if (baseConfig.use.codeberg)
  baseConfig.codeberg = {
    token: process.env.BACKEND_CODEBERG_TOKEN,
    api: 'https://codeberg.org/api/v1',
    owner: 'freesewing',
    repo: 'freesewing',
    bot: {
      user: process.env.BACKEND_CODEBERG_USER || 'skully',
      name: process.env.BACKEND_CODEBERG_USER_NAME || 'Freesewing bot',
      email: process.env.BACKEND_CODEBERG_USER_EMAIL || 'skully@freesewing.eu',
    },
  }

// Jitsi config
if (baseConfig.use.jitsi)
  baseConfig.jitsi = {
    appId: process.env.BACKEND_JITSI_APP_ID,
    secret: process.env.BACKEND_JITSI_SECRET,
    moderators: [
      '10355124-65c8-4fcf-9290-43b921365583', // joost
    ],
  }

// OIDC Provider config
if (baseConfig.use.oidc.provider) {
  baseConfig.oidc = {
    provider: {
      proxy: true,
      clients: [],
      pkce: {
        required: () => false,
      },
      features: {
        devInteractions: { enabled: false },
        encryption: { enabled: true },
        introspection: { enabled: true },
        revocation: { enabled: true },
      },
      cookies: {
        keys: [cookie1Key, cookie2Key],
      },
      routes: {
        authorization: '/oidc/auth',
        backchannel_authentication: '/oidc/backchannel',
        code_verification: '/oidc/device',
        device_authorization: '/oidc/device/auth',
        end_session: '/oidc/session/end',
        introspection: '/oidc/token/introspection',
        jwks: '/jwks',
        pushed_authorization_request: '/oidc/request',
        registration: '/oidc/reg',
        revocation: '/oidc/token/revocation',
        token: '/oidc/token',
        userinfo: '/oidc/me',
      },
      ttl: {
        Interaction: 3600,
        Session: 24 * 60 * 60,
        Grant: 14 * 24 * 60 * 60,
        AccessToken: 60 * 60,
        IdToken: 60 * 60,
        RefreshToken: 14 * 24 * 60 * 60,
        ClientCredentials: 10 * 60,
      },
      scopes: ['openid', 'email', 'profile'],
      claims: {
        openid: ['sub'],
        email: ['email', 'email_verified'],
        profile: [
          'name',
          'preferred_username',
          'picture',
          'updated_at',
          'bio',
          'moderator',
          'role',
        ],
      },
      // This is required for the SemaphoreUI OIDC client
      conformIdTokenClaims: false,
    },
    clients: [],
  }
  if (baseConfig.use.oidc.clients.forum)
    baseConfig.oidc.provider.clients.push({
      client_id: 'forum',
      client_secret: process.env['BACKEND_OIDC_CLIENT_FORUM_SECRET'],
      redirect_uris: [
        'https://forum.freesewing.eu/auth/oidc/callback',
        'https://forum.freesewing.org/auth/oidc/callback',
      ],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
  if (baseConfig.use.oidc.clients.support)
    baseConfig.oidc.provider.clients.push({
      client_id: 'support',
      client_secret: process.env['BACKEND_OIDC_CLIENT_SUPPORT_SECRET'],
      redirect_uris: ['https://support.freesewing.eu/oauth-login/callback/avjk80n5p'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
  if (baseConfig.use.oidc.clients.morio)
    baseConfig.oidc.provider.clients.push({
      client_id: 'morio',
      client_secret: process.env['BACKEND_OIDC_CLIENT_MORIO_SECRET'],
      redirect_uris: ['https://morio.freesewing.eu/-/api/callback/oidc/freesewing'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
  if (baseConfig.use.oidc.clients.supermorio)
    baseConfig.oidc.provider.clients.push({
      client_id: 'supermorio',
      client_secret: process.env['BACKEND_OIDC_CLIENT_SUPERMORIO_SECRET'],
      redirect_uris: ['https://morio.freesewing.eu/-/api/callback/oidc/support'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
  if (baseConfig.use.oidc.clients.semaphoreui)
    baseConfig.oidc.provider.clients.push({
      client_id: 'semaphoreui',
      client_secret: process.env['BACKEND_OIDC_CLIENT_SEMAPHOREUI_SECRET'],
      redirect_uris: ['https://ansible.freesewing.eu/api/auth/oidc/freesewing/redirect'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
  if (baseConfig.use.oidc.clients.matrix)
    baseConfig.oidc.provider.clients.push({
      client_id: 'matrix',
      client_secret: process.env['BACKEND_OIDC_CLIENT_MATRIX_SECRET'],
      redirect_uris: ['https://matrix.freesewing.eu/_continuwuity/oidc/complete'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid email profile',
    })
}

// Load local config
const config = postConfig(baseConfig)

// Exporting this stand-alone config
export const website = config.website
export const codeberg = config.codeberg
export const instance = config.instance
export const exports = config.exports
export const imgConfig = config.img
export const getLimits = () => config.limits

const vars = {
  BACKEND_DB_PATH: ['required', 'db.path'],
  BACKEND_PORT: 'optional',
  BACKEND_WEBSITE_DOMAIN: 'optional',
  BACKEND_WEBSITE_SCHEME: 'optional',
  BACKEND_ENC_KEY: ['requiredSecret', 'encryption.key'],
  BACKEND_JWT_KEY: 'optional',
  BACKEND_COOKIE_KEY: 'optional',
  BACKEND_JWT_EXPIRY: 'optional',
  // Feature flags
  BACKEND_ENABLE_CODEBERG: 'optional',
  BACKEND_ENABLE_OPEN_API: 'optional',
  BACKEND_ENABLE_JITSI: 'optional',
  // Email
  BACKEND_SCALEWAY_PROJECT_ID: 'required',
  BACKEND_SCALEWAY_EMAIL_TOKEN: 'requiredSecret',
}

// Vars for Codeberg integration
if (envToBool(process.env.BACKEND_ENABLE_CODEBERG)) {
  vars.BACKEND_CODEBERG_TOKEN = 'requiredSecret'
  vars.BACKEND_CODEBERG_USER = 'optional'
  vars.BACKEND_CODEBERG_USER_NAME = 'optional'
  vars.BACKEND_CODEBERG_USER_EMAIL = 'optional'
}
// Vars for Jitsi integration
if (envToBool(process.env.BACKEND_ENABLE_JITSI)) {
  vars.BACKEND_JITSI_APP_ID = 'required'
  vars.BACKEND_JITSI_SECRET = 'requiredSecret'
}

// Vars for OIDC Provider
if (envToBool(process.env.BACKEND_OIDC_PROVIDER)) {
  vars.BACKEND_OIDC_PROVIDER_CLOUDFLARE_IMAGES_TOKEN = 'requiredSecret'
  vars.BACKEND_TEST_CLOUDFLARE_IMAGES = 'optional'
}

/*
 * This method is how you load the config.
 *
 * It will verify whether whether everyting is setup correctly
 * which is not a given since there's a number of environment
 * variables that need to be set for this backend to function.
 *
 * @param {function|boolean} [transformConfig] - An optional config transformer function
 * @param {boolean} [silent] - Set this to true to silence startup logs (non-JSON logs)
 */
export function verifyConfig(transformConfig = false, silent = false) {
  const emptyString = (input) => {
    if (typeof input === 'string' && input.length > 0) return false
    return true
  }
  const errors = []
  const ok = []

  for (let [key, type] of Object.entries(vars)) {
    let configPath = false
    let val
    if (Array.isArray(type)) [type, configPath] = type
    if (['required', 'requiredSecret'].includes(type)) {
      if (typeof process.env[key] === 'undefined' || emptyString(process.env[key])) {
        // Allow falling back to defaults for required config
        if (configPath) val = get(config, configPath)
        if (typeof val === 'undefined') errors.push(key)
      } else {
        if (configPath) val = get(config, configPath)
        else val = process.env[key]
      }
      if (type === 'requiredSecret')
        ok.push(`🔒 ${chalk.yellow(key)}: ` + chalk.grey('***redacted***'))
      else ok.push(`✅ ${chalk.green(key)}: ${chalk.grey(val)}`)
    } else {
      if (typeof process.env[key] !== 'undefined' && !emptyString(process.env[key])) {
        ok.push(`✅ ${chalk.green(key)}: ${chalk.grey(process.env[key])}`)
      }
    }
  }

  if (!silent) {
    for (const o of ok) console.log(o)
    for (const e of errors) {
      console.log(
        chalk.redBright('Error:'),
        'Required environment variable',
        chalk.redBright(e),
        "is missing. The backend won't start without it.",
        '\n',
        chalk.yellow('See: '),
        chalk.yellow.bold('https://freesewing.dev/reference/backend'),
        '\n'
      )
    }
  } else {
    // Set silent in config
    //config.silent = true
  }

  if (errors.length > 0) {
    console.log(chalk.redBright('Invalid configuration. Stopping here...'))
    return process.exit(1)
  }

  return typeof transformConfig === 'function' ? transformConfig(config) : config
}

/*
 * Generates a random key
 *
 * This is a convenience method, typically used in a scenario where people want
 * to kick the tires by spinning up a Docker container running this backend.
 * The backend won't start without a valid encryption key. So rather than add
 * this roadblock to such users, it will auto-generate an encryption key and
 * write it to disk.
 */
function ensureKey(id = 'encryption', bytes = 64) {
  const filename = `${id}.key`
  console.log(chalk.yellow(`⚠️  No e${id} key provided`))
  let key = false
  try {
    console.log(chalk.dim(`Checking for prior auto-generated ${id} key`))
    key = readFileSync(filename, 'utf-8').trim()
  } catch (err) {
    console.log(chalk.dim(`No prior auto-generated ${id} key found.`))
  }
  if (key) {
    console.log(chalk.green(`✅ Prior ${id} key found.`))
  } else {
    console.log(chalk.green(`✅ Generating new random ${id} key`))
    key = randomString(bytes)
    writeFileSync(filename, key)
  }

  return key
}
