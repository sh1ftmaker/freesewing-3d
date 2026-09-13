export function InfoController() {}

/*
 * Get the user count
 */
InfoController.prototype.getUserCount = async (req, res, tools) => {
  let result = { errors: ['Failed to run query'] }

  try {
    result = await tools.prisma.user.count()
  } catch (err) {
    tools.log.error(`Failed to get user count: ${err.message}`)
  }

  return result?.errors ? res.status(500).send(result) : res.send({ users: result })
}

/*
 * Get the stats count
 */
InfoController.prototype.getStats = async (req, res, tools) => {
  const stats = { activity: {} }

  /*
   * Any error and we bail
   */
  let error = false

  /*
   * Get simple counts
   */
  let result
  for (const model of [
    'user',
    'pattern',
    'bookmark',
    'set',
    'curatedSet',
    'apikey',
    'subscriber',
  ]) {
    try {
      result = await tools.prisma[model].count()
      stats[model] = result
    } catch (err) {
      tools.log.error(`Failed to get ${model} count: ${err.message}`)
      error = err
    }
  }

  /*
   * Update subscriber count with subscribed users
   */
  let users
  try {
    users = await tools.prisma.user.count({ where: { newsletter: true } })
    stats.subscriber += users
  } catch (err) {
    tools.log.error(`Failed to get user count: ${err.message}`)
    error = err
  }

  /*
   * Count designs
   */
  let designs
  try {
    designs = await tools.prisma.pattern.groupBy({
      by: ['design'],
      _count: {
        design: true,
      },
      orderBy: {
        _count: { design: 'desc' },
      },
    })
    stats.designs = {}
    for (const d of designs) stats.designs[d.design] = d._count.design
  } catch (err) {
    tools.log.error(`Failed to get per-design count: ${err.message}`)
    error = err
  }

  /*
   * Count connections via jwt
   */
  let jwt
  try {
    jwt = await tools.prisma.user.aggregate({
      _sum: { jwtCalls: true },
      orderBy: { jwtCalls: 'desc' },
    })
    stats.activity.jwt = jwt._sum.jwtCalls
  } catch (err) {
    tools.log.error(`Failed to get JWT connection count: ${err.message}`)
    error = err
  }

  /*
   * Count connections via key
   */
  let key
  try {
    key = await tools.prisma.user.aggregate({
      _sum: { keyCalls: true },
      orderBy: { keyCalls: 'desc' },
    })
    stats.activity.key = key._sum.keyCalls
  } catch (err) {
    tools.log.error(`Failed to get KEY connection count: ${err.message}`)
    error = err
  }

  return error ? res.status(500).send({ errors: ['Failed to run query'] }) : res.send(stats)
}

/*
 * Get info on authors
 */
InfoController.prototype.getAuthorInfo = async (req, res, tools) => {
  let result = { errors: ['Failed to run query'] }

  /*
   * Load all authors from the database
   */
  try {
    result = await tools.prisma.user.findMany({
      where: { author: { equals: true } },
      limit: 500,
    })
  } catch (err) {
    tools.log.error(`Failed to get author info: ${err.message}`)
  }

  if (result.errors) return res.status(500).send(result)

  // Create a uuid => username lookup object
  const authors = {}
  for (const author of result) authors[author.uuid] = author.username

  return res.send(authors)
}

/*
 * Get info on moderators
 */
InfoController.prototype.getModeratorInfo = async (req, res, tools) => {
  let result = { errors: ['Failed to run query'] }

  /*
   * Load all moderators from the database
   */
  try {
    result = await tools.prisma.user.findMany({
      where: { role: { in: ['admin', 'support', 'moderator'] } },
      limit: 500,
    })
  } catch (err) {
    tools.log.error(`Failed to get moderator info: ${err.message}`)
  }

  if (result.errors) return res.status(500).send(result)

  // Create a uuid => username lookup object
  const moderators = {}
  for (const mod of result) moderators[mod.uuid] = mod.username

  return res.send(moderators)
}
