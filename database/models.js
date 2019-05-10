const fs = require('fs')
const path = require('path')

const MODELS_DIRECTORY = `${__dirname}/models`

module.exports = (sequelize) => {
  const models = fs
    .readdirSync(MODELS_DIRECTORY)
    .filter(fileName => /\.js$/.test(fileName))
    .reduce((acc, fileName) => {
      const model = sequelize.import(path.join(MODELS_DIRECTORY, fileName))
      acc[model.name] = model
      return acc
    }, {})

  Object.keys(models).forEach(model => {
    if (models[model].associate) models[model].associate(models)
  })

  return models
}
