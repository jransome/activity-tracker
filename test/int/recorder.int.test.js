const FocusRecorder = require('../../src/main/FocusRecorder')
const initDb = require('../../src/main/models')
const databaseHelpers = require('../helpers/database')
const MockListener = require('../helpers/mockListener')
const queue = require('async/queue')

describe('recording focus', () => {
  let db;
  let recorder;
  let mockPoller;
  let mockListener;

  beforeEach(async () => {
    databaseHelpers.destroy()
    db = await initDb()
    mockPoller = jest.fn()
    mockListener = new MockListener()
    const dbJobQueue = queue(async (task) => {
      await task()
    })
    recorder = new FocusRecorder(mockPoller, mockListener, dbJobQueue, db)
    await purgeDb(db)
  })

  describe('saving initial snapshot', () => {
    it('records the program that currently has focus', async () => {
      const activeFocus = { pid: 1, exeName: 'a.exe', timestamp: new Date('1990') }
      mockPoller.mockResolvedValue(activeFocus)

      await recorder._enqueueSnapshot()

      const { programs, focusSessions } = await getAllfromDb()
      expect.assertions(9)
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].pid).toEqual(activeFocus.pid)
      expect(focusSessions[0].exeName).toEqual(activeFocus.exeName)
      expect(focusSessions[0].startTime).toEqual(activeFocus.timestamp)
      expect(focusSessions[0].isActive).toBeTruthy()
      expect(focusSessions[0].ProgramId).toEqual(programs[0].id)
      expect(programs).toHaveLength(1)
      expect(programs[0].exeName).toEqual(activeFocus.exeName)
      expect(programs[0].focusTime).toBeNull()
    })
  })
})
