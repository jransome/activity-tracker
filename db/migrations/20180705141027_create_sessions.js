exports.up = function (knex, Promise) {
  return knex.schema.createTable('sessions', (table) => {
    table.increments().primary()
    table.integer('program_id').references('id').inTable('programs')
    table.integer('pid')
    table.dateTime('commenced_at')
    table.dateTime('ended_at')
    table.timestamps(true, true)
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('sessions')
}
