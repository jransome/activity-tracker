const Umzug = require('umzug')
const logger = require('../src/logger')('[DATABASE]')

const MIGRATIONS_DIRECTORY = `${__dirname}/migrations`

module.exports = (sequelizeInstance) => {
  const migration = sequelizeInstance.getQueryInterface()
  const DataTypes = sequelizeInstance.constructor
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: { sequelize: sequelizeInstance },
    migrations: {
      params: [migration, DataTypes],
      path: MIGRATIONS_DIRECTORY,
      pattern: /\.js$/
    },
    logging: logger.debug
  })

  return umzug.up()
}
