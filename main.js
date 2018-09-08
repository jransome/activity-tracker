import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'

import MainRecorder, { RECORDING_MODES } from './src/MainRecorder'

const mainRecorder = new MainRecorder(dbConnection)

mainRecorder.startRecording(RECORDING_MODES.FOCUS_ONLY)

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
  await mainRecorder.stopRecording()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
