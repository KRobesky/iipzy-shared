const {
  getLogDir,
  getLogLevelVerbose,
  getLogPath,
  log,
  logInit,
  setLogLevel,
  timestampToString
} = require("./logFile_impl");
// NB: This module exports logFile_Impl so that only one copy of logFile_Impl is loaded, regardless of where
//  this module is referenced.  Effectively making logFile_Impl a singleton - because it contains shared data.
module.exports = {
  getLogDir,
  getLogLevelVerbose,
  getLogPath,
  log,
  logInit,
  setLogLevel,
  timestampToString
};
