module.exports = {
    client: 'sqlite3',
    connection: {
      filename: './db/database.sqlite3'
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    },
    useNullAsDefault: true
}
