const Umzug = require('umzug')

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
    logging: console.log
  })

  return umzug.up()
}
