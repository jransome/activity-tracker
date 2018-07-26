import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'
import ProcessRecorder from './src/ProcessRecorder'

import fakeProcess from './test/helpers/mockProcess'
// listen for processes
const fakeSnapshot = [
  fakeProcess(1, 'a.exe'),
  fakeProcess(2, 'b.exe'),
  fakeProcess(3, 'c.exe'),
]

import processPoller from 'process-list' // this package does not install correctly on mac, commented out when developing on mac
// const processPoller = { snapshot: () => Promise.resolve(fakeSnapshot) } // stub for developing on mac
const processRecorder = new ProcessRecorder(processPoller, dbConnection, 10000)
init()
function init() {

  processRecorder.on('stopped recording', () => console.log('stopped event fired'))

  processRecorder.startRecording()

  // setTimeout(() => {
  //   console.log('STOP')
  //   processRecorder.stopRecording()
  // }, 5000)

  // setTimeout(() => {
  //   console.log('STart')
  //   processRecorder.startRecording()
  // }, 11000)

  setTimeout(() => {
    console.log('STOP')
    processRecorder.stopRecording()
  }, 60000)
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
  if (processRecorder.isRecording) await processRecorder.stopRecording()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
