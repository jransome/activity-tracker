const recordSnapshot = ({ Program, Session }, batch) => {
  return batch.reduce((dbQueryChain, currentBatchElem) => {
    return dbQueryChain
      .then(() => Program.findCreateFind({ where: { name: currentBatchElem.name } }))
      .then(([program]) => 
        Session.findCreateFind({ where: { 
          pid: currentBatchElem.pid, 
          pidName: currentBatchElem.pid + currentBatchElem.name, 
          isActive: true, 
          startTime: currentBatchElem.starttime, 
          ProgramId: program.id 
        }})
      )
  }, Promise.resolve())
}

const resolveExpiredSessions = (Session, snapshot) => {
  return Session.findAll({ where: { isActive: true } })
    .then(storedActiveSessions => {
      const sessionsToClose = storedActiveSessions.map((sas => {
        if (isStoredSessionNotInSnapshot(sas, snapshot)) return sas.id
      }))
      Session.update({ isActive: false, endTime: new Date }, { where: { id: sessionsToClose } })
    })
}

const isStoredSessionNotInSnapshot = (storedSession, snapshot) => {
  return snapshot.filter((snapshotSession) => 
    storedSession.pidName === (snapshotSession.pid + snapshotSession.name) &&
    storedSession.startTime.getTime() === snapshotSession.starttime.getTime()).length == 0
}

const saveSnapshot = (poller, db) => async () => {
  const fields = ['pid', 'name', 'path', 'starttime']

  const processSnapshot = await poller.snapshot(fields)
  await recordSnapshot(db, processSnapshot)
  await resolveExpiredSessions(db.Session, processSnapshot)
}

module.exports = saveSnapshot
