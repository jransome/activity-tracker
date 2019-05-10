const fs = require('fs')
const Sequelize = require('sequelize')
const runMigrations = require('./migrate')
const importModels = require('./models')

module.exports = async (config) => {
  const { name, username, password, storage } = config
  const dbIsPreExisting = fs.existsSync(storage)
  const sequelize = new Sequelize(name, username, password, config)

  if (!dbIsPreExisting) {
    console.log('No pre-existing db was detected, new db created.')
    try {
      // use Write-Ahead Logging for speed benefits
      await sequelize.query("PRAGMA journal_mode=WAL;")
    } catch (error) {
      console.error('Error setting WAL:', error)
    }
  
    try {
      console.log('Running migrations...')
      await runMigrations(sequelize)
    } catch (error) {
      console.error('Error on database migration check:', error)
    }
  }

  let models
  try {
    models = importModels(sequelize)
  } catch (error) {
    console.error('Database models import error:', error)
  }

  const dbInstance = {
    ...models,
    sequelize,
    Sequelize
  }
  return dbInstance
}
