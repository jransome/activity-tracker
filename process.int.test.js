import db from './src/models'
import processRecorder from './process'

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

describe('process capturer', async () => {
  const mockPoller = { snapshot: jest.fn() }
  const saveSnapshot = processRecorder(mockPoller, db)

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

    await saveSnapshot()

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

    await saveSnapshot()

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
    await saveSnapshot()

    const processSnapshot2 = [
      mockProcessFactory(1, "chrome.exe", new Date('1990')),
      mockProcessFactory(3, "audacity.exe", new Date('1990')),
      mockProcessFactory(4, "vscode.exe", new Date('1990')),
      mockProcessFactory(7, "vscode.exe", new Date('1990')),
    ]
    mockPoller.snapshot.mockResolvedValue(processSnapshot2)
    await saveSnapshot()

    const savedSessions = await db.Session.findAll()

    expect(savedSessions.length).toEqual(7)
    expect(savedSessions[1].isActive).toBeFalsy()
    expect(savedSessions[4].isActive).toBeFalsy()
    expect(savedSessions[5].isActive).toBeFalsy()
  })
})
