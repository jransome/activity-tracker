const printMilisecondsAsMinSecs = (miliseconds) => `${Math.floor(miliseconds / 60000)} minutes, ${Math.floor((miliseconds % 60000) / 1000)} seconds`

module.exports = { printMilisecondsAsMinSecs }
