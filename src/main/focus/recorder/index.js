const logger = require('../../../logger')('[RECORDER]')

const newFocusTransaction = (focusSession, database) => () => database.sequelize.transaction(async transaction => {
  const [program] = await database.Program.findOrCreate({ where: { exeName: focusSession.exeName }, defaults: { focusTime: 0 }, transaction })
  await program.update({ focusTime: program.focusTime + focusSession.duration }, { transaction })
  focusSession.ProgramId = program.id
  return await database.FocusSession.create(focusSession, { transaction })
})
  .then(focusSession => logger.info(`Saved focus session for ${focusSession.exeName}`))
  .catch(e => logger.error('Failed to save focus, transaction rolled back:', e))

const pollCurrentFocus = async (poller) => {
  let current = null
  try {
    logger.info('Polling for current focus...')
    current = await poller()
    current.startTime = new Date()
    logger.info('Initial focus found:', current.exeName)
  } catch (error) {
    logger.error('Unable to record initial focus:', error)
  }
  return current
}

module.exports = (enqueue) => {
  return async (database, poller, focusListener) => {
    let shutdown = false
    let counter = 0
    let currentFocus = await pollCurrentFocus(poller)

    logger.info('Recording focus changes...')
    focusListener.listener.on('data', (focusChangeEvent) => {
      if (shutdown || (currentFocus && currentFocus.exeName === focusChangeEvent.exeName)) return
      const now = new Date()
      logger.info(`Detected focus change #${++counter}: ${focusChangeEvent.exeName}`)

      if (currentFocus) enqueue(newFocusTransaction({ ...currentFocus, duration: now - currentFocus.startTime }, database))

      currentFocus = {
        pid: focusChangeEvent.pid,
        path: focusChangeEvent.path,
        exeName: focusChangeEvent.exeName,
        startTime: now,
      }
    })

    return () => {
      shutdown = true
      logger.info('Shutting down recorder...')
      return Promise.all([
        focusListener.end(),
        currentFocus ? enqueue(newFocusTransaction({ ...currentFocus, duration: new Date() - currentFocus.startTime }, database)) : Promise.resolve(),
      ]).catch(e => logger.error('Error on shutdown:', e))
    }
  }
}
