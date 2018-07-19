const recordSnapshot = async ({ Program, ProgramSession, ProcessSession }, batch) => {
  for (const snapshottedProcess of batch) {
    const [recordedProgram] = await Program.findCreateFind({
      where: {
        name: snapshottedProcess.name
      }
    })
    const [recordedProgramSession] = await ProgramSession.findCreateFind({
      where: {
        isActive: true,
        ProgramId: recordedProgram.id,
      },
      defaults: {
        startTime: snapshottedProcess.starttime,
      }
    })
    await ProcessSession.findCreateFind({
      where: {
        pid: snapshottedProcess.pid,
        pidName: snapshottedProcess.pid + snapshottedProcess.name,
        isActive: true,
        startTime: snapshottedProcess.starttime,
        ProgramId: recordedProgram.id,
        ProgramSessionId: recordedProgramSession.id
      }
    })
  }
}

const resolveExpiredProcessSessions = async (ProcessSession, snapshot) => {
  const storedActiveSessions = await ProcessSession.findAll({ where: { isActive: true } })
  const sessionsToClose = findExpiredSessions(storedActiveSessions, snapshot)
  await ProcessSession.update({ isActive: false, endTime: new Date }, { where: { id: sessionsToClose } })
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

const saveSnapshot = async (pollingClient, db) => {
  const fields = ['pid', 'name', 'path', 'starttime']
  try {
    const processSnapshot = await pollingClient.snapshot(fields)
    await recordSnapshot(db, processSnapshot)
    await resolveExpiredProcessSessions(db.ProcessSession, processSnapshot)
  } catch (error) {
    console.log(error)
  }
}

export default class ProcessRecorder {
  constructor(pollingClient, dbConnection, interval) {
    this.interval = interval
    this.pollingClient = pollingClient
    this.dbConnection = dbConnection
  }

  startRecording() {
    this.tick = setInterval(async () => await this.saveSnapshot(), this.interval)
  }

  stopRecording() {
    if (this.tick) clearInterval(this.tick)
  }

  async saveSnapshot() {
    await saveSnapshot(this.pollingClient, this.dbConnection)
  }
}
