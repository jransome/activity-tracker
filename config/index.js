const config = {
  development: {
    username: "root",
    password: null,
    database: "database_development",
    storage: "db/db_dev.sqlite3",
    dialect: "sqlite",
    operatorsAliases: false,
    logging: false
  },
  test: {
    username: "root",
    password: null,
    database: "database_test",
    storage: "db/db_test.sqlite3",
    dialect: "sqlite",
    operatorsAliases: false,
    logging: false
  },
  production: {
    username: "root",
    password: null,
    database: "database_production",
    dialect: "sqlite",
    operatorsAliases: false,
    logging: false
  }
}

module.exports = config
