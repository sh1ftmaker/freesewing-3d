import { FlowsController } from '../controllers/flows.mjs'

const Flow = new FlowsController()
const jwt = ['jwt', { session: false }]
//const bsc = ['basic', { session: false }]

export function flowsRoutes(tools) {
  const { app, passport } = tools

  /*
   * FIXME: We need to migrate these routes to the new image hosting
  // Upload an image
  app.post('/images/jwt', passport.authenticate(...jwt), (req, res) =>
    Flow.uploadImage(req, res, tools)
  )
  app.post('/images/key', passport.authenticate(...bsc), (req, res) =>
    Flow.uploadImage(req, res, tools)
  )

  // Upload an image
  app.post('/images', passport.authenticate(...jwt), (req, res) =>
    Flow.uploadImage(req, res, tools, true)
  )

  // Remove an image
  app.delete('/images/:id/jwt', passport.authenticate(...jwt), (req, res) =>
    Flow.removeImage(req, res, tools)
  )
  app.delete('/images/:id/key', passport.authenticate(...bsc), (req, res) =>
    Flow.removeImage(req, res, tools)
  )

  // Submit a pull request for a new showcase or blog post
  for (const type of ['blog', 'showcase']) {
    app.post(`/flows/pr/${type}/jwt`, passport.authenticate(...jwt), (req, res) =>
      Flow.createPostPr(req, res, tools, type)
    )
    app.post(`/flows/pr/${type}/key`, passport.authenticate(...bsc), (req, res) =>
      Flow.createPostPr(req, res, tools, type)
    )
  }

  // See if a showcase or blog slug is available
  for (const type of ['showcase', 'blog']) {
    app.get(`/slugs/${type}/:slug/jwt`, passport.authenticate(...jwt), (req, res) =>
      Flow.isSlugAvailable(req, res, tools, type)
    )
    app.get(`/slugs/${type}/:slug/key`, passport.authenticate(...bsc), (req, res) =>
      Flow.isSlugAvailable(req, res, tools, type)
    )
  }
  */

  // Mint a jitsi token as an authenticated user
  app.get(`/token/jitsi/jwt`, passport.authenticate(...jwt), (req, res) =>
    Flow.mintJitsiToken(req, res, tools, false)
  )

  // Mint a jitsi token as guest
  app.get(`/token/jitsi/guest`, (req, res) => Flow.mintJitsiToken(req, res, tools, true))
}
