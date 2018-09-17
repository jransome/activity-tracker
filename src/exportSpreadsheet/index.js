const fs = require('fs')
const excel = require('node-excel-export')

const styles = { header: { font: { bold: true } } }

const getTables = (db) => {
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

const exportSpreadsheet = (db, userDocumentsPath) => new Promise(async (resolve, reject) => {
  const tables = getTables(db)

  const worksheets = await Promise.all(tables.map((t) => createWorksheet(t)))

  const xls = excel.buildExport(worksheets)

  const filename = `${userDocumentsPath}/Activity Monitor logs/log-${Date.now()}.xlsx`

  fs.writeFile(filename, xls, 'binary', (err) => {
    if (err) {
      reject(err)
    } else {
      console.log('Exported db to ' + filename)
      resolve()
    }
  })
})

module.exports = exportSpreadsheet
