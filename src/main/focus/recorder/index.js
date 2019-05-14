const logger = require('../../../logger')('[RECORDER]')

const newFocusTransaction = (focusChangeEvent, database, n) => () => database.sequelize.transaction(async transaction => {
  const { pid, path, exeName, timestamp } = focusChangeEvent
  const [program] = await database.Program.findCreateFind({ where: { exeName } }, { transaction })
  const newSession = {
    pid,
    path,
    exeName,
    isActive: true,
    startTime: timestamp,
    ProgramId: program.id
  }
  return await database.FocusSession.create(newSession, { transaction })
})
  .then(focusSession => logger.info(`Saved new focus event #${n} for ${focusSession.exeName}`))
  .catch(e => logger.error('Failed to save new focus, transaction rolled back:', e))

const endCurrentFocusTransaction = (timestamp, database) => () => database.sequelize.transaction(async (transaction) => {
  const [currentSession] = await database.FocusSession.findAll({ where: { isActive: true } })
  if (currentSession) {
    const duration = timestamp - currentSession.startTime
    await currentSession.update({ isActive: false, endTime: timestamp, duration: duration }, { transaction })
    const program = await currentSession.getProgram()
    await program.update({ focusTime: program.focusTime + duration }, { transaction })
    return `Ended current focus on ${program.exeName}`
  }
  return 'No active focus found to close'
})
  .then(logger.info)
  .catch(e => logger.error('Failed to save focus end, transaction rolled back:', e))

module.exports = (enqueue) => {
  const startRecorder = (database, focusListener) => {
    let shutdown = false
    let counter = 0
    focusListener.listener.on('data', (focusChangeEvent) => {
      if (shutdown) return
      const n = ++counter
      logger.info(`Detected focus change #${n}: ${focusChangeEvent.exeName}`)

      enqueue(endCurrentFocusTransaction(focusChangeEvent.timestamp, database))
      enqueue(newFocusTransaction(focusChangeEvent, database, n))
    })

    return () => {
      shutdown = true
      logger.info('Shutting down recorder...')
      return Promise.all([
        focusListener.end(),
        enqueue(endCurrentFocusTransaction(Date.now(), database)),
      ]).catch(e => logger.error('Error on shutdown:', e))
    }
  }

  const saveInitialFocus = async (database, pollFocus) => {
    let activeFocus
    try {
      logger.info('Polling for current focus...')
      activeFocus = await pollFocus()
      return enqueue(newFocusTransaction(activeFocus, database, 0))
    } catch (error) {
      logger.error('Unable to record initial focus:', error)
    }
  }

  return {
    startRecorder,
    saveInitialFocus,
  }
}
