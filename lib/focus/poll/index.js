const path = require('path')
const logger = require('../../logger')('[POLL]')
const Powershell = require('../../Powershell')

const POLL_TIMEOUT_MS = 10000

const pollTimeout = new Promise((resolve, reject) => setTimeout(() => reject(`Poll timed out after ${POLL_TIMEOUT_MS}ms`), POLL_TIMEOUT_MS))

const tryJsonParse = (data) => {
  let json = null
  try {
    json = JSON.parse(data)
  } catch (error) {
    throw Object.assign(error, { isJsonError: true })
  }
  return json
}

const dataHandler = (data) => {
  try {
    const event = tryJsonParse(data)
    event.exeName = event.path.trim().split('/').slice(-1)[0]
    event.startTime = new Date()
    return event
  } catch (error) {
    if (error.isJsonError) logger.debug('Non JSON PS output handled in poll focus:', data.trim())
    else logger.error('Error on polling:', JSON.stringify(error, null, 2))
  }
}

module.exports = () => Promise.race([pollTimeout, new Promise((resolve, reject) => {
  const pollingScript = `${path.resolve(__dirname, './get-current-focus.ps1')} \n`
  const psArgs = ['-ExecutionPolicy', 'Unrestricted']
  const psProc = new Powershell(psArgs, pollingScript)
  
  psProc.on('data', async (data) => {
    const polled = dataHandler(data)
    if (polled) {
      logger.debug(`Found current focus: ${polleds.exeName}`)
      await psProc.end()
      logger.debug('Ended powershell child process')
      resolve(polled)
    }
  })

  try {
    psProc.start()
  } catch (error) {
    logger.error('Error starting focus poller:', JSON.stringify(error, null, 2))
    reject(error)
  }
})])
