exports.seed = function(knex, Promise) {
  return knex('programs').del()
    .then(() => {
      return knex('programs').insert([
        {image_name: 'chrome.exe'},
        {image_name: 'sfc2.exe'}
      ])
    })
}
