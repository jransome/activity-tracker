// setup db
const dbConfig = require('./knexfile')

const sqlite3 = require('sqlite3').verbose()
new sqlite3.Database(dbConfig.connection.filename)

const db = require('knex')(dbConfig)
db.migrate.latest()

const { Model } = require('objection')
Model.knex(db)


// listen for processes
const Program = require('./src/models/program')
const Session = require('./src/models/session')
const saveSnapshot = require('./process')(Program, Session)

saveSnapshot()


// app
const { app, BrowserWindow } = require('electron')

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({ width: 1200, height: 900, show: false })

  mainWindow.loadFile('index.html')

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    Program.query().then((programs) => {
      mainWindow.webContents.send('update-programs', programs)
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
