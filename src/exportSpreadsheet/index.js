const fs = require('fs')
const excel = require('node-excel-export')

const styles = { header: { font: { bold: true } } }

const getTablesFromDb = (db) => {
  const tables = []

  for (const tableName in db) {
    if (tableName.toLowerCase() === 'sequelize') continue
    if (!db.hasOwnProperty(tableName)) continue

    tables.push({ tableName, table: db[tableName] })
  }

  return tables
}

const createSpecification = (tableAttributes) => {
  const specification = {}
  for (const field in tableAttributes) {
    specification[field] = {
      displayName: field,
      headerStyle: styles.header,
      width: 180
    }
  }
  return specification
}

const createWorksheet = async ({ tableName, table }) => {
  return {
    name: tableName,
    specification: createSpecification(table.rawAttributes),
    data: await table.findAll({ raw: true })
  }
}

const saveLogFile = (logDir, filename, xls) => new Promise((resolve, reject) => {
  fs.mkdir('logDir', (err) => {
    if (err.code !== 'EEXIST') {
      reject("Failed to make logs directory: " + err)
      return
    }

    const filepath = `${logDir}/${filename}`

    fs.writeFile(filepath, xls, 'binary', (err) => {
      if (err) {
        reject(err)
        return
      }
      console.log('Exported db to ' + filepath)
      resolve()
    })
  })
})


const exportSpreadsheet = async (db, userDocumentsPath) => {
  const tables = getTablesFromDb(db)

  const worksheets = await Promise.all(tables.map((t) => createWorksheet(t)))
  const xls = excel.buildExport(worksheets)

  const logDir = `${userDocumentsPath}/Activity Monitor logs`
  const filename = `log-${Date.now()}.xlsx`

  await saveLogFile(logDir, filename, xls)
}

module.exports = exportSpreadsheet
