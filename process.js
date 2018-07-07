const processList = require("process-list")

const fields = ['pid', 'name', 'path', 'starttime']

const saveSnapshot = (Program, Session) => () => {
  console.log(Session)
  processList.snapshot(fields).then(processes => {
    processes.forEach(process => {
      console.log('saving:', process.name)
      Program
        .query()
        .insert({ name: process.name })
        // .then(x => console.log('THEN-'.repeat(10), x))
        // .catch(e => console.log('ERROR-'.repeat(10), e))
      console.log("=".repeat(30))
    })

  }).catch(e => console.error(e))
}

module.exports = saveSnapshot
