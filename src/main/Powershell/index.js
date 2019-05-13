const { spawn } = require('child_process')
const logger = require('../../logger')('[POWERSHELL]')

class Powershell {
  constructor(psArgs, startScript, stopScript, dataHandler) {
    this._isRunning = false
    this._startScript = startScript
    this._stopScript = stopScript
    this._dataHandler = dataHandler
    this._spawn = () => spawn('powershell.exe', psArgs)
  }

  start() {
    if (this._isRunning) return
    this._isRunning = true
    this._psProc = this._spawn()

    if (!this._psProc.pid) {
      throw Object.assign(new Error('Powershell child process did not start'), {
        script: startScript
      })
    }

    this._psProc.on('error', err => {
      throw Object.assign(new Error('Error on Powershell child process'), {
        psError: err,
        script: startScript
      })
    })

    this._setEncoding()

    this._psProc.stderr.on('data', err => logger.error('Error in Powershell script execution: ', err))

    this._psProc.stdout.on('data', data => this._dataHandler(data))

    this._psProc.stdin.write(this._startScript)
  }

  async end() {
    if (!this._isRunning) return
    this._isRunning = false
    if (this._stopScript) await this._runStopScript()
    this._psProc.kill('SIGTERM')
    logger.info('Killed Powershell child process for ' + this._startScript.trim())
  }

  _runStopScript() {
    return new Promise(resolve => {
      this._psProc.stdin.end(this._stopScript, () => {
        logger.info('Invoked Powershell stop script for ' + this._startScript.trim())
        resolve()
      })
    })
  }

  _setEncoding() {
    const encoding = 'utf8' // encoding for strings not buffers (as is default)    
    this._psProc.stdin.setDefaultEncoding(encoding)
    this._psProc.stdout.setEncoding(encoding)
    this._psProc.stderr.setEncoding(encoding)
  }
}

module.exports = Powershell
