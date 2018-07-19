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
  const storedActiveProcesses = await ProcessSession.findAll({ where: { isActive: true } })
  const processSessionsToClose = findExpiredProcesses(storedActiveProcesses, snapshot)
  await ProcessSession.update({ isActive: false, endTime: new Date }, { where: { id: processSessionsToClose } })
}

const findExpiredProcesses = (storedActiveProcesses, currentSnapshot) => {
  return storedActiveProcesses.map((sap => {
    if (isStoredProcessNotInSnapshot(sap, currentSnapshot)) return sap.id
  }))
}

const isStoredProcessNotInSnapshot = (storedProcess, snapshot) => {
  return snapshot.filter((snapshotProcess) =>
    storedProcess.pidName === (snapshotProcess.pid + snapshotProcess.name) &&
    storedProcess.startTime.getTime() === snapshotProcess.starttime.getTime()).length == 0
}

const resolveExpiredProgramSessions = async (ProgramSession) => {
  const storedActivePrograms = await ProgramSession.findAll({ where: { isActive: true } })
  for (const programSession of storedActivePrograms) {
    const constituentProcesses = await programSession.getProcessSessions({ where: { isActive: true } })
    if (constituentProcesses.length === 0) {
      const endTime = new Date
      const duration = endTime - programSession.startTime
      await programSession.update({ isActive: false, endTime, duration })
    }
  }
}

const saveSnapshot = async (pollingClient, db) => {
  const fields = ['pid', 'name', 'path', 'starttime']
  try {
    const processSnapshot = await pollingClient.snapshot(fields)
    await recordSnapshot(db, processSnapshot)
    await resolveExpiredProcessSessions(db.ProcessSession, processSnapshot)
    await resolveExpiredProgramSessions(db.ProgramSession)
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
