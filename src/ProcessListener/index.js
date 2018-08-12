const { spawn } = require("child_process");

const startEventIdentifier = 'startevent'
const stopEventIdentifier = 'stopevent'

const psScriptsDir = './src/powershell';
const psScriptArgs = `-StartEventIdentifier ${startEventIdentifier} -StopEventIdentifier ${stopEventIdentifier}`
const registerEventsScript = `${psScriptsDir}/register-events.ps1 ${psScriptArgs}\n`;
const unregisterEventsScript = `${psScriptsDir}/unregister-events.ps1 ${psScriptArgs}\n`;

const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-'];

const child = spawn('powershell.exe', args);

child.stdin.setEncoding('utf-8');

child.stdin.write(registerEventsScript);

setTimeout(function () {
  child.stdin.write(unregisterEventsScript);
}, 10000)

child.stdout.on("data", function (data) {
  console.log("Powershell Data: " + data);
});

child.stderr.on("data", function (data) {
  console.log("Powershell Errors: " + data);
});

child.on("exit", function () {
  console.log("Powershell Script finished");
});

// child.stdin.end(); //end input
