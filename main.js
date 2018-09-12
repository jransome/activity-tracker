import { app, BrowserWindow } from 'electron'
import dbConnection from './src/models'
import MainRecorder, { RECORDING_MODES } from './src/MainRecorder'
import exportSpreadsheet from './src/exportSpreadsheet'

const mainRecorder = new MainRecorder(dbConnection)

// app
let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })

  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainRecorder.startRecording(RECORDING_MODES.FOCUS_ONLY)
  })

  mainRecorder.on('focus-recorder-log', log => {
    if (mainWindow) mainWindow.webContents.send('log-update', log)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', async () => {
  await mainRecorder.stopRecording()
  await exportSpreadsheet(dbConnection)
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
