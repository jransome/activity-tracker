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
      path: 'some/path/program1.exe',
      pid: 1,
      exeName: 'program1.exe',
      startTime: new Date(1000),
    },
    {
      path: 'some/path/program2.exe',
      pid: 2,
      exeName: 'program2.exe',
      startTime: new Date(2000),
    },
    {
      path: 'some/path/program3.exe',
      pid: 3,
      exeName: 'program3.exe',
      startTime: new Date(3000),
    },
    {
      path: 'some/path/program2.exe',
      pid: 4,
      exeName: 'program2.exe',
      startTime: new Date(4000),
    },
    {
      path: 'some/path/program1.exe',
      pid: 5,
      exeName: 'program1.exe',
      startTime: new Date(5000),
    },
  ]

  beforeAll(async () => {
    dbConnection = await initDb(config)
  })

  beforeEach(async () => {
    jest.resetAllMocks()
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
      expect(programs[0].id).toEqual(focusSessions[0].ProgramId)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
    })

    it('records programs only after they lose focus', async () => {
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
      expect(programs[0].id).toEqual(focusSessions[0].ProgramId)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
      expect(programs[1].id).toEqual(focusSessions[1].ProgramId)
      expect(programs[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(programs[1].focusTime).toEqual(focusSessions[1].duration)
    })

    it('ignores consecutive focus changes for the same program', async () => {
      let enqueueFunction
      const internalQueueDrained = new Promise(res => {
        enqueueFunction = queueFactory(() => res())
      })

      mockPoller.mockResolvedValue(mockFocusEvents[0])
      const startRecorder = recorderFactory(enqueueFunction)

      await startRecorder(dbConnection, mockPoller, mockListener)
      mockListener.listener.emit('data', mockFocusEvents[1])
      mockListener.listener.emit('data', mockFocusEvents[1])
      mockListener.listener.emit('data', mockFocusEvents[1])
      mockListener.listener.emit('data', mockFocusEvents[2])
      mockListener.listener.emit('data', mockFocusEvents[2])
      mockListener.listener.emit('data', mockFocusEvents[3])
      mockListener.listener.emit('data', mockFocusEvents[3])
      mockListener.listener.emit('data', mockFocusEvents[3])
      mockListener.listener.emit('data', mockFocusEvents[4])
      await internalQueueDrained

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(programs.length).toEqual(3)
      expect(programs[0].id).toEqual(focusSessions[0].ProgramId)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(mockFocusEvents[1].startTime - mockFocusEvents[0].startTime)
      expect(programs[1].id).toEqual(focusSessions[1].ProgramId)
      expect(programs[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(programs[1].focusTime).toEqual(
        (mockFocusEvents[2].startTime - mockFocusEvents[1].startTime) +
        (mockFocusEvents[3].startTime - mockFocusEvents[2].startTime)
      )
      expect(programs[2].id).toEqual(focusSessions[2].ProgramId)
      expect(programs[2].exeName).toEqual(mockFocusEvents[2].exeName)
      expect(programs[2].focusTime).toEqual(mockFocusEvents[3].startTime - mockFocusEvents[2].startTime)

      expect(focusSessions.length).toEqual(4)
      expect(focusSessions[0].ProgramId).toEqual(1)
      expect(focusSessions[1].ProgramId).toEqual(2)
      expect(focusSessions[2].ProgramId).toEqual(3)
      expect(focusSessions[3].ProgramId).toEqual(2)
    })
  })

  describe('on graceful shutdown', () => {
    it('records the current program in focus as if it had just lost focus', async () => {
      mockPoller.mockResolvedValue(mockFocusEvents[0])
      const startRecorder = recorderFactory(queueFactory())

      const shutdown = await startRecorder(dbConnection, mockPoller, mockListener)
      mockListener.listener.emit('data', mockFocusEvents[1])
      const shutdownDate = new Date(10000)
      await shutdown(shutdownDate)

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(focusSessions.length).toEqual(2)
      expect(focusSessions[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(focusSessions[0].duration).toEqual(mockFocusEvents[1].startTime - mockFocusEvents[0].startTime)
      expect(focusSessions[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(focusSessions[1].duration).toEqual(shutdownDate - mockFocusEvents[1].startTime)
      expect(programs.length).toEqual(2)
      expect(programs[0].id).toEqual(focusSessions[0].ProgramId)
      expect(programs[0].exeName).toEqual(mockFocusEvents[0].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
      expect(programs[1].id).toEqual(focusSessions[1].ProgramId)
      expect(programs[1].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(programs[1].focusTime).toEqual(focusSessions[1].duration)
    })
  })

  describe('if initial polling fails', () => {
    it('is able to continue recording', async () => {
      let enqueueFunction
      const internalQueueDrained = new Promise(res => {
        enqueueFunction = queueFactory(() => res())
      })

      mockPoller.mockRejectedValue('MOCK FAIL')
      const startRecorder = recorderFactory(enqueueFunction)

      await startRecorder(dbConnection, mockPoller, mockListener)
      mockListener.listener.emit('data', mockFocusEvents[1])
      mockListener.listener.emit('data', mockFocusEvents[2])
      mockListener.listener.emit('data', mockFocusEvents[3])
      await internalQueueDrained

      const { focusSessions, programs } = await databaseHelpers.getAllModels(dbConnection)
      expect(focusSessions.length).toEqual(2)
      expect(focusSessions[0].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(focusSessions[0].duration).toEqual(mockFocusEvents[2].startTime - mockFocusEvents[1].startTime)
      expect(focusSessions[1].exeName).toEqual(mockFocusEvents[2].exeName)
      expect(focusSessions[1].duration).toEqual(mockFocusEvents[3].startTime - mockFocusEvents[2].startTime)
      expect(programs.length).toEqual(2)
      expect(programs[0].id).toEqual(focusSessions[0].ProgramId)
      expect(programs[0].exeName).toEqual(mockFocusEvents[1].exeName)
      expect(programs[0].focusTime).toEqual(focusSessions[0].duration)
      expect(programs[1].id).toEqual(focusSessions[1].ProgramId)
      expect(programs[1].exeName).toEqual(mockFocusEvents[2].exeName)
      expect(programs[1].focusTime).toEqual(focusSessions[1].duration)
    })
  })
})
