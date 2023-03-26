const { log } = require("./logFile");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

module.exports = { processErrorHandler, sleep };
