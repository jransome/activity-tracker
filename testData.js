// const p1 = Array.from({ length: 150 }, (_, i) => ({ pid: 10 + i, name: `${i}.exe` }))
// const p2 = Array.from({ length: 150 }, (_, i) => ({ pid: 1000 + i, name: `${i}.exe` }))
// const processes = p1.concat(p2)

const starttime1 = new Date("Sat Jul 14 2018 14:41:12 GMT+0100")
const starttime2 = new Date("Sat Jul 14 2018 15:41:12 GMT+0100")

const chrome = (pid, starttime) => ({ pid, name: 'chrome.exe', starttime })
const audacity = (pid, starttime) => ({ pid, name: 'audacity.exe', starttime })
const vscode = (pid, starttime) => ({ pid, name: 'vscode.exe', starttime })

const test1 = {
  snapshot1: [
    chrome(1, starttime1),
    audacity(2, starttime1),
  ],
  snapshot2: [
    chrome(1, starttime1),
  ],
}

const test2 = {
  snapshot1: [
    chrome(1, starttime1),
    audacity(2, starttime1),
  ],
  snapshot2: [
    chrome(2, starttime2),
    vscode(3, starttime2),
  ],
}

const test3 = {
  snapshot1: [
    chrome(1, starttime1),
    audacity(2, starttime1),
  ],
  snapshot2: [
    vscode(3, starttime2)
  ],
  snapshot3: [
    chrome(1, starttime2),
    vscode(3, starttime2)
  ],
}

module.exports = {
  test1,
  test2,
  test3
}
