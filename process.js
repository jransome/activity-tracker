const recordSnapshot = ({ Program, Session }, batch) => {
  return batch.reduce((dbQueryChain, currentBatchElem) => {
    return dbQueryChain
      .then(() => Program.findCreateFind({ where: { name: currentBatchElem.name } }))
      .then(([program]) =>
        Session.findCreateFind({ where: { pid: currentBatchElem.pid, pidName: currentBatchElem.pid + currentBatchElem.name, isActive: true, startTime: currentBatchElem.starttime, ProgramId: program.id } })
      )
  }, Promise.resolve())
}

const resolveExpiredSessions = (Session, snapshot) => {
  Session.findAll({ where: { isActive: true } })
    .then(storedActiveSessions => {
      const sessionsToClose = storedActiveSessions.map((sas => {
        if (isStoredSessionNotInSnapshot(sas, snapshot)) return sas.id
      }))
      Session.update({ isActive: false, endTime: new Date }, { where: { id: sessionsToClose } })
    })
}

const isStoredSessionNotInSnapshot = (storedSession, snapshot) => {
    return snapshot.filter((snapshotSession) =>
      storedSession.pidName === (snapshotSession.pid + snapshotSession.name)).length == 0
}

const deleteAll = (model) => {
  return model.destroy({
    where: {},
    truncate: true
  })
}

function cleanDb(db) {
  return deleteAll(db.Session)
    .then(() => deleteAll(db.Program))
}

function manualTest(db){
  const testData = require('./testData').test3
  
  cleanDb(db)
    .then(() => recordSnapshot(db, testData.snapshot1))
    .then(() => resolveExpiredSessions(db.Session, testData.snapshot1))
    .then(() => recordSnapshot(db, testData.snapshot2))
    .then(() => resolveExpiredSessions(db.Session, testData.snapshot2))
    .then(() => recordSnapshot(db, testData.snapshot3))
    .then(() => resolveExpiredSessions(db.Session, testData.snapshot3))
}

const saveSnapshot = (poller, db) => () => {
  manualTest(db)
  // const fields = ['pid', 'name', 'path', 'starttime']

  // poller.snapshot(fields)
  //   .then(processes => recordSnapshot(db, processes))
  //   .then(() => resolveExpiredSessions(db.Session, processes))
  //   .catch(e => console.error(e))
}

module.exports = saveSnapshot
