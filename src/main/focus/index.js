const pollFocus = require('./poll')
const listenerFactory = require('./listener')
const recorder = require('./recorder')

module.exports = (dbConnection) => {
    recorder.saveInitialFocus(dbConnection, pollFocus)
    const stopRecording = recorder.startRecorder(dbConnection, listenerFactory())
    return { stopRecording }
}
