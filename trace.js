const { spawn } = require("child_process");

const registerEventsScript = './register-events.ps1 \n';
const unregisterEventsScript = './unregister-events.ps1 \n';

const args = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NoExit', '-InputFormat', 'Text', '-Command', '-'];

const child = spawn('powershell.exe', args);

child.stdin.setEncoding('utf-8');

child.stdin.write(registerEventsScript);

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
