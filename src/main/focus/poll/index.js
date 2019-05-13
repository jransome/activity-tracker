const path = require('path')
const Powershell = require('../../Powershell')

module.exports = () => new Promise((resolve, reject) => {
  let psProc
  const psArgs = ['-ExecutionPolicy', 'Unrestricted']
  const pollingScript = `${path.resolve(__dirname, './get-current-focus.ps1')} \n`

  const dataHandler = (data) => {
    try {
      const event = JSON.parse(data)
      event.exeName = event.path.trim().split("/").slice(-1)[0]
      event.timestamp = new Date()
      psProc.end()
      resolve(event)
    } catch (error) {
      console.warn('[POLL] Non JSON PS output handled in poll focus')
    }
  }
  
  try {
    psProc = new Powershell(psArgs, pollingScript, null, dataHandler)
    psProc.start()
  } catch (error) {
    console.error('[POLL] focus poller error', error)
    reject(error)
  }
})