const printMilisecondsAsMinSecs = (miliseconds) => `${Math.floor(miliseconds / 60000)} : ${Math.floor((miliseconds % 60000) / 1000)}`

module.exports = { printMilisecondsAsMinSecs }
