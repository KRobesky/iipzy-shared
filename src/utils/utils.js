const { log } = require("./logFile");

async function getServiceSuffixes(service) {
  log("getServiceSuffixes: service = " + service, "util", "info");

  const baseDir = "/home/pi/" + service + "-";
  // e.g.: /home/pi/iipzy-sentinel-admin-",
  log("getServiceSuffixes: baseDir = " + baseDir, "util", "info");
  let stat_a_timestampEpoch = 0;
  let stat_b_timestampEpoch = 0;
  if (await fileExistsAsync(baseDir + "a")) {
    const stat_a = await fileStatAsync(baseDir + "a");
    log("getServiceSuffixes - stat_a: " + JSON.stringify(stat_a, null, 2), "util", "info");
    stat_a_timestampEpoch = stat_a.birthtimeMs;
  }
  if (await fileExistsAsync(baseDir + "b")) {
    const stat_b = await fileStatAsync(baseDir + "b");
    log("getServiceSuffixes - stat_b: " + JSON.stringify(stat_b, null, 2), "util", "info");
    stat_b_timestampEpoch = stat_b.birthtimeMs;
  }
  log("getServiceSuffixes: a_ts = " + stat_a_timestampEpoch + ", b_ts = " + stat_b_timestampEpoch, "util", "info");
  return {
    // NB: cur is newest.
    curServiceSuffix : (stat_a_timestampEpoch > stat_b_timestampEpoch) ? "a" : "b",
    // NB: next is oldest.
    nextServiceSuffix : (stat_a_timestampEpoch > stat_b_timestampEpoch) ? "b" : "a"
  }
}

async function processErrorHandler(processStopHandler, processAlertHandler) {
  log(">>>processErrorHandler", "perr", "info");

  process.on("uncaughtException", async (err, origin) => {
    log(
      `(Exception) uncaughtException: ${err}\n` + `Exception origin: ${origin}`,
      "perr",
      "error"
    );
    log("stack: " + err.stack, "perr", "info");
    log("...exiting...", "perr", "info");
    if (processStopHandler)
      await processStopHandler(
        `(Exception) uncaughtException: ${err}\n` +
          `Exception origin: ${origin}`
      );
    await sleep(3000);
    process.exit(97);
  });

  process.on("unhandledRejection", async (reason, promise) => {
    log(
      "(Error) unhandledRejection: promise = " +
        promise +
        ", reason = " +
        reason,
      "perr",
      "error"
    );
    log("stack: " + err.stack, "perr", "info");

    if (processAlertHandler)
      await processAlertHandler(
        "(Error) unhandledRejection: promise = " +
          promise +
          ", reason = " +
          reason
      );
  });

  process.on("warning", async warning => {
    log("(Error) warning: " + warning.name, "perr", "error");
    log("(Error) message: " + warning.message, "perr", "error");
    log("(Error) stack: " + warning.stack, "perr", "info");

    if (processAlertHandler)
      await processAlertHandler(
        "(Error) warning: " +
          warning.name +
          ", message: " +
          warning.message +
          ", stack: " +
          warning.stack
      );
  });

  log("<<<processErrorHandler", "perr", "info");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { getServiceSuffixes, processErrorHandler, sleep };
