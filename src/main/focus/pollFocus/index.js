const path = require('path')
const PowershellProcess = require('../../PowershellProcess')

module.exports = () => new Promise((resolve, reject) => {
  const psArgs = ['-ExecutionPolicy', 'Unrestricted']
  const pollingScript = `${path.resolve(__dirname, './get-current-focus.ps1')} \n`

  const dataHandler = data => {
    try {
      const event = JSON.parse(data)
      event.exeName = event.path.trim().split("/").slice(-1)[0]
      event.timestamp = new Date()
      resolve(event)
      psProc.close()
    } catch (error) {
      // console.log('Non JSON PS output handled')
    }
  }
  
  try {
    psProc = new PowershellProcess(dataHandler, psArgs, pollingScript)
    psProc.start()
  } catch (error) {
    console.log('focus poller error', error) // TODO.
    psProc.close()
    reject(error)
  }
})
