const { EventEmitter } = require('events')
const queue = require('async/queue')

const pollProcesses = require('../process/pollProcesses')
const processListener = require('../process/processListener')
const ProcessRecorder = require('../process/ProcessRecorder')

const pollFocus = require('../focus/pollFocus')
const focusListener = require('../focus/focusListener')
const FocusRecorder = require('../focus/FocusRecorder')

const FOCUS_RECORDER = 'FOCUS_RECORDER'
const PROCESS_RECORDER = 'PROCESS_RECORDER'

const RECORDING_MODES = {
  FOCUS_ONLY: [FOCUS_RECORDER],
  PROCESS_ONLY: [PROCESS_RECORDER],
  FOCUS_AND_PROCESS: [FOCUS_RECORDER, PROCESS_RECORDER],
}

class MainRecorder extends EventEmitter {
  constructor(models) {
    super()
    const dbJobQueue = queue(async task => await task())

    this[FOCUS_RECORDER] = new FocusRecorder(pollFocus, focusListener, dbJobQueue, models)
    this[FOCUS_RECORDER].on('log', log => this.emit('focus-recorder-log', log))

    this[PROCESS_RECORDER] = new ProcessRecorder(pollProcesses, processListener, dbJobQueue, models)
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
