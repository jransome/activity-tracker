const path = require('path')
const PowershellProcess = require('../PowershellProcess')

module.exports = () => new Promise((resolve, reject) => {
  const args = ['-ExecutionPolicy', 'Unrestricted']
  const psScriptsDir = path.resolve(__dirname, '../../powershell/focus')
  const pollingScript = `${psScriptsDir}/get-current-focus.ps1 \n`

  try {
    psProc = new PowershellProcess(args, pollingScript)
    
    psProc.on('data', data => {
      try {
        const event = JSON.parse(data)
        event.exeName = event.path.trim().split("/").slice(-1)[0]
        event.timestamp = new Date()
        resolve(event)
        psProc.close()
      } catch (error) {
        // console.log('Non JSON PS output handled')
      }
    })
    
    psProc.executeStartScript()
  } catch (error) {
    console.log('focus poller error', error) // TODO.
    reject(error)
  }
})
