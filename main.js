import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'
import ProcessListener from './src/ProcessListener'
import pollProcesses from './src/pollProcesses'
import Recorder from './src/Recorder'

// listen for processes


const processListener = new ProcessListener()
const recorder = new Recorder(pollProcesses, processListener, dbConnection)

init()

function init() {
  recorder.on('stopped recording', () => console.log('stopped event fired'))

  recorder.startRecording()

  // setTimeout(() => {
  //   console.log('STOP')
  //   stopRecording()
  // }, 5000)

  // setTimeout(() => {
  //   console.log('start againg')
  //   recorder.startRecording()
  // }, 45000)

  // setTimeout(() => {
  //   console.log('STOP again')
  //   stopRecording()
  // }, 60000)
}

async function stopRecording() {
  await recorder.stopRecording()
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
