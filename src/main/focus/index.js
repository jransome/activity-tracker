const queueFactory = require('../queue')
const listenerFactory = require('./listener')
const pollFocus = require('./poll')
const startRecorder = require('./recorder')(queueFactory())

module.exports = async (dbConnection) => {
  const stopRecording = await startRecorder(dbConnection, pollFocus, listenerFactory())
  return { stopRecording }
}
