import { EventEmitter } from 'events'

export default class FocusRecorder extends EventEmitter {
  constructor(focusPoller, focusListener, dbJobQueue, dbConnection) {
    super()
    this.getActiveWindow = focusPoller
    this.dbConnection = dbConnection
    this.isRecording = false
    this.shuttingDown = false
    this.shutdownPromise = null
    this.activeSessionCache = null
    this.jobQueue = dbJobQueue

    focusListener.on('listener-event', (focusChangeEvent) => {
      if (this.isRecording && !this.shuttingDown) this._enqueueFocusUpdate(focusChangeEvent)
    })
  }

  async startRecording() {
    if (!this.isRecording) {
      this.isRecording = true
      this._enqueueCheckDbClosedGracefully()
      //   this._enqueueSnapshot()
    }
  }

  async stopRecording() {
    if (!this.isRecording) return
    if (!this.shuttingDown) {
      try {
        this.shuttingDown = true
        this.shutdownPromise = this._triggerShutdown()
        await this.shutdownPromise
        this.shuttingDown = false
        this.isRecording = false
        this.emit('stopped_recording')
        console.log('processed SHUTDOWN')
      }
      catch (e) {
        console.log('Error on stopping recording', e)
      }
    }
    return this.shutdownPromise
  }

  // 'private'

  _enqueueFocusUpdate(focusEvent) { // TODO: error handling on push
    return new Promise(resolve => { // <= used only for testing :/
      console.log('enqueuing FOCUS_UPDATE for', focusEvent.processName)
      const updateTask = async () => await this._recordFocusChange(focusEvent)
      this.jobQueue.push(updateTask, (err) => console.log('processed focus change event:', err, focusEvent.processName) || resolve())
    })
  }

  async _recordFocusChange(focusChangeEvent) {
    const { pid, processName, timestamp } = focusChangeEvent
    if (this.activeSessionCache !== null &&
      this.activeSessionCache.pid === pid &&
      this.activeSessionCache.processName === processName) return

    await this._closeActiveSession(timestamp)
    await this._saveNewFocus(focusChangeEvent)
  }

  async _saveNewFocus({ pid, path, processName, timestamp }) {
    const { Program, FocusSession } = this.dbConnection
    const [program] = await Program.findCreateFind({ where: { name: processName } })
    const newActiveSession = {
      pid,
      path,
      processName,
      isActive: true,
      startTime: timestamp,
      ProgramId: program.id
    }
    this.activeSessionCache = newActiveSession
    await FocusSession.create(newActiveSession)
  }

  _enqueueSnapshot() { //TODO pull out enqueuing logic
    // console.log('enqueuing SNAPSHOT')
    // return new Promise(resolve => { // <= used only for testing :/
    //   const snapshotTask = async () => {
    //     const snapshot = await this.pollProcesses()
    //     try {
    //       await this._recordSnapshot(snapshot)
    //     } catch (error) {
    //       console.log(error)
    //     }
    //   }
    //   this.jobQueue.push(snapshotTask, () => console.log('processed initial snapshot') || resolve())
    // })
  }

  async _recordSnapshot({ snapshot, timestamp }) {
    // const { Program, ProgramSession, ProcessSession } = this.dbConnection
    // for (const snapshottedProcess of snapshot) {
    //   const [program] = await Program.findCreateFind({
    //     where: { name: snapshottedProcess.name }
    //   })
    //   program.update({ isActive: true })

    //   const [programSession] = await ProgramSession.findCreateFind({
    //     where: {
    //       isActive: true,
    //       ProgramId: program.id,
    //     },
    //     defaults: { startTime: timestamp }
    //   })

    //   await ProcessSession.create({
    //     pid: snapshottedProcess.pid,
    //     name: snapshottedProcess.name,
    //     isActive: true,
    //     ProgramId: program.id,
    //     ProgramSessionId: programSession.id,
    //     startTime: timestamp,
    //   })
    // }
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
    const stopRecordingTask = async () => await this._closeActiveSession()
    return new Promise((resolve) => {
      this.jobQueue.push(stopRecordingTask, () => {
        this.jobQueue.kill()
        resolve()
      })
    })
  }

  async _closeActiveSession(timestamp = new Date()) {
    const { FocusSession } = this.dbConnection
    const activeFocusSession = await FocusSession.findOne({ where: { isActive: true } })

    if (activeFocusSession) {
      const duration = timestamp - activeFocusSession.startTime
      await activeFocusSession.update({ isActive: false, endTime: timestamp, duration: duration })
      const program = await activeFocusSession.getProgram()
      await program.update({ focusTime: program.focusTime + duration })
    }
  }
}
