const { createLogger, format, transports } = require("winston");
const { combine, label, timestamp, printf } = format;
require("winston-daily-rotate-file");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");

const {
  fileDeleteAsync,
  fileReadDirAsync,
  fileStatAsync
} = require("./fileIO");

//const {now} = require("./time");

//global._8fb20139_fb80_458d_bca5_25310e0c68ec_ = {};

global._8fb20139_fb80_458d_bca5_25310e0c68ec_logger;
global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport;
//--global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportForTailing;
//global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportEx;

// const levels = {
//   error: 0,
//   warn: 1,
//   info: 2,
//   verbose: 3,
//   debug: 4,
//   silly: 5
// };

let logfilePath = null;
let logFilenameBase = null;

let defaultLevel = "verbose";
const fileRetentionDays = 14 * 24 * 60 * 60 * 1000;

function logInit(logfilePath_, logFilenameBase_) {
  logfilePath = logfilePath_;
  logFilenameBase = logFilenameBase_;
  console.log(
    "log: logfilePath = " + logfilePath + ", base = " + logFilenameBase
  );
  const logfileRotate = logFilenameBase + "-%DATE%.log";
  //const logfileRotateEx = logFilenameBase + "-ex-%DATE%.log";
  const datePattern = "YYYY-MM-DD-HH";
  //const datePatternEx = "YYYY-MM-DD";

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport = new transports.DailyRotateFile(
    {
      name: "iipzy",
      filename: logfileRotate,
      dirname: logfilePath,
      datePattern: datePattern,
      zippedArchive: true
      //maxFiles: 24
    }
  );

  // 2023-03-07 - Change file for trailing from actual file to link.
  //--global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportForTailing = new transports.File(
  //--  {
  //--    name: "iipzyTailer",
  //--    filename: logFilenameBase + ".log",
  //--    dirname: logfilePath
  //--  }
  //--);

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport.on(
    "new",
    function(newFilename) {
      log(
        "---transport.new: newFilename = " +
        newFilename,
        "log",
        "info"
      );
      // link file for tailing
      const fileForTailing = path.join(logfilePath, logFilenameBase + ".log");
      try {
        fs.unlinkSync( fileForTailing );
      } catch(ex) {}
      fs.symlinkSync( newFilename, fileForTailing, 'file' );
    }
  );

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport.on(
    "rotate",
    function(oldFilename, newFilename) {
      log(
        "---transport.rotate: oldFilename = " +
          oldFilename +
          ", newFilename = " +
          newFilename,
        "log",
        "info"
      );
      //--// truncate file for tailing
      //--const fileForTailing = path.join(logfilePath, logFilenameBase + ".log");
      //--fs.truncateSync(fileForTailing);
    }
  );

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport.on(
    "archive",
    function(zipFilename) {
      log("---transport.rotate: zipFilename = " + zipFilename, "log", "info");
    }
  );

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport.on(
    "logRemoved",
    function(removedFilename) {
      log(
        "---transport.rotate: removedFilename = " + removedFilename,
        "log",
        "info"
      );
    }
  );

  // global._8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportEx = new transports.DailyRotateFile(
  //   {
  //     filename: logfileRotateEx,
  //     dirname: logfilePath,
  //     datePattern: datePatternEx,
  //     zippedArchive: true //,
  //     //maxFiles: "14d"
  //   }
  // );

  global._8fb20139_fb80_458d_bca5_25310e0c68ec_logger = createLogger({
    name: "iipzyLogger",
    level: defaultLevel,
    format: combine(
      timestamp({
        format: () => {
          return moment().format("YYYY-MM-DD HH:mm:ss.SSSZ");
          //return now();
        }
      }),
      printf(info => {
        let _level = info.level;
        switch (info.level) {
          case "error":
            _level = "error";
            break;
          case "warn":
            _level = "warn ";
            break;
          case "info":
            _level = "info ";
            break;
          case "verbose":
            _level = "trace";
            break;
          case "debug":
            _level = "debug";
            break;
          default:
            _level = "info ";
            break;
        }
        //
        // console.log("++++++label=" + info.label);
        // console.log("++++++level=" + _level);
        let _label = null;
        if (!info.label) _label = "[++++]";
        else _label = "[" + info.label.padEnd(4, " ") + "]";
        return `${info.timestamp} ${_level} ${_label} ${info.message}`;
      })
    ),
    transports: [
      _8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport //--,
      //-- _8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportForTailing,
      //-- new transports.Console()
    ],
    exceptionHandlers: [
      //_8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportEx,
      _8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransport //--,
      //-- _8fb20139_fb80_458d_bca5_25310e0c68ec_fileTransportForTailing,
      //--new transports.Console()
    ],
    exitOnError: false
  });
  log(
    "==== starting ==================================================================",
    "log",
    "info"
  );
  log("---file = " + __filename, "log", "info");

  scheduleDailyWork();
}

