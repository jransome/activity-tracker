import pollProcesses from '../pollProcesses'
import ProcessListener from '../ProcessListener'
import ProcessRecorder from '../ProcessRecorder'

import pollFocus from '../pollFocus'
import FocusListener from '../FocusListener'
import FocusRecorder from '../FocusRecorder'

import queue from 'async/queue'

const FOCUS_RECORDER = 'FOCUS_RECORDER'
const PROCESS_RECORDER = 'PROCESS_RECORDER'

export const RECORDING_MODES = {
  FOCUS_ONLY: [FOCUS_RECORDER],
  PROCESS_ONLY: [PROCESS_RECORDER],
  FOCUS_AND_PROCESS: [FOCUS_RECORDER, PROCESS_RECORDER],
}

export default class MainRecorder {
  constructor(dbConnection) {
    const dbJobQueue = queue(async task => await task())

    this.focusListener = new FocusListener()
    this[FOCUS_RECORDER] = new FocusRecorder(pollFocus, this.focusListener, dbJobQueue, dbConnection)

    this.processListener = new ProcessListener()
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
