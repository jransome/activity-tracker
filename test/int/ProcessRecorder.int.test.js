import ProcessRecorder from '../../src/ProcessRecorder'
import db from '../../src/models'
import purgeDb from '../helpers/purgeDb'
import mockProcessFactory from '../helpers/mockProcess'
import MockListener from '../helpers/mockListener'
import queue from 'async/queue'

const dbJobQueue = queue(async (task, done) => {
  await task()
  done()
})

describe('ProcessRecorder', () => {
  const mockPoller = jest.fn()
  const mockListener = new MockListener()
  const recorder = new ProcessRecorder(mockPoller, mockListener, dbJobQueue, db)

  const delayStopRecording = (time) => {
    return new Promise(resolve => {
      setTimeout(async () => {
        await recorder.stopRecording()
        resolve()
      }, time)
    })
  }

  const getAllfromDb = async () => ({
    processSessions: await db.ProcessSession.findAll(),
    programSessions: await db.ProgramSession.findAll(),
    programs: await db.Program.findAll(),
  })

  beforeEach(async () => {
    await purgeDb(db)
  })

  describe('saving initial snapshot', () => {
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

  describe('saving process traces', () => {
    it('records start traces for previously unrecorded programs', async () => {
      const pid = 1
      const processName = 'abc.exe'
      const timeStamp = new Date('1990')
      const startTrace = { type: 'startTrace', pid, processName, timeStamp }

      await recorder._enqueueTraceUpdate(startTrace)

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(processSessions).toHaveLength(1)
      expect((await processSessions[0].getProgram()).name).toEqual(processName)
      expect(processSessions[0].isActive).toBeTruthy()
      expect(processSessions[0].startTime).toEqual(timeStamp)
      expect(processSessions[0].ProgramSessionId).toEqual(1)
      expect(processSessions[0].pid).toEqual(pid)

      expect(programSessions).toHaveLength(1)
      expect((await programSessions[0].getProgram()).name).toEqual(processName)
      expect(programSessions[0].isActive).toBeTruthy()
      expect(programSessions[0].startTime).toEqual(timeStamp)

      expect(programs).toHaveLength(1)
      expect(programs[0].name).toEqual(processName)
    })

    it('records start traces for already active programs', async () => {
      const processName = 'abc.exe'
      const previousStartTrace = { type: 'startTrace', pid: 1, processName, timeStamp: new Date('1990') }
      await recorder._enqueueTraceUpdate(previousStartTrace)

      const startTrace = { type: 'startTrace', pid: 2, processName, timeStamp: new Date('1991') }
      await recorder._enqueueTraceUpdate(startTrace)

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(processSessions).toHaveLength(2)
      expect(programSessions).toHaveLength(1)
      expect(programs).toHaveLength(1)

      expect((await processSessions[0].getProgram()).name).toEqual(processName)
      expect(processSessions[0].isActive).toBeTruthy()
      expect(processSessions[0].startTime).toEqual(previousStartTrace.timeStamp)
      expect(processSessions[0].ProgramSessionId).toEqual(1)
      expect(processSessions[0].pid).toEqual(previousStartTrace.pid)

      expect((await processSessions[1].getProgram()).name).toEqual(processName)
      expect(processSessions[1].isActive).toBeTruthy()
      expect(processSessions[1].startTime).toEqual(startTrace.timeStamp)
      expect(processSessions[1].ProgramSessionId).toEqual(1)
      expect(processSessions[1].pid).toEqual(startTrace.pid)

      expect((await programSessions[0].getProgram()).name).toEqual(processName)
      expect(programSessions[0].isActive).toBeTruthy()
      expect(programSessions[0].startTime).toEqual(previousStartTrace.timeStamp)

      expect(programs[0].name).toEqual(processName)
    })

    it('records the last stop trace for an active program', async () => {
      const processName = 'abc.exe'
      const pid = 1
      const previousStartTrace = { type: 'startTrace', pid, processName, timeStamp: new Date('1990') }
      await recorder._enqueueTraceUpdate(previousStartTrace)

      const stopTrace = { type: 'stopTrace', pid, processName, timeStamp: new Date('1991') }
      const duration = stopTrace.timeStamp - previousStartTrace.timeStamp
      await recorder._enqueueTraceUpdate(stopTrace)

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(processSessions).toHaveLength(1)
      expect(programSessions).toHaveLength(1)
      expect(programs).toHaveLength(1)

      expect((await processSessions[0].getProgram()).name).toEqual(processName)
      expect(processSessions[0].isActive).toBeFalsy()
      expect(processSessions[0].startTime).toEqual(previousStartTrace.timeStamp)
      expect(processSessions[0].endTime).toEqual(stopTrace.timeStamp)
      expect(processSessions[0].ProgramSessionId).toEqual(1)
      expect(processSessions[0].pid).toEqual(pid)

      expect((await programSessions[0].getProgram()).name).toEqual(processName)
      expect(programSessions[0].isActive).toBeFalsy()
      expect(programSessions[0].startTime).toEqual(previousStartTrace.timeStamp)
      expect(programSessions[0].endTime).toEqual(stopTrace.timeStamp)
      expect(programSessions[0].duration).toEqual(duration)

      expect(programs[0].name).toEqual(processName)
      expect(programs[0].upTime).toEqual(duration)
    })

    it('records stop traces for an active program that is still running', async () => {
      const processName = 'abc.exe'
      const firstProcessStart = { type: 'startTrace', pid: 1, processName, timeStamp: new Date('1990') }
      const secondProcessStart = { type: 'startTrace', pid: 2, processName, timeStamp: new Date('1991') }
      await recorder._enqueueTraceUpdate(firstProcessStart)
      await recorder._enqueueTraceUpdate(secondProcessStart)

      const firstProcessStop = { type: 'stopTrace', pid: 1, processName, timeStamp: new Date('1992') }
      await recorder._enqueueTraceUpdate(firstProcessStop)

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(processSessions).toHaveLength(2)
      expect(programSessions).toHaveLength(1)
      expect(programs).toHaveLength(1)

      expect((await processSessions[0].getProgram()).name).toEqual(processName)
      expect(processSessions[0].isActive).toBeFalsy()
      expect(processSessions[0].startTime).toEqual(firstProcessStart.timeStamp)
      expect(processSessions[0].endTime).toEqual(firstProcessStop.timeStamp)
      expect(processSessions[0].ProgramSessionId).toEqual(1)
      expect(processSessions[0].pid).toEqual(1)

      expect((await programSessions[0].getProgram()).name).toEqual(processName)
      expect(programSessions[0].isActive).toBeTruthy()
      expect(programSessions[0].startTime).toEqual(firstProcessStart.timeStamp)
      expect(programSessions[0].endTime).toBeNull()
      expect(programSessions[0].duration).toBeNull()

      expect(programs[0].name).toEqual(processName)
      expect(programs[0].upTime).toBeNull()
    })
  })

  describe('shutting down', () => {
    it('closes all open sessions when recording stops', async () => {
      const snapshot = [
        mockProcessFactory(1, 'chrome.exe'),
        mockProcessFactory(2, 'vscode.exe'),
      ]
      mockPoller.mockResolvedValue({
        timeStamp: new Date(),
        snapshot
      })

      recorder.startRecording()
      await delayStopRecording()

      const { processSessions, programSessions } = await getAllfromDb()
      expect(processSessions.filter(session => session.isActive)).toHaveLength(0)
      expect(programSessions.filter(session => session.isActive)).toHaveLength(0)
    })
  })

  describe('smoke tests', () => {
    it('test 1', async () => {
      const snapshotTimestamp = new Date('1990')
      const traceTimestamp1 = new Date('1991')
      const traceTimestamp2 = new Date('1992')
      const traceTimestamp3 = new Date('1993')
      const traceTimestamp4 = new Date('1994')
      const snapshot = [
        mockProcessFactory(1, 'a.exe'),
        mockProcessFactory(2, 'b.exe'),
      ]
      mockPoller.mockResolvedValue({
        timestamp: snapshotTimestamp,
        snapshot
      })
      const traces = [
        { type: 'startTrace', pid: 3, processName: 'c.exe', timeStamp: traceTimestamp1 },
        { type: 'stopTrace', pid: 1, processName: 'a.exe', timeStamp: traceTimestamp1 },
        { type: 'startTrace', pid: 1, processName: 'd.exe', timeStamp: traceTimestamp1 },
        { type: 'stopTrace', pid: 2, processName: 'b.exe', timeStamp: traceTimestamp2 },
        { type: 'stopTrace', pid: 3, processName: 'c.exe', timeStamp: traceTimestamp3 },
        { type: 'startTrace', pid: 3, processName: 'b.exe', timeStamp: traceTimestamp3 },
        { type: 'stopTrace', pid: 1, processName: 'd.exe', timeStamp: traceTimestamp3 },
        { type: 'stopTrace', pid: 3, processName: 'b.exe', timeStamp: traceTimestamp4 },
      ]
      mockListener.setMockTraces(traces)

      recorder.startRecording()
      mockListener.emitTraces()
      await delayStopRecording()

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(programs).toHaveLength(4)
      expect(programs[0].upTime).toEqual(traceTimestamp1 - snapshotTimestamp)
      expect(programs[1].upTime).toEqual((traceTimestamp2 - snapshotTimestamp) + (traceTimestamp4 - traceTimestamp3))
      expect(programs[2].upTime).toEqual(traceTimestamp3 - traceTimestamp1)
      expect(programs[3].upTime).toEqual(traceTimestamp3 - traceTimestamp1)
      expect(programSessions).toHaveLength(5)
      expect(processSessions).toHaveLength(5)
    })

    it('test 2', async () => {
      const snapshotTimestamp = new Date('1990')
      const traceTimestamp1 = new Date('1991')
      const traceTimestamp2 = new Date('1992')
      const traceTimestamp3 = new Date('1993')
      const traceTimestamp4 = new Date('1994')
      const snapshot = [
        mockProcessFactory(1, 'a.exe'),
        mockProcessFactory(2, 'b.exe'),
      ]
      mockPoller.mockResolvedValue({
        timestamp: snapshotTimestamp,
        snapshot
      })
      const traces = [
        { type: 'startTrace', pid: 3, processName: 'a.exe', timeStamp: traceTimestamp1 },
        { type: 'startTrace', pid: 4, processName: 'a.exe', timeStamp: traceTimestamp2 },
        { type: 'stopTrace', pid: 3, processName: 'a.exe', timeStamp: traceTimestamp3 },
        { type: 'stopTrace', pid: 4, processName: 'a.exe', timeStamp: traceTimestamp3 },
        { type: 'stopTrace', pid: 2, processName: 'b.exe', timeStamp: traceTimestamp4 },
        { type: 'stopTrace', pid: 1, processName: 'a.exe', timeStamp: traceTimestamp4 },
      ]
      mockListener.setMockTraces(traces)

      recorder.startRecording()
      mockListener.emitTraces()
      await delayStopRecording()

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(programs).toHaveLength(2)
      expect(programs[0].upTime).toEqual(traceTimestamp4 - snapshotTimestamp)
      expect(programs[1].upTime).toEqual(traceTimestamp4 - snapshotTimestamp)
      expect(programSessions).toHaveLength(2)
      expect((await programs[0].getProgramSessions())).toHaveLength(1)
      expect((await programs[1].getProgramSessions())).toHaveLength(1)
      expect(processSessions).toHaveLength(4)
    })

    it('test 3', async () => {
      const snapshotTimestamp = new Date('1990')
      const traceTimestamp1 = new Date('1991')
      const traceTimestamp2 = new Date('1992')
      const traceTimestamp3 = new Date('1993')
      const traceTimestamp4 = new Date('1994')
      const snapshot = [
        mockProcessFactory(1, 'a.exe'),
      ]
      mockPoller.mockResolvedValue({
        timestamp: snapshotTimestamp,
        snapshot
      })
      const traces = [
        { type: 'stopTrace', pid: 3, processName: 'process_that_wasnt_in_initial_snapshot.exe', timeStamp: traceTimestamp1 },
        { type: 'stopTrace', pid: 1, processName: 'process_that_wasnt_in_initial_snapshot.exe', timeStamp: traceTimestamp1 },
        { type: 'startTrace', pid: 1, processName: 'process_that_wasnt_in_initial_snapshot.exe', timeStamp: traceTimestamp2 },
        { type: 'stopTrace', pid: 1, processName: 'process_that_wasnt_in_initial_snapshot.exe', timeStamp: traceTimestamp3 },
        { type: 'stopTrace', pid: 1, processName: 'a.exe', timeStamp: traceTimestamp4 },
      ]
      mockListener.setMockTraces(traces)

      recorder.startRecording()
      mockListener.emitTraces()
      await delayStopRecording()

      const { processSessions, programSessions, programs } = await getAllfromDb()
      expect(programs).toHaveLength(2)
      expect(programs[0].upTime).toEqual(traceTimestamp4 - snapshotTimestamp)
      expect(programs[1].upTime).toEqual(traceTimestamp3 - traceTimestamp2)
      expect(programSessions).toHaveLength(2)
      expect((await programs[0].getProgramSessions())).toHaveLength(1)
      expect((await programs[1].getProgramSessions())).toHaveLength(1)
      expect(processSessions).toHaveLength(2)
    })
  })
})
