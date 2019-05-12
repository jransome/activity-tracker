const FocusRecorder = require('../../src/main/FocusRecorder')
const initDb = require('../../src/main/models')
const purgeDb = require('../helpers/purgeDb')
const MockListener = require('../helpers/mockListener')
const queue = require('async/queue')

describe('FocusRecorder', () => {
  let db;
  let recorder;
  let mockPoller;
  let mockListener;
  const delayStopRecording = (time) => {
    return new Promise(resolve => {
      setTimeout(async () => {
        await recorder.stopRecording()
        resolve()
      }, time)
    })
  }

  beforeAll(async () => {
    db = await initDb()
  })

  beforeEach(async () => {
    mockPoller = jest.fn()
    mockListener = new MockListener()
    const dbJobQueue = queue(async (task) => {
      await task()
    })
    recorder = new FocusRecorder(mockPoller, mockListener, dbJobQueue, db)
    await purgeDb(db)
  })

  const getAllfromDb = async () => ({
    focusSessions: await db.FocusSession.findAll(),
    programs: await db.Program.findAll(),
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

  describe('saving focus changes', () => {
    it('records a new focus session', async () => {
      const timestamp = new Date('1990')
      const exeName = 'a.exe'
      const focusEvent1 = { pid: 1, exeName, timestamp }

      await recorder._enqueueFocusUpdate(focusEvent1)

      const { programs, focusSessions } = await getAllfromDb()
      expect.assertions(7)
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].isActive).toBeTruthy()
      expect(focusSessions[0].startTime).toEqual(timestamp)
      expect(focusSessions[0].endTime).toBeNull()
      expect(focusSessions[0].duration).toBeNull()
      expect(programs).toHaveLength(1)
      expect(programs[0].exeName).toEqual(exeName)
    })

    it('records the end of the current focus session', async () => {
      const timestamp1 = new Date('1990')
      const timestamp2 = new Date('1991')
      const focusEvent1 = { pid: 1, exeName: 'a.exe', timestamp: timestamp1 }
      const focusEvent2 = { pid: 2, exeName: 'b.exe', timestamp: timestamp2 }

      await recorder._enqueueFocusUpdate(focusEvent1)
      await recorder._enqueueFocusUpdate(focusEvent2)

      const { programs, focusSessions } = await getAllfromDb()
      expect.assertions(7)
      expect(focusSessions).toHaveLength(2)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toEqual(timestamp2)
      expect(focusSessions[0].duration).toEqual(timestamp2 - timestamp1)
      expect(programs).toHaveLength(2)
      expect(programs[0].focusTime).toEqual(timestamp2 - timestamp1)
    })
  })

  describe('cleaning db', () => {
    it('cleans up the db if FocusRecorder was not shutdown properly', async () => {
      // TODO: refactor setup
      const previousActiveFocus = { pid: 1, exeName: 'a.exe', timestamp: new Date('1990') }
      mockPoller.mockResolvedValue(previousActiveFocus)
      await recorder._enqueueSnapshot()

      await recorder._enqueueCheckDbClosedGracefully()

      const { programs, focusSessions } = await getAllfromDb()
      expect.assertions(2)
      expect(focusSessions).toHaveLength(0)
      expect(programs).toHaveLength(1)
    })
  })

  describe('shutting down', () => {
    it('closes all open sessions when recording stops', async () => {
      const timestamp1 = new Date('1990')
      const focusEvents = [
        { pid: 1, exeName: 'a.exe', timestamp: timestamp1 },
      ]
      mockListener.setMockEvents(focusEvents)

      recorder.startRecording()
      mockListener.emitEvents()
      await delayStopRecording()

      const { focusSessions } = await getAllfromDb()
      expect.assertions(5)
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toBeTruthy()
      expect(focusSessions[0].duration).toBeTruthy()
    })
  })

  describe('smoke tests', () => {
    it('test 1', async () => {
      const timestamps = [
        new Date('1990'),
        new Date('1991'),
        new Date('1992'),
        new Date('1993'),
        new Date('1994'),
      ]
      const activeFocus = { pid: 1, exeName: 'a.exe', timestamp: timestamps[0] }
      const focusEvents = [
        { pid: 2, exeName: 'b.exe', timestamp: timestamps[1] },
        { pid: 3, exeName: 'c.exe', timestamp: timestamps[2] },
        { pid: 2, exeName: 'b.exe', timestamp: timestamps[3] },
        { pid: 3, exeName: 'c.exe', timestamp: timestamps[4] },
      ]
      mockPoller.mockResolvedValue(activeFocus)
      mockListener.setMockEvents(focusEvents)

      recorder.startRecording()
      mockListener.emitEvents()
      await delayStopRecording()

      const { programs, focusSessions } = await getAllfromDb()
      expect.assertions(25)
      expect(focusSessions).toHaveLength(5)
      focusSessions.slice(0, 4).forEach((fs, i) => {
        expect(fs.isActive).toBeFalsy()
        expect(fs.startTime).toEqual(timestamps[i])
        expect(fs.endTime).toEqual(timestamps[i + 1])
        expect(fs.duration).toEqual(timestamps[i + 1] - timestamps[i])
      })
      expect(focusSessions[4].isActive).toBeFalsy()
      expect(focusSessions[4].startTime).toEqual(timestamps[4])
      expect(focusSessions[4].endTime).toBeTruthy()
      expect(focusSessions[4].duration).toBeTruthy()

      expect(programs).toHaveLength(3)
      const focusTimes = [
        timestamps[1] - timestamps[0],
        (timestamps[2] - timestamps[1]) + (timestamps[4] - timestamps[3]),
      ]
      expect(programs[0].focusTime).toEqual(focusTimes[0])
      expect(programs[1].focusTime).toEqual(focusTimes[1])
      expect(programs[2].focusTime).not.toBeNaN()
    })
  })
})
