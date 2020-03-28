const moment = require("moment");

const { log } = require("./logFile");

function now() {
  return moment().format("YYYY-MM-DD HH:mm:ss.SSSZ");
}

module.exports = { now };
