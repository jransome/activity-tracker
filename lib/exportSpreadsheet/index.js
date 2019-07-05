const fs = require('fs')
const excel = require('node-excel-export')
const logger = require('../logger')('[EXCEL]')

const styles = { header: { font: { bold: true } } }

const createSpecification = (tableAttributes) => Object.keys(tableAttributes).reduce((acc, field) => {
  acc[field] = {
    displayName: field,
    headerStyle: styles.header,
    width: 180,
  }
  return acc
}, {}) 

const createWorksheet = async ([tableName, table]) => ({
  name: tableName,
  specification: createSpecification(table.rawAttributes),
  data: await table.findAll({ raw: true })
})

const saveExcelFile = (logDir, filename, workbook) => new Promise((resolve, reject) => {
  fs.mkdir(logDir, (err) => {
    if (err && err.code !== 'EEXIST') {
      reject("Failed to make logs directory: " + err)
      return
    }

    const filepath = `${logDir}/${filename}`
    fs.writeFile(filepath, workbook, 'binary', (err) => {
      if (err) {
        reject(err)
        return
      }
      logger.info(`Exported database contents to ${filepath}`)
      resolve()
    })
  })
})


module.exports = async ({ models }, userDocumentsPath) => {
  const worksheets = await Promise.all(Object.entries(models).map(kvp => createWorksheet(kvp)))
  const workbook = excel.buildExport(worksheets)

  const logDir = `${userDocumentsPath}/Activity Monitor logs/`
  const filename = `log-${Date.now()}.xlsx`
  await saveExcelFile(logDir, filename, workbook)
}
