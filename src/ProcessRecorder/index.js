import queue from 'async/queue'
import { EventEmitter } from 'events'

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

const updateActivity = async (pollingClient, db) => {
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

const closeAllSessions = async ({ ProgramSession, ProcessSession }) => {
  const shutdownDate = new Date
  await ProcessSession.update({ isActive: false, endTime: shutdownDate }, { where: { isActive: true } })
  await resolveExpiredProgramSessions(ProgramSession)
}

// const TESTupdateActivity = () => {
//   console.log('begining snapshot')
//   return new Promise((res) => setTimeout(() => res(), 2000))
// }

// const TESTcloseAllSessions = () => new Promise((res) => setTimeout(() => res(), 200))

export default class ProcessRecorder extends EventEmitter {
  constructor(pollingClient, dbConnection, interval) {
    super()
    this.interval = interval
    this.pollingClient = pollingClient
    this.dbConnection = dbConnection
    this.isRecording = false
    this.snapshotQueue = queue(async (task, done) => {
      await task()
      done()
    })
    this.snapshotCounter = 0
    this.checkDbNotUnfinalised()
  }

  startRecording() {
    if (!this.isRecording) {
      this.snapshotScheduler = setInterval(() => this.scheduleSnapshot(), this.interval)
      this.isRecording = true
    }
  }

  stopRecording() {
    this.clearSnapshotScheduler()
    this.scheduleStopRecording()
  }

  scheduleSnapshot() {
    if (!this.isRecording) return
    this.snapshotCounter++
    const currentSnapshot = this.snapshotCounter
    const snapshotTask = async () => await updateActivity(this.pollingClient, this.dbConnection)
    console.log('enqueuing snapshot ' + this.snapshotCounter)
    this.snapshotQueue.push(snapshotTask, () => console.log(`processed snapshot ${currentSnapshot}`))
  }

  scheduleStopRecording() {
    console.log('enqueuing SHUTDOWN')
    const stopRecordingTask = async () => await closeAllSessions(this.dbConnection)
    this.snapshotQueue.unshift(stopRecordingTask, () => this.stoppedRecording())
  }

  stoppedRecording() {
    this.snapshotQueue.kill()
    this.isRecording = false
    console.log('processed stop')
    this.emit('stopped recording')
  }

  clearSnapshotScheduler() {
    if (this.snapshotScheduler) clearInterval(this.snapshotScheduler)
  }

  checkDbNotUnfinalised() {
    //TODO: check database on startup to make sure no sessions were left open (ie. application was shutdown correctly)
  }
}
