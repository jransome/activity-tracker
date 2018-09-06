import FocusRecorder from '../../src/FocusRecorder'
import db from '../../src/models'
import purgeDb from '../helpers/purgeDb'
import MockListener from '../helpers/mockListener'
import queue from 'async/queue'

const dbJobQueue = queue(async (task, done) => {
  await task()
  // done()
})

describe('FocusRecorder', () => {
  const mockPoller = jest.fn()
  const mockListener = new MockListener()
  let recorder;

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
    recorder = new FocusRecorder(mockPoller, mockListener, dbJobQueue, db)
    await purgeDb(db)
  })

  xdescribe('saving initial snapshot', () => { })

  describe('saving focus changes', () => {
    it('records a new focus session', async () => {
      const timestamp = new Date('1990')
      const processName = 'a.exe'
      const focusEvent1 = { pid: 1, processName, timestamp }

      await recorder._enqueueFocusUpdate(focusEvent1)

      const { programs, focusSessions } = await getAllfromDb()
      expect(focusSessions).toHaveLength(1)
      expect(focusSessions[0].isActive).toBeTruthy()
      expect(focusSessions[0].startTime).toEqual(timestamp)
      expect(focusSessions[0].endTime).toBeNull()
      expect(focusSessions[0].duration).toBeNull()
      expect(programs).toHaveLength(1)
      expect(programs[0].name).toEqual(processName)
    })

    it('records the end of the current focus session', async () => {
      const timestamp1 = new Date('1990')
      const timestamp2 = new Date('1991')
      const focusEvent1 = { pid: 1, processName: 'a.exe', timestamp: timestamp1 }
      const focusEvent2 = { pid: 2, processName: 'b.exe', timestamp: timestamp2 }

      await recorder._enqueueFocusUpdate(focusEvent1)
      await recorder._enqueueFocusUpdate(focusEvent2)

      const { programs, focusSessions } = await getAllfromDb()
      expect(focusSessions).toHaveLength(2)
      expect(focusSessions[0].isActive).toBeFalsy()
      expect(focusSessions[0].startTime).toEqual(timestamp1)
      expect(focusSessions[0].endTime).toEqual(timestamp2)
      expect(focusSessions[0].duration).toEqual(timestamp2 - timestamp1)
      expect(programs).toHaveLength(2)
      expect(programs[0].focusTime).toEqual(timestamp2 - timestamp1)
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
      const timestamps = [
        new Date('1990'),
        new Date('1991'),
        new Date('1992'),
        new Date('1993'),
        new Date('1994'),
      ]
      const focusEvents = [
        { pid: 1, processName: 'a.exe', timestamp: timestamps[0] },
        { pid: 2, processName: 'b.exe', timestamp: timestamps[1] },
        { pid: 3, processName: 'c.exe', timestamp: timestamps[2] },
        { pid: 2, processName: 'b.exe', timestamp: timestamps[3] },
        { pid: 3, processName: 'c.exe', timestamp: timestamps[4] },
      ]
      mockListener.setMockEvents(focusEvents)

      recorder.startRecording()
      mockListener.emitEvents()
      await delayStopRecording()

      const { programs, focusSessions } = await getAllfromDb()
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
