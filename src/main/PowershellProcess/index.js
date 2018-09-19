const { spawn } = require('child_process')
const { EventEmitter } = require('events')

// TODO: refactor error objects
// class PowershellProcessError extends Error {
//   constructor(psError) {
//     super("")
//     Error.captureStackTrace(this, PowershellProcessError) // Eliminates error constructor from stack trace
//   }
// }

class PowershellProcess extends EventEmitter {
  constructor(args, startScript, stopScript) {
    super()

    this.startScript = startScript
    this.stopScript = stopScript
    this._psProc = spawn('powershell.exe', args)

    if (!this._psProc.pid) {
      throw Object.assign(new Error("Powershell child process did not start"), {
        startScript
      })
    }

    this._psProc.on('error', err => {
      throw Object.assign(new Error("Error on Powershell child process"), {
        psError: err,
        startScript
      })
    })

    this._setEncoding()

    this._psProc.stderr.on('data', (err) => {
      throw Object.assign(new Error("Error in Powershell script execution"), {
        psError: err,
        startScript
      })
    })

    this._psProc.stdout.on('data', data => this.emit('data', data))
  }

  executeStartScript() {
    this._psProc.stdin.write(this.startScript)
  }

  executeStopScript() {
    this._psProc.stdin.write(this.stopScript, () => {
      this.close()
      console.log('Stopped Powershell process for ' + this.startScript)
    })
  }
  
  close() {
    this._psProc.stdin.end()
  }

  _setEncoding() {
    const encoding = 'utf8' // encoding for strings not buffers (as is default)    
    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)
  }
}

module.exports = PowershellProcess
