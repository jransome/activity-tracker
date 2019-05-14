const path = require('path')
const logger = require('../../../logger')('[POLL]')
const Powershell = require('../../Powershell')

const tryJsonParse = (data) => {
  let json = null
  try {
    json = JSON.parse(data)
  } catch (error) {
    throw Object.assign(error, { jsonError: true })
  }
  return json
}

module.exports = () => new Promise((resolve, reject) => {
  let psProc
  const psArgs = ['-ExecutionPolicy', 'Unrestricted']
  const pollingScript = `${path.resolve(__dirname, './get-current-focus.ps1')} \n`

  const dataHandler = async (data) => {
    try {
      const event = tryJsonParse(data)
      event.exeName = event.path.trim().split('/').slice(-1)[0]
      event.timestamp = new Date()
      await psProc.end()
      logger.debug('Ended powershell child process')
      resolve(event)
    } catch (error) {
      if (error.jsonError) logger.debug('Non JSON PS output handled in poll focus:', data.trim())
      else logger.error('Error on polling:', error)
    }
  }

  try {
    psProc = new Powershell(psArgs, pollingScript, null, dataHandler)
    psProc.start()
  } catch (error) {
    logger.error('Focus poller error:', error)
    reject(error)
  }
})
