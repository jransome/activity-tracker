const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const Umzug = require('umzug')

const runMigrations = async (sequelize) => {
  const migrationsDir = `${__dirname}/migrations`
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        sequelize.constructor,
        function () {
          throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.')
        }
      ],
      path: migrationsDir,
      pattern: /\.js$/
    }
  })
  try {
    await umzug.up()
    console.log('Migration complete!')
  } catch (error) {
    console.log('Error on db migration: ', error)
  }
}

const setupModels = (db, sequelize) => {
  const basename = path.basename(__filename)
  const modelsDir = `${__dirname}/models`

  fs.readdirSync(modelsDir)
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    .forEach(file => {
      const model = sequelize['import'](path.join(modelsDir, file))
      db[model.name] = model
    })

  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) db[modelName].associate(db)
  })
}

const initDb = async (config) => {
  const { database, username, password } = config
  const sequelize = new Sequelize(database, username, password, config)
  await sequelize.query("PRAGMA journal_mode=WAL;") // use wal
  
  await runMigrations(sequelize)
  
  const dbInstance = {}
  setupModels(dbInstance, sequelize)

  dbInstance.sequelize = sequelize
  dbInstance.Sequelize = Sequelize

  return dbInstance
}

module.exports = initDb
