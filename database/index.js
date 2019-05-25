const fs = require('fs')
const Sequelize = require('sequelize')
const logger = require('../src/logger')('[DATABASE]')
const runMigrations = require('./migrate')
const importModels = require('./models')

module.exports = async (config) => {
  const { name, username, password, storage } = config
  const dbIsPreExisting = fs.existsSync(storage)
  const sequelize = new Sequelize(name, username, password, config)

  if (!dbIsPreExisting) {
    logger.info('No pre-existing db was detected, new db created.')
    try {
      // use Write-Ahead Logging for speed benefits
      await sequelize.query("PRAGMA journal_mode=WAL;")
    } catch (error) {
      logger.error('Error setting WAL:', error)
    }

    try {
      logger.info('Running migrations...')
      await runMigrations(sequelize)
    } catch (error) {
      logger.error('Error on database migration check:', error)
    }
  }

  let models
  try {
    models = importModels(sequelize)
  } catch (error) {
    logger.error('Database models import error:', error)
  }

  return {
    models,
    query: (...args) => sequelize.query(...args),
    transaction: (...args) => sequelize.transaction(...args),
  }
}
