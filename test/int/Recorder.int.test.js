import Recorder from '../../src/Recorder'
import db from '../../src/models'
import purgeDb from '../helpers/purgeDb'
import mockProcessFactory from '../helpers/mockProcess'
import MockListener from '../helpers/mockListener'
import dateHelper from '../helpers/mockDate'

describe('Recorder', () => {
  const mockPoller = { snapshot: jest.fn() }
  const mockListener = new MockListener()
  const recorder = new Recorder(mockPoller, mockListener, db)

  const delayStopRecording = (time) => {
    return new Promise(resolve => {
      setTimeout(async () => {
        await recorder.stopRecording()
        resolve()
      }, time)
    })
  }

  beforeEach(async () => {
    await purgeDb(db)
  })

  afterAll(() => {
    dateHelper.restoreDate()
  })

  describe('saving initial snapshot', () => {
    const date = new Date('1990')

    beforeAll(() => {
      dateHelper.stubDate(date)
      const firstProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe"),
        mockProcessFactory(2, "chrome.exe"),
        mockProcessFactory(3, "audacity.exe"),
        mockProcessFactory(4, "vscode.exe"),
        mockProcessFactory(5, "vscode.exe"),
        mockProcessFactory(6, "chrome.exe"),
        mockProcessFactory(7, "vscode.exe"),
      ]
      mockPoller.snapshot.mockResolvedValue(firstProcessSnapshot)
    })

    it('should save programs to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedPrograms = await db.Program.findAll()
      expect(savedPrograms).toHaveLength(3)
      expect(savedPrograms[0].name).toEqual("chrome.exe")
      expect(savedPrograms[1].name).toEqual("audacity.exe")
      expect(savedPrograms[2].name).toEqual("vscode.exe")
    })

    it('should save ProgramSessions to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedSessions = await db.ProgramSession.findAll()
      expect(savedSessions).toHaveLength(3)
      expect((await savedSessions[0].getProgram()).name).toEqual("chrome.exe")
      expect((await savedSessions[1].getProgram()).name).toEqual("audacity.exe")
      expect((await savedSessions[2].getProgram()).name).toEqual("vscode.exe")
      savedSessions.forEach((session) => {
        expect(session.isActive).toBeTruthy()
        expect(session.startTime).toEqual(date)
      })
    })

    it('should save ProcessSessions to the db', async () => {
      await recorder._enqueueSnapshot()

      const savedSessions = await db.ProcessSession.findAll()
      expect(savedSessions).toHaveLength(7)
      expect((await savedSessions[0].getProgram()).name).toEqual("chrome.exe")
      expect((await savedSessions[1].getProgram()).name).toEqual("chrome.exe")
      expect((await savedSessions[2].getProgram()).name).toEqual("audacity.exe")
      expect((await savedSessions[3].getProgram()).name).toEqual("vscode.exe")
      expect((await savedSessions[4].getProgram()).name).toEqual("vscode.exe")
      expect((await savedSessions[5].getProgram()).name).toEqual("chrome.exe")
      expect((await savedSessions[6].getProgram()).name).toEqual("vscode.exe")
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
        expect(session.startTime).toEqual(date)
      })
    })
  })

  describe('saving process traces', () => { 
    // TODO
  })

  describe('shutting down', () => {
    it('closes all open sessions when recording stops', async () => {
      const processSnapshot = [
        mockProcessFactory(1, "chrome.exe"),
        mockProcessFactory(2, "vscode.exe"),
      ]
      mockPoller.snapshot.mockResolvedValue(processSnapshot)

      recorder.startRecording()
      await delayStopRecording()

      const processSessions = await db.ProcessSession.findAll()
      const programSessions = await db.ProgramSession.findAll()
      expect(processSessions.filter(session => session.isActive)).toHaveLength(0)
      expect(programSessions.filter(session => session.isActive)).toHaveLength(0)
    })
  })

  // describe('handling PIDs', () => {
  //   beforeEach(async () => {
  //     dateHelper.stubDate(new Date('1990'))
  //     const firstProcessSnapshot = [
  //       mockProcessFactory(1, "chrome.exe"),
  //       mockProcessFactory(2, "vscode.exe"),
  //     ]
  //     mockPoller.snapshot.mockResolvedValue(firstProcessSnapshot)
  //     await recorder.manualUpdateActivity()
  //   })

  //   it('should handle the OS recycling PIDs', async () => {
  //     const secondSnapshotDate = new Date('1991')
  //     dateHelper.stubDate(secondSnapshotDate)
  //     const secondProcessSnapshot = [
  //       mockProcessFactory(1, "audacity.exe"),
  //       mockProcessFactory(2, "explorer.exe"),
  //     ]
  //     mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

  //     await recorder.manualUpdateActivity()

  //     const savedSessions = await db.ProcessSession.findAll()
  //     expect(savedSessions).toHaveLength(4)
  //     expect(savedSessions[0].isActive).toBeFalsy()
  //     expect(savedSessions[1].isActive).toBeFalsy()
  //     expect(savedSessions[2].isActive).toBeTruthy()
  //     expect(savedSessions[3].isActive).toBeTruthy()
  //     expect(savedSessions[0].endTime).toBe(secondSnapshotDate)
  //     expect(savedSessions[1].endTime).toBe(secondSnapshotDate)
  //     expect(savedSessions[2].endTime).toBeNull()
  //     expect(savedSessions[3].endTime).toBeNull()
  //   })
  // })
})
