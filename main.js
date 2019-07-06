const path = require('path')
const electron = require('electron')
const { app, BrowserWindow, Tray, Menu } = electron
const config = require('./config')(app)
const logger = require('./lib/logger')('[MAIN]')
const connectToDb = require('./database')
const startRecording = require('./lib/focus')
const exportSpreadsheet = require('./lib/exportSpreadsheet')

let isStartedUp
let isQuitting
let database
let focusRecorder
let mainWindow
let tray

const instanceAlreadyRunning = app.makeSingleInstance(() => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

if (instanceAlreadyRunning) app.quit()

async function startup() {
  database = await connectToDb(config)
  focusRecorder = await startRecording(database, electron.powerMonitor)
}

async function quitApp() {
  isQuitting = true
  logger.debug('Quiting activity tracker...')
  mainWindow = null
  tray = null
  await isStartedUp
  await focusRecorder.stopRecording()
  try {
    await exportSpreadsheet(database, config.userDocumentsPath)
  } catch (error) {
    logger.error('Exporting spreadsheet error: ' + error)
  }
  logger.debug('Shutdown process complete')
  app.quit()
}

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 800, height: 600, show: false })
  mainWindow.loadFile('views/index.html')

  // mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('minimize', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      if (mainWindow) mainWindow.hide()
      e.returnValue = false
    }
  })
}

app.on('ready', () => {
  tray = new Tray(path.join(__dirname, 'assets/icons/icon.ico'))
  tray.setToolTip('Ransome Corp. Activity Tracker')
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show()
  })
  const trayMenu = Menu.buildFromTemplate([{ label: 'Quit', click: quitApp }])
  tray.setContextMenu(trayMenu)

  try {
    createWindow()
    logger.registerListener((logObject) => {
      if (mainWindow) mainWindow.webContents.send('log-update', logObject)
    })
    isStartedUp = startup()
  } catch (error) {
    logger.error('Startup error: ', error)
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
