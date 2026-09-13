import { InfoController } from '../controllers/info.mjs'

const Info = new InfoController()

export function infoRoutes(tools) {
  const { app, limit } = tools

  // List statistics
  app.get('/info/stats', limit.auth, (req, res) => Info.getStats(req, res, tools))

  // List user count
  app.get('/info/users', limit.auth, (req, res) => Info.getUserCount(req, res, tools))

  /*
   * Get list of authors
   *
   * After the changes we made in Q1 2026, it is no longer possible to fetch
   * info about blog/showcase/newsletter authors, because we've locked that
   * down.
   * However, people who write these posts are OK with their name being
   * associated with it, so we have added and 'author' field to the database.
   * People who have written such posts have that field set to true, and
   * this endpoint will return name/uuid info for them so that their name
   * can be shown, along with avatar and a link to their profile.
   *
   * Note that this does not require auth, this info is public.
   */
  app.get('/info/authors', (req, res) => Info.getAuthorInfo(req, res, tools))

  /*
   * Get list of moderators
   *
   * This maps UUIDs for users with a moderator or higher role (support, admin)
   * to their username. This makes it easier to figure out who moderated what.
   *
   * Note that this does not require auth, this info is public.
   */
  app.get('/info/moderators', (req, res) => Info.getModeratorInfo(req, res, tools))
}
