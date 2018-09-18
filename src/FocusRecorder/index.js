const { EventEmitter } = require('events')

class FocusRecorder extends EventEmitter {
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

  startRecording() {
    if (!this.isRecording) {
      this.isRecording = true
      this._enqueueCheckDbClosedGracefully()
      this._enqueueSnapshot()
    }
  }

  async stopRecording() {
    if (!this.isRecording) return
    if (!this.shuttingDown) {
      try {
        this.shuttingDown = true
        this.shutdownPromise = this._enqueueShutdown()
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

  _enqueue(job, log, cb) {
    return new Promise(resolve => {
      console.log('enqueuing...', log)
      this.jobQueue.push(job, err => {
        if (err) console.error(err, log)
        console.log('processed ', log)
        this.emit('log', 'processed' + log)
        if (cb) cb()
        resolve()
      })
    })
  }

  async _enqueueSnapshot() {
    const snapshotTask = async () => await this._recordSnapshot()
    await this._enqueue(snapshotTask, 'SNAPSHOT')
  }

  async _recordSnapshot() {
    const activeFocus = await this.getActiveWindow()
    await this._saveNewFocus(activeFocus)
  }

  async _enqueueFocusUpdate(focusEvent) {
    const updateTask = async () => await this._recordFocusChange(focusEvent)
    await this._enqueue(updateTask, 'FOCUS_UPDATE for ' + focusEvent.exeName)
  }

  async _recordFocusChange(focusChangeEvent) {
    const { pid, exeName, timestamp } = focusChangeEvent
    if (this.activeSessionCache !== null &&
      this.activeSessionCache.pid === pid &&
      this.activeSessionCache.exeName === exeName) return

    await this._closeActiveSession(timestamp)
    await this._saveNewFocus(focusChangeEvent)
  }

  async _saveNewFocus({ pid, path, exeName, timestamp }) {
    const { Program, FocusSession } = this.dbConnection
    const [program] = await Program.findCreateFind({ where: { exeName: exeName } })
    const newActiveSession = {
      pid,
      path,
      exeName,
      isActive: true,
      startTime: timestamp,
      ProgramId: program.id
    }
    this.activeSessionCache = newActiveSession
    await FocusSession.create(newActiveSession)
  }

  async _enqueueCheckDbClosedGracefully() {
    const dbCheckTask = async () => await this._checkDbClosedGracefully()
    await this._enqueue(dbCheckTask, 'DB_CHECK')
  }

  async _checkDbClosedGracefully() {
    const activeFocusSessions = await this._getActiveSessions()

    if (activeFocusSessions.length > 0) {
      console.log('WARNING: focus tracker was not shutdown properly. Removing unfinished sessions...')
      this.dbConnection.FocusSession.destroy({ where: { isActive: true } })
    }
  }

  async _enqueueShutdown() {
    const stopRecordingTask = async () => await this._closeActiveSession()
    await this._enqueue(stopRecordingTask, 'SHUTDOWN', this.jobQueue.kill)
  }

  async _closeActiveSession(timestamp = new Date()) {
    const [activeFocusSession] = await this._getActiveSessions()

    if (activeFocusSession) {
      const duration = timestamp - activeFocusSession.startTime
      await activeFocusSession.update({ isActive: false, endTime: timestamp, duration: duration })
      const program = await activeFocusSession.getProgram()
      await program.update({ focusTime: program.focusTime + duration })
    }
  }

  async _getActiveSessions() {
    return await this.dbConnection.FocusSession.findAll({ where: { isActive: true } })
  }
}

module.exports = FocusRecorder
