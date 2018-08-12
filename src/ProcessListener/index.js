const { spawn } = require('child_process');
const { EventEmitter } = require('events');

class ProcessListener extends EventEmitter {
  constructor() {
    super();
    const encoding = 'utf8'; // encoding for strings not buffers (as is default)
    const startEventIdentifier = 'startevent';
    const stopEventIdentifier = 'stopevent';
    const psScriptsDir = './src/powershell';
    const psScriptArgs = `-StartEventIdentifier ${startEventIdentifier} -StopEventIdentifier ${stopEventIdentifier}`;
    const registerEventsScript = `${psScriptsDir}/register-events.ps1 ${psScriptArgs}\n`;
    this._unregisterEventsScript = `${psScriptsDir}/unregister-events.ps1 ${psScriptArgs}\n`;

    const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-'];
    this._psProc = spawn('powershell.exe', args);

    if (!this._psProc.pid) throw new Error("Powershell child process did not start");

    this._psProc.on('error', error => {
      throw new Error("ERROR on Powershell child process: " + error);
    });

    this._psProc.stdin.setDefaultEncoding(encoding);
    this._psProc.stdout.setEncoding(encoding);
    this._psProc.stderr.setEncoding(encoding);

    this._psProc.stdin.write(registerEventsScript, () => this.emit('Ready'));

    this._psProc.stdout.on('data', (data) => {
      this.emit('process-event', data);
    });
    
    this._psProc.stderr.on('data', (data) => {
      this.emit('powershell-error', data);
    });
  }
  
  stop() {
    this._psProc.stdin.write(this._unregisterEventsScript, () => {
      this._psProc.stdin.end(); 
      console.log('Stopped listening')
    });
  }
}

export default ProcessListener;

// const listener = new ProcessListener();

// listener.on('process-event', (data) => {
//   console.log("Process event: " + data);
// });

// listener.on('powershell-error', (data) => {
//   console.log("Powershell Error: " + data);
// });

// setTimeout(() => {
//   console.log('stopping listener')
//   listener.stop();
// }, 10000);
