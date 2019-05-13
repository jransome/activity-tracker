const dbErrorHandler = (e) => console.error('Error processing database task:', e)

let jobQueue = Promise.resolve()
const enqueue = (task) => {
  jobQueue = jobQueue.then(async () => await task()).catch(dbErrorHandler)
  return jobQueue
}

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
  .then(focusSession => console.log(`Saved new focus event #${n} for ${focusSession.exeName}`))
  .catch(e => console.log('Failed to save new focus, transaction rolled back:', e))

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
  .then(console.log)
  .catch(e => console.log('Failed to save focus end, transaction rolled back:', e))

const startRecorder = (database, focusListener) => {
  let shutdown = false
  let counter = 0
  focusListener.listener.on('data', (focusChangeEvent) => {
    if (shutdown) return
    const n = ++counter
    console.log(`Detected focus change #${n}: ${focusChangeEvent.exeName}`)

    enqueue(endCurrentFocusTransaction(focusChangeEvent.timestamp, database))
    enqueue(newFocusTransaction(focusChangeEvent, database, n))
  })

  return () => {
    shutdown = true
    console.log('shutting down recorder')
    return Promise.all([
      focusListener.end(),
      enqueue(endCurrentFocusTransaction(Date.now(), database)),
    ])
  }
}

const saveInitialFocus = async (database, pollFocus) => {
  console.log('Polling for current focus...')
  const activeFocus = await pollFocus()
  return enqueue(newFocusTransaction(activeFocus, database, 0))
}

module.exports = {
  startRecorder,
  saveInitialFocus,
}
