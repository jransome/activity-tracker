import processPoller from 'process-list' // this package does not install correctly on mac, commented out when developing on mac

export default async () => {
  const fields = ['pid', 'name', 'path'] // TODO: use path?
  return {
    timestamp: new Date(),
    snapshot: await processPoller.snapshot(fields)
  }
}
