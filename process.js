const batchCreateOrUpdate = ({ Program, Session }, batch) => {
  return new Promise((resolve, reject) => {
    const saveNext = () => {
      if (batch.length != 0) {
        let next = batch.shift()
        // Session.findCreateFind({ where: { pid: next.pid, Program:{ name: next.name } } }, { include: [Program] })
        Program.findCreateFind({ where: { name: next.name } })
          .then((program) => {
            Session.findCreateFind({ where: { pid: next.pid, ProgramId: program[0].id } }).then(saveNext)
          })
          // .then(saveNext)
          .catch(e => reject(e))
      } else {
        resolve()
      }
    }
    saveNext()
  })
}

const deleteAll = (model) => {
  return model.destroy({
    where: {},
    truncate: true
  })
}

const saveSnapshot = (poller, db) => () => {

  // deleteAll(db.Session)
  // deleteAll(db.Program)

  // const fields = ['pid', 'name', 'path', 'starttime']

  // poller.snapshot(fields).then(processes => {
  // console.time('batchCreateOrUpdate')
  // batchCreateOrUpdate(Program, processes).then(() => console.timeEnd('batchCreateOrUpdate'))
  // }).catch(e => console.error(e))

// Session.create({ isActive: true }).then((s) => {
//   s.createProgram({ name: "asd" }).then()
// })

  const p1 = Array.from({ length: 150 }, ( _, i) => ({ pid: 10 + i, name: `${i}.exe`}))
  const p2 = Array.from({ length: 150 }, ( _, i) => ({ pid: 1000 + i, name: `${i}.exe`}))
  const processes = p1.concat(p2)

  // console.log(Object.keys(db.Program))
  // console.log(db.Program.associations)
  console.time('a')
  batchCreateOrUpdate(db, processes)
  .then(() => {
    console.log('='.repeat(40))
    console.timeEnd('a')
  })
  .catch(e => console.error(e))
}

module.exports = saveSnapshot
