const { spawn } = require('child_process')
const path = require('path')

module.exports = () => new Promise((resolve, reject) => {
  const encoding = 'utf8' // encoding for strings not buffers (as is default)
  const psScriptsDir = path.resolve(__dirname, '../../powershell/focus')
  const pollingScript = `${psScriptsDir}/get-current-focus.ps1 \n`

  const args = ['-ExecutionPolicy', 'Unrestricted']
  const psProc = spawn('powershell.exe', args)

  if (!psProc.pid) reject("Powershell child process did not start")

  psProc.on('error', error => {
    reject("ERROR on Powershell child process: " + error)
  })

  psProc.stderr.on('data', (data) => {
    reject('poll-focus-powershell-error: ' + data)
  })

  psProc.stdin.setDefaultEncoding(encoding)
  psProc.stdout.setEncoding(encoding)
  psProc.stderr.setEncoding(encoding)

  psProc.stdin.write(pollingScript)

  psProc.stdout.on('data', (data) => {
    try {
      const event = JSON.parse(data)
      event.exeName = event.path.trim().split("/").slice(-1)[0]
      event.timestamp = new Date()
      resolve(event)
      psProc.stdin.end()
    } catch (error) {
      // console.log('Non JSON PS output handled')
    }
  })
})
