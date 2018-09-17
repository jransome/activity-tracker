const { EventEmitter } = require('events')

class MockListener extends EventEmitter {
  setMockEvents(mockEvents) {
    this.mockEvents = mockEvents
  }

  emitEvents() {
    this.mockEvents.forEach(trace => {
      this.emit('listener-event', trace)
    })
  }
}

module.exports = MockListener
