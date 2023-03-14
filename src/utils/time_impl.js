const moment = require("moment");
//const printf = require('printf');

//const { log } = require("./logFile");

let timezoneOffsetMinutes = 0;

function local_hour_to_gmt_hour(local_hour) {
  return Math.abs(moment().add(timezoneOffsetMinutes, 'minutes').hour());
}

function now() {
  return moment().format("YYYY-MM-DD HH:mm:ss.SSSZ");
  //return "YYYY-MM-DD HH:mm:ss.SSS";
  /*
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
  */
}

function now_local() {
  return moment().add(timezoneOffsetMinutes, 'minutes').format('MMMM Do YYYY, h:mm:ss a');
}

function set_timezoneOffsetMinutes(timezoneOffset) {
  const tzo = parseInt(timezoneOffset);
  const neg = tzo < 0;
  const tzo_abs = Math.abs(tzo);
  const tzo_hrs = ~~(tzo_abs / 100);
  const tzo_mins = ~~(tzo_abs % 100);
  let tzo_totalmins=tzo_hrs*60 + tzo_mins;
  if (neg) tzo_totalmins = -tzo_totalmins;
  timezoneOffsetMinutes = tzo_totalmins;
}

module.exports = { local_hour_to_gmt_hour, now, now_local, set_timezoneOffsetMinutes };
