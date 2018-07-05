exports.up = function (knex, Promise) {
  return knex.schema.createTable('sessions', (table) => {
    table.increments().primary()
    table.timestamps(true, true)
    table.integer('program_id').references('id').inTable('programs')
    table.dateTime('commenced_at')
    table.dateTime('ended_at')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('sessions')
}
