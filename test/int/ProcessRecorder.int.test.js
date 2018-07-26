import ProcessRecorder from '../../src/ProcessRecorder'
import db from '../../src/models'
import purgeDb from '../helpers/purgeDb'
import mockProcessFactory from '../helpers/mockProcess'

describe('ProcessRecorder', () => {
  const mockPoller = { snapshot: jest.fn() }
  const interval = 1000
  const processRecorder = new ProcessRecorder(mockPoller, db, interval)

  beforeEach(async () => {
    await purgeDb(db)
  })

  describe('saving to db', () => {
    beforeAll(() => {
      const firstProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(2, "chrome.exe", new Date('1990')),
        mockProcessFactory(3, "audacity.exe", new Date('1990')),
        mockProcessFactory(4, "vscode.exe", new Date('1990')),
        mockProcessFactory(5, "vscode.exe", new Date('1990')),
        mockProcessFactory(6, "chrome.exe", new Date('1990')),
        mockProcessFactory(7, "vscode.exe", new Date('1990')),
      ]
      mockPoller.snapshot.mockResolvedValue(firstProcessSnapshot)
    })

    it('should save programs to the db', async () => {
      await processRecorder.manualUpdateActivity()

      const savedPrograms = await db.Program.findAll()
      expect(savedPrograms).toHaveLength(3)
      expect(savedPrograms[0].name).toEqual("chrome.exe")
      expect(savedPrograms[1].name).toEqual("audacity.exe")
      expect(savedPrograms[2].name).toEqual("vscode.exe")
    })

    it('should save ProgramSessions to the db', async () => {
      await processRecorder.manualUpdateActivity()

      const savedSessions = await db.ProgramSession.findAll()
      expect(savedSessions).toHaveLength(3)
      expect((await savedSessions[0].getProgram()).name).toEqual("chrome.exe")
      expect((await savedSessions[1].getProgram()).name).toEqual("audacity.exe")
      expect((await savedSessions[2].getProgram()).name).toEqual("vscode.exe")
      savedSessions.forEach((session) => {
        expect(session.isActive).toBeTruthy()
        expect(session.startTime).toEqual(new Date('1990'))
      })
    })

    it('should save ProcessSessions to the db', async () => {
      await processRecorder.manualUpdateActivity()

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
        expect(session.startTime).toEqual(new Date('1990'))
      })
    })
  })

  describe('resolving expired sessions', () => {
    beforeEach(async () => {
      const firstProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(2, "chrome.exe", new Date('1990')),
        mockProcessFactory(3, "audacity.exe", new Date('1990')),
        mockProcessFactory(4, "vscode.exe", new Date('1990')),
        mockProcessFactory(5, "vscode.exe", new Date('1990')),
        mockProcessFactory(6, "chrome.exe", new Date('1990')),
        mockProcessFactory(7, "vscode.exe", new Date('1990')),
      ]
      mockPoller.snapshot.mockResolvedValue(firstProcessSnapshot)
      await processRecorder.manualUpdateActivity()
    })

    it('should treat overlapping ProcessSessions as a single ProgramSession', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(2, "chrome.exe", new Date('1991')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)
      await processRecorder.manualUpdateActivity()

      const thirdProcessSnapshot = [
        mockProcessFactory(2, "chrome.exe", new Date('1991')),
        mockProcessFactory(3, "chrome.exe", new Date('1992')),
      ]
      mockPoller.snapshot.mockResolvedValue(thirdProcessSnapshot)
      await processRecorder.manualUpdateActivity()

      const fourthProcessSnapshot = [
        mockProcessFactory(3, "chrome.exe", new Date('1992')),
        mockProcessFactory(4, "chrome.exe", new Date('1993')),
      ]
      mockPoller.snapshot.mockResolvedValue(fourthProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const chromeProgramSessions = await db.Program.find({ where: { name: "chrome.exe" } }).then(chrome => chrome.getProgramSessions())
      expect(chromeProgramSessions).toHaveLength(1)
    })

    it('should treat consecutive processes of the same Program as a single ProgramSession', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(4, "audacity.exe", new Date('1991')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const audacityProgramSessions = await db.Program.find({ where: { name: "audacity.exe" } }).then(audacity => audacity.getProgramSessions())
      const savedSessions = await db.ProgramSession.findAll()
      const audacitySession = savedSessions[1]

      expect(audacityProgramSessions).toHaveLength(1)
      expect(savedSessions).toHaveLength(3)
      expect(audacitySession.isActive).toBeTruthy()
    })

    it('should update expired ProgramSessions', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(5, "vscode.exe", new Date('1990')),
        mockProcessFactory(8, "sfc2.exe", new Date('1991')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const savedSessions = await db.ProgramSession.findAll()
      expect(savedSessions).toHaveLength(4)
      expect(savedSessions[0].isActive).toBeFalsy()
      expect(savedSessions[1].isActive).toBeFalsy()
      expect(savedSessions[2].isActive).toBeTruthy()
      expect(savedSessions[3].isActive).toBeTruthy()
      expect(savedSessions[0].endTime).toBeInstanceOf(Date)
      expect(savedSessions[1].endTime).toBeInstanceOf(Date)
      expect(savedSessions[2].endTime).toBeNull()
      expect(savedSessions[3].endTime).toBeNull()
      expect(typeof savedSessions[0].duration).toBe('number')
      expect(typeof savedSessions[1].duration).toBe('number')
      expect(savedSessions[2].duration).toBeNull()
      expect(savedSessions[3].duration).toBeNull()
    })

    it('should update expired ProcessSessions', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(3, "audacity.exe", new Date('1990')),
        mockProcessFactory(4, "vscode.exe", new Date('1990')),
        mockProcessFactory(7, "vscode.exe", new Date('1990')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const savedSessions = await db.ProcessSession.findAll()
      expect(savedSessions).toHaveLength(7)
      expect(savedSessions[0].isActive).toBeTruthy()
      expect(savedSessions[1].isActive).toBeFalsy()
      expect(savedSessions[2].isActive).toBeTruthy()
      expect(savedSessions[3].isActive).toBeTruthy()
      expect(savedSessions[4].isActive).toBeFalsy()
      expect(savedSessions[5].isActive).toBeFalsy()
      expect(savedSessions[6].isActive).toBeTruthy()
      expect(savedSessions[0].endTime).toBeNull()
      expect(savedSessions[1].endTime).toBeInstanceOf(Date)
      expect(savedSessions[2].endTime).toBeNull()
      expect(savedSessions[3].endTime).toBeNull()
      expect(savedSessions[4].endTime).toBeInstanceOf(Date)
      expect(savedSessions[5].endTime).toBeInstanceOf(Date)
      expect(savedSessions[6].endTime).toBeNull()
    })
  })

  describe('shutting down', () => {
    it('closes all open sessions when recording stops', async () => {
      const processSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(2, "vscode.exe", new Date('1990')),
      ]
      mockPoller.snapshot.mockResolvedValue(processSnapshot)
      await processRecorder.manualUpdateActivity()

      await processRecorder.stopRecording()

      const processSessions = await db.ProcessSession.findAll()
      const programSessions = await db.ProgramSession.findAll()
      expect(processSessions.filter(session => session.isActive)).toHaveLength(0)
      expect(programSessions.filter(session => session.isActive)).toHaveLength(0)
    })
  })

  describe('handling PIDs', () => {
    beforeEach(async () => {
      const firstProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1990')),
        mockProcessFactory(2, "vscode.exe", new Date('1990')),
      ]
      mockPoller.snapshot.mockResolvedValue(firstProcessSnapshot)
      await processRecorder.manualUpdateActivity()
    })

    it('should handle the OS recycling PIDs', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(1, "audacity.exe", new Date('1995')),
        mockProcessFactory(2, "explorer.exe", new Date('1995')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const savedSessions = await db.ProcessSession.findAll()
      expect(savedSessions).toHaveLength(4)
      expect(savedSessions[0].isActive).toBeFalsy()
      expect(savedSessions[1].isActive).toBeFalsy()
      expect(savedSessions[2].isActive).toBeTruthy()
      expect(savedSessions[3].isActive).toBeTruthy()
      expect(savedSessions[0].endTime).toBeInstanceOf(Date)
      expect(savedSessions[1].endTime).toBeInstanceOf(Date)
      expect(savedSessions[2].endTime).toBeNull()
      expect(savedSessions[3].endTime).toBeNull()
    })

    it('should handle the OS recycling PIDs with the same application name', async () => {
      const secondProcessSnapshot = [
        mockProcessFactory(1, "chrome.exe", new Date('1995')),
        mockProcessFactory(2, "chrome.exe", new Date('1995')),
      ]
      mockPoller.snapshot.mockResolvedValue(secondProcessSnapshot)

      await processRecorder.manualUpdateActivity()

      const savedSessions = await db.ProcessSession.findAll()
      expect(savedSessions).toHaveLength(4)
      expect(savedSessions[0].isActive).toBeFalsy()
      expect(savedSessions[1].isActive).toBeFalsy()
      expect(savedSessions[2].isActive).toBeTruthy()
      expect(savedSessions[3].isActive).toBeTruthy()
      expect(savedSessions[0].endTime).toBeInstanceOf(Date)
      expect(savedSessions[1].endTime).toBeInstanceOf(Date)
      expect(savedSessions[2].endTime).toBeNull()
      expect(savedSessions[3].endTime).toBeNull()
    })
  })
})
