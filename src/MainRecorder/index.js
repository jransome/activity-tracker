const { EventEmitter } = require('events')
const queue = require('async/queue')

const pollProcesses = require('../pollProcesses')
const ProcessListener = require('../ProcessListener')
const ProcessRecorder = require('../ProcessRecorder')

const focusPoller = require('../pollFocus')
const FocusListener = require('../FocusListener')
const FocusRecorder = require('../FocusRecorder')

const FOCUS_RECORDER = 'FOCUS_RECORDER'
const PROCESS_RECORDER = 'PROCESS_RECORDER'

const RECORDING_MODES = {
  FOCUS_ONLY: [FOCUS_RECORDER],
  PROCESS_ONLY: [PROCESS_RECORDER],
  FOCUS_AND_PROCESS: [FOCUS_RECORDER, PROCESS_RECORDER],
}

class MainRecorder extends EventEmitter {
  constructor(dbConnection, appDir) {
    super()
    const dbJobQueue = queue(async task => await task())

    const pollFocus = focusPoller(appDir)
    this.focusListener = new FocusListener(appDir)
    this[FOCUS_RECORDER] = new FocusRecorder(pollFocus, this.focusListener, dbJobQueue, dbConnection)
    this[FOCUS_RECORDER].on('log', log => this.emit('focus-recorder-log', log))

    this.processListener = new ProcessListener(appDir)
    this[PROCESS_RECORDER] = new ProcessRecorder(pollProcesses, this.processListener, dbJobQueue, dbConnection)
  }

  startRecording(mode) {
    this.mode = mode
    mode.forEach(recordType => {
      this[recordType].startRecording()
    })
  }

  async stopRecording() {
    if (!this.mode) return
    for (const recordType of this.mode) {
      await this[recordType].stopRecording()
    }
  }
}

module.exports = { 
  MainRecorder,
  RECORDING_MODES,
}
