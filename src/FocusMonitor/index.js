// import { spawn } from 'child_process'
// import { EventEmitter } from 'events'

const spawn = require('child_process').spawn
const EventEmitter = require('events').EventEmitter

// export default 
class FocusMonitor extends EventEmitter {
  constructor() {
    super()
    const encoding = 'utf8' // encoding for strings not buffers (as is default)
    const psScriptsDir = './src/powershell'
    const startMonitoringScript = `${psScriptsDir}/focus-monitor-start.ps1 \n`
    this._stopMonitoringScript = `${psScriptsDir}/focus-monitor-stop.ps1 \n`

    const args = ['-ExecutionPolicy', 'Unrestricted']//, '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-']
    this._psProc = spawn('powershell.exe', args)

    if (!this._psProc.pid) throw new Error("Powershell child process did not start")

    this._psProc.on('error', error => {
      throw new Error("ERROR on Powershell child process: " + error)
    })

    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)

    this._psProc.stdin.write(startMonitoringScript, () => this.emit('ready'))

    this._psProc.stdout.on('data', (data) => {
      try {
        const event = JSON.parse(data)
        event.timeStamp = new Date()
        this.emit('focus-change', event)
        // this.emit('focus-change', data)
      } catch (error) {
        console.log('Non JSON PS output handled')
        // console.log(error)
      }
    })

    this._psProc.stderr.on('data', (data) => {
      this.emit('powershell-error', data)
    })
  }

  stop() {
    this._psProc.stdin.write(this._stopMonitoringScript, () => {
      this._psProc.stdin.end()
      console.log('Stopped listening')
    })
  }
}

const fm = new FocusMonitor()

fm.on('powershell-error', (data) => {
    console.log(data)
})

fm.on('focus-change', (data) => {
    console.log('yeah', data)
})
