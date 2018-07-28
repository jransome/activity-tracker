import queue from 'async/queue'
import { EventEmitter } from 'events'

const recordSnapshot = async ({ Program, ProgramSession, ProcessSession }, batch, now) => {
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
        startTime: now,
      }
    })
    await ProcessSession.findCreateFind({
      where: {
        pid: snapshottedProcess.pid,
        pidName: snapshottedProcess.pid + snapshottedProcess.name,
        isActive: true,
        ProgramId: recordedProgram.id,
        ProgramSessionId: recordedProgramSession.id
      },
      defaults: {
        startTime: now,
      }
    })
  }
}

const resolveExpiredProcessSessions = async (ProcessSession, snapshot, now) => {
  const storedActiveProcesses = await ProcessSession.findAll({ where: { isActive: true } })
  const processSessionsToClose = findExpiredProcesses(storedActiveProcesses, snapshot)
  await ProcessSession.update({ isActive: false, endTime: now }, { where: { id: processSessionsToClose } })
}

const findExpiredProcesses = (storedActiveProcesses, currentSnapshot) => {
  return storedActiveProcesses.map((sap => {
    if (isStoredProcessNotInSnapshot(sap, currentSnapshot)) return sap.id
  }))
}

const isStoredProcessNotInSnapshot = (storedProcess, snapshot) => {
  return snapshot.filter((snapshotProcess) =>
    storedProcess.pidName === (snapshotProcess.pid + snapshotProcess.name)// &&
    // storedProcess.startTime.getTime() === snapshotProcess.starttime.getTime()
  ).length == 0
}

const resolveExpiredProgramSessions = async (ProgramSession, now) => {
  const storedActivePrograms = await ProgramSession.findAll({ where: { isActive: true } })
  for (const programSession of storedActivePrograms) {
    const constituentProcesses = await programSession.getProcessSessions({ where: { isActive: true } })
    if (constituentProcesses.length === 0) {
      await endProgramSession(programSession, now)
    }
  }
}

const endProgramSession = async (session, now) => {
  const duration = now - session.startTime
  await session.update({ isActive: false, endTime: now, duration })
  const program = await session.getProgram()
  await program.update({ upTime: program.upTime += duration })
}

const updateActivity = async (pollingClient, db) => {
  const fields = ['pid', 'name', 'path']
  const timeStamp = new Date()
  try {
    console.time('take snapshot')
    const processSnapshot = await pollingClient.snapshot(fields)
    console.timeEnd('take snapshot')

    console.time('record snapshot')
    await recordSnapshot(db, processSnapshot, timeStamp)
    console.timeEnd('record snapshot')

    console.time('resolve processes')
    await resolveExpiredProcessSessions(db.ProcessSession, processSnapshot, timeStamp)
    console.timeEnd('resolve processes')

    console.time('resolve PROGRAM')
    await resolveExpiredProgramSessions(db.ProgramSession, timeStamp)
    console.timeEnd('resolve PROGRAM')

  } catch (error) {
    console.log(error)
  }
}

const closeAllSessions = async ({ ProgramSession, ProcessSession }) => {
  const shutdownDate = new Date
  await ProcessSession.update({ isActive: false, endTime: shutdownDate }, { where: { isActive: true } })
  await resolveExpiredProgramSessions(ProgramSession, shutdownDate)
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
      this.isRecording = true
      this.snapshotScheduler = setInterval(() => this.scheduleSnapshot(), this.interval)
    }
  }

  async stopRecording() {
    try {
      this.clearSnapshotScheduler()
      await this.executeStop()
      this.stoppedRecording()
    } catch (e) {
      console.log('Error on stopping recording', e)
    }
  }

  scheduleSnapshot() {
    if (!this.isRecording) return
    this.snapshotCounter++
    const currentSnapshot = this.snapshotCounter //temp for logging
    const snapshotTask = async () => await updateActivity(this.pollingClient, this.dbConnection)
    console.log('enqueuing snapshot ' + this.snapshotCounter)
    this.snapshotQueue.push(snapshotTask, () => console.log(`processed snapshot ${currentSnapshot}`))
  }

  async executeStop() {
    console.log('enqueuing SHUTDOWN')
    const stopRecordingTask = async () => await closeAllSessions(this.dbConnection)
    return new Promise((resolve) => {
      this.snapshotQueue.unshift(stopRecordingTask, () => {
        resolve()
      })
    })
  }

  stoppedRecording() {
    this.snapshotQueue.kill()
    this.isRecording = false
    console.log('processed SHUTDOWN')
    this.emit('stopped recording')
  }

  clearSnapshotScheduler() {
    if (this.snapshotScheduler) clearInterval(this.snapshotScheduler)
  }

  checkDbNotUnfinalised() {
    //TODO: check database on startup to make sure no sessions were left open (ie. application was shutdown correctly)
  }

  async manualUpdateActivity() {
    await updateActivity(this.pollingClient, this.dbConnection)
  }
}
