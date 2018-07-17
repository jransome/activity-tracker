const recordSnapshot = async ({ Program, Session }, batch) => {
  for (const snapshottedProcess of batch) {
    const [recordedProgram] = await Program.findCreateFind({ where: { name: snapshottedProcess.name } })
    await Session.findCreateFind({
      where: {
        pid: snapshottedProcess.pid,
        pidName: snapshottedProcess.pid + snapshottedProcess.name,
        isActive: true,
        startTime: snapshottedProcess.starttime,
        ProgramId: recordedProgram.id
      }
    })
  }
}

const resolveExpiredSessions = async (Session, snapshot) => {
  const storedActiveSessions = await Session.findAll({ where: { isActive: true } })
  const sessionsToClose = findExpiredSessions(storedActiveSessions, snapshot)
  await Session.update({ isActive: false, endTime: new Date }, { where: { id: sessionsToClose } })
}

const findExpiredSessions = (storedActiveSessions, currentSnapshot) => {
  return storedActiveSessions.map((sas => {
    if (isStoredSessionNotInSnapshot(sas, currentSnapshot)) return sas.id
  }))
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

export default saveSnapshot
