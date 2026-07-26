import { FlowModel } from '../models/flow.mjs'
import { UserModel } from '../models/user.mjs'
import jwt from 'jsonwebtoken'

export function FlowsController() {}

/*
 * Upload an image to Cloudflare
 * See: https://freesewing.dev/reference/backend/api
 */
FlowsController.prototype.uploadImage = async (req, res, tools, anon = false) => {
  const Flow = new FlowModel(tools)
  await Flow.uploadImage(req, anon)

  return Flow.sendResponse(res)
}

/*
 * Remove an image from Cloudflare
 * See: https://freesewing.dev/reference/backend/api
 */
FlowsController.prototype.removeImage = async (req, res, tools) => {
  const Flow = new FlowModel(tools)
  await Flow.removeImage(req)

  return Flow.sendResponse(res)
}

/*
 * Creates a pull request for a new showcase post
 * See: https://freesewing.dev/reference/backend/api
 */
FlowsController.prototype.createPostPr = async (req, res, tools, type) => {
  const Flow = new FlowModel(tools)
  await Flow.createPostPr(req, type)

  return Flow.sendResponse(res)
}

/*
 * Is a blog or showcase slug available?
 *
 * This is the endpoint that verifies whether a blog or showcase slug is available
 * See: https://freesewing.dev/reference/backend/api/apikey
 */
FlowsController.prototype.isSlugAvailable = async (req, res, tools, type) => {
  const Flow = new FlowModel(tools)
  const available = await Flow.isSlugAvailable(req, type)

  if (!available)
    Flow.setResponse(200, false, {
      result: 'success',
      slug: req.params.slug,
      available: false,
    })
  else Flow.setResponse(404)

  return Flow.sendResponse(res)
}

/*
 * Mint a Jitsi token
 *
 * This is the endpoint that enables transparent Jitsi authentication for FreeSewing users
 */
FlowsController.prototype.mintJitsiToken = async (req, res, tools, guest = false) => {
  const Flow = new FlowModel(tools)
  const id = Date.now().toString().slice(-3)
  let moderator = false
  const user = {
    name: `Guest-${id}`,
    email: `guest-${id}@freesewing.eu`,
    moderator: false,
  }
  if (!guest) {
    const User = new UserModel(tools)
    const auth = await User.loadAuthenticatedUser(req.user)
    user.name = auth.authenticatedUser.username
    user.username = auth.authenticatedUser.username
    user.email = `${auth.authenticatedUser.username}@freesewing.eu`
    user.id = auth.authenticatedUser.uuid
    user.avatar = `https://static.freesewing.eu/user/${user.id.slice(0, 1)}/${user.id.slice(0, 2)}/${user.id}.webp`
    if (tools.config.jitsi.moderators.includes(auth.authenticatedUser.uuid)) moderator = true
  }

  const token = jwt.sign(
    {
      context: {
        user: { ...user, moderator },
      },
      aud: tools.config.jitsi.appId,
      iss: tools.config.jitsi.appId,
      sub: 'meet.jitsi',
      room: moderator ? '*' : 'hangout',
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
    },
    tools.config.jitsi.secret,
    { algorithm: 'HS256' }
  )

  Flow.setResponse(200, false, {
    result: 'success',
    token: token,
  })

  return Flow.sendResponse(res)
}
