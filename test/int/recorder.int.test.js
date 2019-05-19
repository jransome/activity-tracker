const { EventEmitter } = require('events')
const databaseHelpers = require('../helpers/database')
const config = require('../../config')
const initDb = require('../../database')
const queueFactory = require('../../src/main/queue')
const recorderFactory = require('../../src/main/focus/recorder')

describe('recording focus', async () => {
  let dbConnection;
  let mockPoller;
  let mockListener;

  const mockFocusEvents = [
    {
      path: 'C:/folder/program.exe',
      pid: 1,
      exeName: 'program.exe',
      startTime: new Date(1000),
    },
    {
      pid: 2,
      path: 'some/path/theNextFocus.exe',
      exeName: 'theNextFocus.exe',
      startTime: new Date(2000)
    },
    {
      pid: 3,
      path: 'some/path/theFocusAfterThat.exe',
      exeName: 'theFocusAfterThat.exe',
      startTime: new Date(3000)
    },
    {
      pid: 4,
      path: 'some/path/theFocusAfterThat.exe',
      exeName: 'theFocusAfterThat.exe',
      startTime: new Date(3000)
    },
    {
      pid: 3,
      path: 'some/path/theFocusAfterThat.exe',
      exeName: 'theFocusAfterThat.exe',
      startTime: new Date(3000)
    }
  ]

  beforeAll(async () => {
    dbConnection = await initDb(config)
  })

  beforeEach(async () => {
    mockPoller = jest.fn()
    mockListener = {
      listener: new EventEmitter(),
      end: jest.fn(),
    }
  })

  afterEach(async () => console.log('resetting test db...') || await databaseHelpers.reset(dbConnection))

  describe('when focus change is detected', () => {
    it('records the program that had focus on startup', async () => {
      let enqueueFunction
      const internalQueueDrained = new Promise(res => {
        enqueueFunction = queueFactory(() => res())
      })
      mockPoller.mockResolvedValue(mockFocusEvents[0])
      const startRecorder = recorderFactory(enqueueFunction)

      await startRecorder(dbConnection, mockPoller, mockListener)
      mockListener.listener.emit('data', mockFocusEvents[1])
      await internalQueueDrained

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(focusSessions.length).toEqual(1)
      expect(focusSessions[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(focusSessions[0].duration).toEqual(mockFocusEvents[1].startTime - mockFocusEvents[0].startTime)
      expect(programs.length).toEqual(1)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
      expect(programs[0]).toEqual(await focusSessions[0].getProgram())
    })

    it('records programs after they lose focus', async () => {
      let enqueueFunction
      const internalQueueDrained = new Promise(res => {
        enqueueFunction = queueFactory(() => res())
      })

      mockPoller.mockResolvedValue(mockFocusEvents[0])
      const startRecorder = recorderFactory(enqueueFunction)

      await startRecorder(dbConnection, mockPoller, mockListener)
      mockListener.listener.emit('data', mockFocusEvents[1])
      mockListener.listener.emit('data', mockFocusEvents[2])
      await internalQueueDrained

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(focusSessions.length).toEqual(2)
      expect(focusSessions[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(focusSessions[0].duration).toEqual(mockFocusEvents[1].startTime - mockFocusEvents[0].startTime)
      expect(focusSessions[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(focusSessions[1].duration).toEqual(mockFocusEvents[2].startTime - mockFocusEvents[1].startTime)
      expect(programs.length).toEqual(2)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
      expect(programs[0]).toEqual(await focusSessions[0].getProgram())
      expect(programs[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(programs[1].focusTime).toEqual(focusSessions[1].duration)
      expect(programs[1]).toEqual(await focusSessions[1].getProgram())
    })

    xit('ignores consecutive focus changes for the same program', async () => { })
    xit('does not record focus for programs that are actively in focus', async () => { })
  })

  xdescribe('on graceful shutdown', () => {
    it('records the current program in focus as if it had just lost focus', async () => { })
  })

  xdescribe('on ungraceful termination', () => {
    it('the database is not left in an impossible state', async () => { })
  })
})
