const dbConfig = require('../../knexfile')

const sqlite3 = require('sqlite3').verbose()
new sqlite3.Database(dbConfig.connection.filename)

const db = require('knex')(dbConfig)
db.migrate.latest()

const { Model } = require('objection')
Model.knex(db)

module.exports = Model
