//--const moment = require("moment");
const printf = require('printf');

function now() {
  //return moment().format("YYYY-MM-DD HH:mm:ss.SSS");
  //return "YYYY-MM-DD HH:mm:ss.SSS";
  const date = new Date();
  const date_string  = printf("%04d-%02d-%02d %02d:%02d:%02d.%03d",
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds());
  return date_string;
}

module.exports = { now };
