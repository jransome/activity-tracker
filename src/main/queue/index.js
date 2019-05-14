let jobQueue = Promise.resolve()
let queueLength = 0
const errorHandler = (e) => console.error('[QUEUE] Error processing job:', e)

module.exports = (onQueueDrain) => (task) => {
  if (onQueueDrain) queueLength++
  jobQueue = jobQueue
    .then(async () => {
      await task()
      if (onQueueDrain && --queueLength === 0) onQueueDrain()
    })
    .catch(errorHandler)
  return jobQueue
}
