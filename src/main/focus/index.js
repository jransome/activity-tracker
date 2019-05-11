const queue = require('async/queue')

const pollFocus = require('./pollFocus')
const createFocusListener = require('./focusListener')
const FocusRecorder = require('./FocusRecorder')

const dbJobQueue = queue(async task => await task())

module.exports = (dbModels) => new FocusRecorder(pollFocus, createFocusListener(), dbJobQueue, dbModels)
