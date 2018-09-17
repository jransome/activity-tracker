const { EventEmitter } = require('events')

module.exports = class ProcessRecorder extends EventEmitter {
  constructor(processPoller, processListener, dbJobQueue, dbConnection) {
    super()
    this.pollProcesses = processPoller
    this.dbConnection = dbConnection
    this.isRecording = false
    this.shuttingDown = false
    this.shutdownPromise = null
    this.jobQueue = dbJobQueue

    processListener.on('process-event', (processEvent) => {
      if (processEvent.exeName === 'git.exe' || processEvent.exeName === 'conhost.exe') return// TO DELETE
      if (this.isRecording && !this.shuttingDown) this._enqueueTraceUpdate(processEvent)
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

  _enqueueTraceUpdate(processEvent) {
    return new Promise(resolve => { // <= used only for testing :/
      console.log('enqueuing TRACE_UPDATE for', processEvent.exeName, processEvent.type)
      const updateTask = async () => await this._traceRecorder(processEvent)
      this.jobQueue.push(updateTask, () => console.log('processed trace event:', processEvent.type, processEvent.exeName) || resolve())
    })
  }

  async _traceRecorder({ type, pid, exeName, timeStamp }) {
    const { Program, ProgramSession, ProcessSession } = this.dbConnection

    if (type === "startTrace") {
      console.log('start trace detected for:', exeName)
      const [program] = await Program.findCreateFind({ where: { exeName: exeName } })
      await program.update({ isActive: true })

      const [programSession] = await ProgramSession.findCreateFind({
        where: {
          isActive: true,
          ProgramId: program.id,
        },
        defaults: { startTime: timeStamp }
      })

      await ProcessSession.create({
        pid: pid,
        exeName: exeName,
        isActive: true,
        ProgramId: program.id,
        ProgramSessionId: programSession.id,
        startTime: timeStamp,
      })
    }
    else if (type === "stopTrace") {
      console.log('stop trace detected for:', exeName)
      try {
        const rowsUpdated = await ProcessSession.update(
          { isActive: false, endTime: timeStamp },
          { where: { pid, exeName: exeName, isActive: true } }
        )
        if (rowsUpdated === 0) throw new Error('Stop trace received for unrecorded process session: ' + exeName)
        if (rowsUpdated > 1) throw new Error('Duplicate process sessions updated on stop trace: ' + exeName)

        const program = await Program.findOne({ where: { exeName: exeName } })
        if (!program) throw new Error('Stop trace received for unrecorded program: ' + exeName)

        const remainingSessions = await program.getProcessSessions({ where: { isActive: true } })

        if (remainingSessions.length > 0) return

        const [programSession] = await program.getProgramSessions({ where: { isActive: true } })
        const duration = timeStamp - programSession.startTime
        await programSession.update({ isActive: false, endTime: timeStamp, duration })
        await program.update({ upTime: program.upTime += duration })
        console.log('Last process session for ' + exeName + ' finished')
      } catch (error) {
        console.log('='.repeat(50))
        console.error('ERROR:', error)
        console.log('='.repeat(50))
      }
    }
  }

  _enqueueSnapshot() { //TODO pull out enqueuing logic
    console.log('enqueuing SNAPSHOT')
    return new Promise(resolve => { // <= used only for testing :/
      const snapshotTask = async () => {
        const snapshot = await this.pollProcesses()
        try {
          await this._recordSnapshot(snapshot)
        } catch (error) {
          console.log(error)
        }
      }
      this.jobQueue.push(snapshotTask, () => console.log('processed initial snapshot') || resolve())
    })
  }

  async _recordSnapshot({snapshot, timestamp}) {
    const { Program, ProgramSession, ProcessSession } = this.dbConnection
    for (const snapshottedProcess of snapshot) {
      const [program] = await Program.findCreateFind({
        where: { exeName: snapshottedProcess.name }
      })
     await program.update({ isActive: true })

      const [programSession] = await ProgramSession.findCreateFind({
        where: {
          isActive: true,
          ProgramId: program.id,
        },
        defaults: { startTime: timestamp }
      })

      await ProcessSession.create({
        pid: snapshottedProcess.pid,
        exeName: snapshottedProcess.name,
        isActive: true,
        ProgramId: program.id,
        ProgramSessionId: programSession.id,
        startTime: timestamp,
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
      this.jobQueue.push(stopRecordingTask, () => {
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
