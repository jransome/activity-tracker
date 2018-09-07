import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'
import pollProcesses from './src/pollProcesses'
import ProcessListener from './src/ProcessListener'
import ProcessRecorder from './src/ProcessRecorder'
import pollFocus from './src/pollFocus'
import FocusListener from './src/FocusListener'
import FocusRecorder from './src/FocusRecorder'

import queue from 'async/queue'

const dbJobQueue = queue(async (task) => {
  await task()
})

// listen for focus changes
const focusListener = new FocusListener()
const focusRecorder = new FocusRecorder(pollFocus, focusListener, dbJobQueue, dbConnection)

// listen for processes
// const processListener = new ProcessListener()
// const processRecorder = new ProcessRecorder(pollProcesses, processListener, dbJobQueue, dbConnection)

init()

function init() {
  focusRecorder.startRecording()
  // processRecorder.startRecording()
}

async function stopRecording() {
  await focusRecorder.stopRecording()
  // await processRecorder.stopRecording()
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
