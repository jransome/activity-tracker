import FocusRecorder from '../../src/FocusRecorder'
import db from '../../src/models'
import purgeDb from '../helpers/purgeDb'
import MockListener from '../helpers/mockListener'
import queue from 'async/queue'

const dbJobQueue = queue(async (task, done) => {
  await task()
  done()
})

describe('FocusRecorder', () => {
  const mockPoller = jest.fn()
  const mockListener = new MockListener()
  const recorder = new FocusRecorder(mockPoller, mockListener, dbJobQueue, db)

  const delayStopRecording = (time) => {
    return new Promise(resolve => {
      setTimeout(async () => {
        await recorder.stopRecording()
        resolve()
      }, time)
    })
  }

  const getAllfromDb = async () => ({
    focusSessions: await db.FocusSession.findAll(),
    programs: await db.Program.findAll(),
  })

  beforeEach(async () => {
    await purgeDb(db)
  })

  xdescribe('saving initial snapshot', () => {
    const timestamp = new Date('1990')
    const snapshot = [
      mockProcessFactory(1, 'chrome.exe'),
      mockProcessFactory(2, 'chrome.exe'),
      mockProcessFactory(3, 'audacity.exe'),
      mockProcessFactory(4, 'vscode.exe'),
      mockProcessFactory(5, 'vscode.exe'),
      mockProcessFactory(6, 'chrome.exe'),
      mockProcessFactory(7, 'vscode.exe'),
    ]

    beforeAll(() => {
      mockPoller.mockResolvedValue({
        timestamp,
        snapshot
      })
    })

    it('should save programs to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedPrograms = await db.Program.findAll()
      expect(savedPrograms).toHaveLength(3)
      expect(savedPrograms[0].name).toEqual('chrome.exe')
      expect(savedPrograms[1].name).toEqual('audacity.exe')
      expect(savedPrograms[2].name).toEqual('vscode.exe')
    })

    it('should save ProgramSessions to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedSessions = await db.ProgramSession.findAll()
      expect(savedSessions).toHaveLength(3)
      expect((await savedSessions[0].getProgram()).name).toEqual('chrome.exe')
      expect((await savedSessions[1].getProgram()).name).toEqual('audacity.exe')
      expect((await savedSessions[2].getProgram()).name).toEqual('vscode.exe')
      savedSessions.forEach((session) => {
        expect(session.isActive).toBeTruthy()
        expect(session.startTime).toEqual(timestamp)
      })
    })

    it('should save ProcessSessions to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedSessions = await db.ProcessSession.findAll()
      expect(savedSessions).toHaveLength(7)
      expect((await savedSessions[0].getProgram()).name).toEqual('chrome.exe')
      expect((await savedSessions[1].getProgram()).name).toEqual('chrome.exe')
      expect((await savedSessions[2].getProgram()).name).toEqual('audacity.exe')
      expect((await savedSessions[3].getProgram()).name).toEqual('vscode.exe')
      expect((await savedSessions[4].getProgram()).name).toEqual('vscode.exe')
      expect((await savedSessions[5].getProgram()).name).toEqual('chrome.exe')
      expect((await savedSessions[6].getProgram()).name).toEqual('vscode.exe')
      expect(savedSessions[0].ProgramSessionId).toEqual(1)
      expect(savedSessions[1].ProgramSessionId).toEqual(1)
      expect(savedSessions[2].ProgramSessionId).toEqual(2)
      expect(savedSessions[3].ProgramSessionId).toEqual(3)
      expect(savedSessions[4].ProgramSessionId).toEqual(3)
      expect(savedSessions[5].ProgramSessionId).toEqual(1)
      expect(savedSessions[6].ProgramSessionId).toEqual(3)
      savedSessions.forEach((session, index) => {
        expect(session.pid).toEqual(index + 1)
        expect(session.isActive).toBeTruthy()
        expect(session.startTime).toEqual(timestamp)
      })
    })
  })

  describe('saving focus changes', () => {
    it('records a new focus session', async () => {
      const timestamp1 = new Date('1990')
      const focusEvent1 = { pid: 1, processName: 'a.exe', timestamp: timestamp1 }

      await recorder._enqueueFocusUpdate(focusEvent1)

      const { focusSessions } = await getAllfromDb()
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].isActive).toBeTruthy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toBeNull()
      expect(focusSessions[0].duration).toBeNull()
    })

    it('records the end of the current focus session', async () => {
      const timestamp1 = new Date('1990')
      const timestamp2 = new Date('1991')
      const focusEvent1 = { pid: 1, processName: 'a.exe', timestamp: timestamp1 }
      const focusEvent2 = { pid: 2, processName: 'b.exe', timestamp: timestamp2 }

      await recorder._enqueueFocusUpdate(focusEvent1)
      await recorder._enqueueFocusUpdate(focusEvent2)

      const { focusSessions } = await getAllfromDb()
      expect(focusSessions).toHaveLength(2)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toEqual(timestamp2)
      expect(focusSessions[0].duration).toEqual(timestamp2 - timestamp1)
    })
  })

  describe('shutting down', () => {
    it('closes all open sessions when recording stops', async () => {
      const timestamp1 = new Date('1990')
      const focusEvents = [
        { pid: 1, processName: 'a.exe', timestamp: timestamp1 },
      ]
      mockListener.setMockEvents(focusEvents)

      recorder.startRecording()
      mockListener.emitEvents()
      await delayStopRecording()

      const { focusSessions } = await getAllfromDb()
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toBeTruthy()
      expect(focusSessions[0].duration).toBeTruthy()
    })
  })

  describe('smoke tests', () => {
    it('test 1', async () => {
      const timestamp1 = new Date('1990')
      const timestamp2 = new Date('1991')
      const timestamp3 = new Date('1992')
      const focusEvents = [
        { pid: 1, processName: 'a.exe', timestamp: timestamp1 },
        { pid: 2, processName: 'b.exe', timestamp: timestamp2 },
        { pid: 3, processName: 'c.exe', timestamp: timestamp3 },
      ]
      mockListener.setMockEvents(focusEvents)

      recorder.startRecording()
      mockListener.emitEvents()
      await delayStopRecording()

      const { focusSessions } = await getAllfromDb()

      expect(focusSessions).toHaveLength(3)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toEqual(timestamp2)
      expect(focusSessions[0].duration).toEqual(timestamp2 - timestamp1)
      expect(focusSessions[1].isActive).toBeFalsy()
      expect(focusSessions[1].startTime).toEqual(timestamp2)
      expect(focusSessions[1].endTime).toEqual(timestamp3)
      expect(focusSessions[1].duration).toEqual(timestamp3 - timestamp2)
      expect(focusSessions[2].isActive).toBeFalsy()
      expect(focusSessions[2].startTime).toEqual(timestamp3)
      expect(focusSessions[0].endTime).toBeTruthy()
      expect(focusSessions[0].duration).toBeTruthy()
    })
  })
})
