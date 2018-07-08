const processList = require("process-list")

const batchCreateOrUpdate = (model, batch) => {
  return new Promise((resolve, reject) => {
    const saveNext = () => {
      if (batch.length != 0) {
        model.findCreateFind({ where: { name: batch.shift().name } })
          .then(saveNext)
          .catch(e => reject(e))
      } else {
        resolve()
      }
    }
    saveNext()
  })
}

// let x = Array.from({ length: 50 }, (_, i) => ({ name: i }))
// let testProcesses = x.concat(x)

const deleteAll = (model) => {
  return model.destroy({
    where: {},
    truncate: true
  })
}

const saveSnapshot = (database) => () => {
  const fields = ['pid', 'name', 'path', 'starttime']
  const Program = database.import('./src/models/program.js')
  
  processList.snapshot(fields).then(processes => {
    console.time('batchCreateOrUpdate')
    batchCreateOrUpdate(Program, processes).then(() => console.timeEnd('batchCreateOrUpdate'))
  }).catch(e => console.error(e))
}

module.exports = saveSnapshot
