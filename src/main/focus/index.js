const queueFactory = require('../queue')
const listenerFactory = require('./listener')
const pollFocus = require('./poll')
const recorder = require('./recorder')(queueFactory())

module.exports = async (dbConnection) => {
    await recorder.saveInitialFocus(dbConnection, pollFocus)
    const stopRecording = recorder.startRecorder(dbConnection, listenerFactory())
    return { stopRecording }
}
