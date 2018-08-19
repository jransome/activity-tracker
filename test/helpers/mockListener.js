import { EventEmitter } from 'events'

export default class MockListener extends EventEmitter {
  setMockTraces(mockTraceEvents) {
    this.mockTraceEvents = mockTraceEvents
  }

  emitTraces() {
    this.mockTraceEvents.forEach(trace => {
      this.emit('process-event', trace)
    })
  }
}
