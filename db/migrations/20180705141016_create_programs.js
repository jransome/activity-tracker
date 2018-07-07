exports.up = function (knex, Promise) {
  return knex.schema.createTable('programs', (table) => {
    //define the columns
    table.increments().primary() // adds auto incrementing column for use as primary key
    table.string('name')
    table.timestamps(true, true) // adds createdAt and updatedAt
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('programs') // always drop the table(s) we created above in the rollback function
}
