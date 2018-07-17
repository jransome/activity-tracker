import db from '../models'
import ProcessRecorder from './index'

const purgeDb = async () => {
  const models = Object.keys(db)
  return await Promise.all(
    models.map((key) => {
      if (key.toLowerCase() === 'sequelize') return null
      return db[key].destroy({ where: {}, force: true })
    })
  )
}

const mockProcessFactory = (pid, name, starttime = new Date) => ({ pid, name, starttime })

describe('process capturer', () => {
  const mockPoller = { snapshot: jest.fn() }
  const interval = 1000
  const processRecorder = new ProcessRecorder(mockPoller, db, interval)

  beforeEach(async () => {
    await purgeDb()
  })

  it('should save programs to the db', async () => {
    const processSnapshot = [
      mockProcessFactory(1, "chrome.exe"),
      mockProcessFactory(2, "chrome.exe"),
      mockProcessFactory(3, "audacity.exe"),
      mockProcessFactory(4, "vscode.exe"),
      mockProcessFactory(5, "vscode.exe"),
      mockProcessFactory(6, "chrome.exe"),
      mockProcessFactory(7, "vscode.exe"),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot)

    await processRecorder.saveSnapshot()

    const savedPrograms = await db.Program.findAll()

    expect(savedPrograms.length).toEqual(3)
    expect(savedPrograms[0].name).toEqual("chrome.exe")
    expect(savedPrograms[1].name).toEqual("audacity.exe")
    expect(savedPrograms[2].name).toEqual("vscode.exe")
  })

  it('should save sessions to the db', async () => {
    const processSnapshot = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(2, "chrome.exe", new Date('1990')),
      mockProcessFactory(3, "audacity.exe", new Date('1990')),
      mockProcessFactory(4, "vscode.exe", new Date('1990')),
      mockProcessFactory(5, "vscode.exe", new Date('1990')),
      mockProcessFactory(6, "chrome.exe", new Date('1990')),
      mockProcessFactory(7, "vscode.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot)

    await processRecorder.saveSnapshot()

    const savedSessions = await db.Session.findAll()

    expect(savedSessions.length).toEqual(7)
    savedSessions.forEach((session, index) => {
      expect(session.pid).toEqual(index + 1)
      expect(session.isActive).toBeTruthy()
      expect(session.startTime).toEqual(new Date('1990'))
    })
  })

  it('should update expired sessions', async () => {
    const processSnapshot1 = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(2, "chrome.exe", new Date('1990')),
      mockProcessFactory(3, "audacity.exe", new Date('1990')),
      mockProcessFactory(4, "vscode.exe", new Date('1990')),
      mockProcessFactory(5, "vscode.exe", new Date('1990')),
      mockProcessFactory(6, "chrome.exe", new Date('1990')),
      mockProcessFactory(7, "vscode.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot1)
    await processRecorder.saveSnapshot()

    const processSnapshot2 = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(3, "audacity.exe", new Date('1990')),
      mockProcessFactory(4, "vscode.exe", new Date('1990')),
      mockProcessFactory(7, "vscode.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot2)
    await processRecorder.saveSnapshot()

    const savedSessions = await db.Session.findAll()

    expect(savedSessions.length).toEqual(7)
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

  it('should handle the OS recycling PIDs', async () => {
    const processSnapshot1 = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(2, "vscode.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot1)
    await processRecorder.saveSnapshot()

    const processSnapshot2 = [
      mockProcessFactory(1, "audacity.exe", new Date('1995')),
      mockProcessFactory(2, "explorer.exe", new Date('1995')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot2)
    await processRecorder.saveSnapshot()

    const savedSessions = await db.Session.findAll()

    expect(savedSessions.length).toEqual(4)
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
    const processSnapshot1 = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(2, "chrome.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot1)
    await processRecorder.saveSnapshot()

    const processSnapshot2 = [
      mockProcessFactory(1, "chrome.exe", new Date('1995')),
      mockProcessFactory(2, "chrome.exe", new Date('1995')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot2)
    await processRecorder.saveSnapshot()

    const savedSessions = await db.Session.findAll()

    expect(savedSessions.length).toEqual(4)
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
