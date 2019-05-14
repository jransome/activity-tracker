const { EventEmitter } = require('events')
const databaseHelpers = require('../helpers/database')
const config = require('../../config')
const initDb = require('../../database')
const queueFactory = require('../../src/main/queue')
const recorderFactory = require('../../src/main/focus/recorder')

describe('recording focus', () => {
  let dbConnection;
  let mockPoller;
  let mockListener;

  const mockPolled = {
    path: 'C:/folder/program.exe',
    pid: 1,
    exeName: 'program.exe',
    timestamp: new Date(),
  }

  beforeEach(async () => {
    console.log('destroying test db...')
    databaseHelpers.destroy()
    console.log('reinitialising test db...')
    dbConnection = await initDb(config)
    mockPoller = jest.fn()
    mockListener = {
      listener: new EventEmitter(),
      end: jest.fn(),
    }
  })

  describe('saving initial snapshot', () => {
    it('records the program that currently has focus', async () => {
      let enqueueFunction
      const internalQueueDrained = new Promise(res => {
        enqueueFunction = queueFactory(() => res())
      })
      const recorder = recorderFactory(enqueueFunction)
      mockPoller.mockResolvedValue(mockPolled)

      recorder.saveInitialFocus(dbConnection, mockPoller)
      await internalQueueDrained

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(focusSessions.length).toEqual(1)
      expect(focusSessions[0].exeName).toEqual(mockPolled.exeName)
      expect(programs.length).toEqual(1)
      expect(programs[0].exeName).toEqual(mockPolled.exeName)
      expect(programs[0]).toEqual(await focusSessions[0].getProgram())
    })
  })
})