function scheduleDailyWork() {
  const rule = new schedule.RecurrenceRule();
  rule.dayOfWeek = [new schedule.Range(0, 6)];
  rule.hour = 0;
  rule.minute = 11;

  const j = schedule.scheduleJob(rule, async function() {
    log("--- running cleanup", "log", "info");
    await logFileCleanup();
  });
}

async function logFileCleanup() {
  //console.log(".....calling fileReadDirAsync");
  const files = await fileReadDirAsync(logfilePath, filterFileArray);
  const filesToDelete = [];

  //console.log("...numfiles = " + files.length);

  const olderThanMs = Date.now() - fileRetentionDays;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const stats = await fileStatAsync(logfilePath + "/" + file);
    if (stats) {
      if (Math.floor(stats.mtimeMs) < olderThanMs) filesToDelete.push(file);
      // console.log(
      //   "..modtime = " + stats.mtimeMs + ", stats.mtime = " + stats.mtime
      // );
    }
  }

  //console.log("...numfiles to delete = " + filesToDelete.length);

  for (let i = 0; i < filesToDelete.length; i++) {
    const path = logfilePath + "/" + filesToDelete[i];
    log("---file cleanup: deleting " + path, "log", "info");
    const res = await fileDeleteAsync(path);
    if (!res) log("(Error) failed to delete " + path, "log", "error");
    //console.log("...deleting: " + file);
  }
  //console.log(files);
}

/*
Stats {
  dev: 2114,
  ino: 48064969,
  mode: 33188,
  nlink: 1,
  uid: 85,
  gid: 100,
  rdev: 0,
  size: 527,
  blksize: 4096,
  blocks: 8,
  atimeMs: 1318289051000.1,
  mtimeMs: 1318289051000.1,
  ctimeMs: 1318289051000.1,
  birthtimeMs: 1318289051000.1,
  atime: Mon, 10 Oct 2011 23:24:11 GMT,
  mtime: Mon, 10 Oct 2011 23:24:11 GMT,
  ctime: Mon, 10 Oct 2011 23:24:11 GMT,
  birthtime: Mon, 10 Oct 2011 23:24:11 GMT }
*/

async function filterFileArray(files) {
  const filteredFiles = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.indexOf(logFilenameBase) === 0) {
      filteredFiles.push(file);
    }
  }
  return filteredFiles;
}

function log(message, label, level) {
  const _label = label ? label : "----";
  const _level = level ? level : "info";

  if (_8fb20139_fb80_458d_bca5_25310e0c68ec_logger) {
    try {
      _8fb20139_fb80_458d_bca5_25310e0c68ec_logger.log({
        level: _level,
        message: message,
        label: _label
      });
    } catch (ex) {
      console.log("(Exception)  log: " + ex);
    }
  } else {
    console.log(_level + " " + _label + " " + message);
    console.log("---file = " + __filename);
  }
}

function timestampToString(timestamp) {
  // NB: convert timestamp to number.
  return moment(timestamp * 1).format("YYYY-MM-DD HH:mm:ss.SSSZ");
}

function setLogLevel(logLevel) {
  console.log("...logLevel = " + logLevel);
  let newLevel;
  switch (logLevel) {
    case "error":
      newLevel = "error";
      break;
    case "warn":
      newLevel = "warn";
      break;
    case "info":
      newLevel = "info";
      break;
    case "trace":
    case "verbose":
      newLevel = "verbose";
      break;
    case "debug":
      newLevel = "debug";
      break;
    default:
      newLevel = "info";
      break;
  }
  if (newLevel != defaultLevel) {
    console.log("...oldLevel = " + defaultLevel + ", newLevel = " + newLevel);
    defaultLevel = newLevel;
    for (
      let i = 0;
      i < global._8fb20139_fb80_458d_bca5_25310e0c68ec_logger.transports.length;
      i++
    ) {
      global._8fb20139_fb80_458d_bca5_25310e0c68ec_logger.transports[
        i
      ].level = newLevel;
    }
  }
}

function getLogDir() {
  return logfilePath;
}

function getLogLevel() {
  return defaultLevel;
}

function getLogPath() {
  return path.join(logfilePath, logFilenameBase + ".log");
}

module.exports = {
  getLogDir,
  getLogLevel,
  getLogPath,
  log,
  logInit,
  setLogLevel,
  timestampToString
};
