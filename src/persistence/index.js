const { Model } = require('objection')
const sqlite3 = require('sqlite3').verbose()

const dbConfig = require('../../knexfile')

new sqlite3.Database(dbConfig.connection.filename)

const db = require('knex')(dbConfig)
db.migrate.latest()

Model.knex(db)

module.exports = Model
