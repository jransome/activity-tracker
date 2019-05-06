const queue = require('async/queue')

const pollFocus = require('./pollFocus')
const focusListener = require('./focusListener')
const FocusRecorder = require('./FocusRecorder')

const dbJobQueue = queue(async task => await task())

module.exports = (dbModels) => new FocusRecorder(pollFocus, focusListener, dbJobQueue, dbModels)
