import queue from 'async/queue'
import { EventEmitter } from 'events'

export default class Recorder extends EventEmitter {
  constructor(pollingClient, dbConnection, processListener) {
    super()
    this.pollingClient = pollingClient
    this.dbConnection = dbConnection
    this.processListener = processListener
    this.isRecording = false
    this.shuttingDown = false
    this.shutdownPromise = null
    this.jobQueue = queue(async (task, done) => {
      await task()
      done()
    })
  }

  async startRecording() {
    if (!this.isRecording) {
      this.isRecording = true
      this._enqueueCheckDbClosedGracefully()
      this._enqueueSnapshot()
    }
  }

  async stopRecording() {
    if (this.isRecording) {
      if (!this.shuttingDown) {
        try {
          this.shuttingDown = true
          this.shutdownPromise = this._triggerShutdown()
          await this.shutdownPromise
          this.shuttingDown = false
          this.isRecording = false
          this.emit('stopped_recording')
          console.log('processed SHUTDOWN')
        } catch (e) {
          console.log('Error on stopping recording', e)
        }
      } 
      return this.shutdownPromise
    }
  }

  // 'private'

  _enqueueSnapshot() { //TODO pull out enqueuing logic
    console.log('enqueuing SNAPSHOT')
    const snapshotTask = async () => {
      const fields = ['pid', 'name', 'path'] // TODO: use path?
      const timeStamp = new Date()

      const snapshot = await this.pollingClient.snapshot(fields)
      await this._recordSnapshot(snapshot, timeStamp)
    }
    this.jobQueue.push(snapshotTask, () => console.log('processed initial snapshot'))
  }

  async _recordSnapshot(batch, now) {
    const { Program, ProgramSession, ProcessSession } = this.dbConnection
    for (const snapshottedProcess of batch) {
      const [recordedProgram] = await Program.findCreateFind({
        where: {
          name: snapshottedProcess.name,
        }
      })

      const recordedProgramSession = await ProgramSession.create({
        isActive: true,
        ProgramId: recordedProgram.id,
        startTime: now,
      })

      await ProcessSession.create({
        pid: snapshottedProcess.pid,
        pidName: snapshottedProcess.pid + snapshottedProcess.name,
        isActive: true,
        ProgramId: recordedProgram.id,
        ProgramSessionId: recordedProgramSession.id,
        startTime: now,
      })
    }
  }

  _enqueueCheckDbClosedGracefully() {
    console.log('enqueuing DB_CHECK')
    const dbCheckTask = async () => await this._checkDbClosedGracefully()
    this.jobQueue.push(dbCheckTask, () => console.log('checked db closed gracefully'))
  }

  async _checkDbClosedGracefully() {
    // TODO
    // look at: sequelize logging/sqlite last modified, powershell shutdown timestamp

    // const lastSnapshot = await this.dbConnection.Snapshot.findOne({ order: [['createdAt', 'DESC']], raw: true })

    // if (lastSnapshot) {
    //   const lastSnapshotTime = new Date(lastSnapshot.takenAt)
    //   const extrapolatedShutdownTime = new Date(lastSnapshotTime.getTime() + 1)
    //   await this._closeAllSessions(extrapolatedShutdownTime)
    // }
  }

  _triggerShutdown() {
    console.log('enqueuing SHUTDOWN')
    const stopRecordingTask = async () => await this._closeAllSessions()
    return new Promise((resolve) => {
      this.jobQueue.unshift(stopRecordingTask, () => {
        this.jobQueue.kill()
        resolve()
      })
    })
  }

  async _closeAllSessions(shutdownDate = new Date()) {
    await this.dbConnection.ProcessSession.update({ isActive: false, endTime: shutdownDate }, { where: { isActive: true } })
    await this._closeAllProgramSessions(shutdownDate)
  }

  async _closeAllProgramSessions(shutdownDate) {
    const activePrograms = await this.dbConnection.ProgramSession.findAll({ where: { isActive: true } })
    for (const programSession of activePrograms) {
      const duration = shutdownDate - programSession.startTime
      await programSession.update({ isActive: false, endTime: shutdownDate, duration })
      const program = await programSession.getProgram()
      await program.update({ upTime: program.upTime += duration })
    }
  }
}
