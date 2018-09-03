import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'
import ProcessListener from './src/ProcessListener'
import pollProcesses from './src/pollProcesses'
import ProcessRecorder from './src/ProcessRecorder'

import queue from 'async/queue'

const dbJobQueue = queue(async (task, done) => {
  await task()
  done()
})

// listen for processes
const processListener = new ProcessListener()
const processRecorder = new ProcessRecorder(pollProcesses, processListener, dbJobQueue, dbConnection)

init()

function init() {
  processRecorder.on('stopped recording', () => console.log('stopped event fired'))

  processRecorder.startRecording()

  // setTimeout(() => {
  //   console.log('STOP')
  //   stopRecording()
  // }, 5000)

  // setTimeout(() => {
  //   console.log('start againg')
  //   processRecorder.startRecording()
  // }, 45000)

  // setTimeout(() => {
  //   console.log('STOP again')
  //   stopRecording()
  // }, 60000)
}

async function stopRecording() {
  await processRecorder.stopRecording()
}

// app
let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })

  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', async () => {
  await stopRecording()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
