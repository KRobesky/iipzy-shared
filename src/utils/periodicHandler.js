//const Defs = require("iipzy-shared/src/defs");
const { log } = require("./logFile");

const { collectPeriodicData } = require("./collectPeriodicData");

let inCollectPeriodicData = false;
let periodicData = {};
let periodicDataCollectedTimestamp = 0;
let periodicDataSentTimestamp = 0;

async function init(context) {
  log("perodicHandler.init", "pdat", "info");

  setInterval(async () => {
    log("perodicHandler.interval", "pdat", "info");
    if (!inCollectPeriodicData) {
      inCollectPeriodicData = true;
      try {
        periodicData = await collectPeriodicData();
        periodicDataCollectedTimestamp = Date.now();
      } catch (ex) {
        log("(Exception) collectPeriodicData: " + ex, "pdat", "error");
      }
      inCollectPeriodicData = false;
    }
  }, 60 * 1000);
}

function periodicCB() {
  log(
    "periodicCB: collectedTime = " +
      periodicDataCollectedTimestamp +
      ", sentTime = " +
      periodicDataSentTimestamp,
    "pdat",
    "info"
  );
  if (periodicDataSentTimestamp !== periodicDataCollectedTimestamp) {
    periodicDataSentTimestamp = periodicDataCollectedTimestamp;
    log(
      "periodicCB: returning = " + JSON.stringify(periodicData, null, 2),
      "pdat",
      "info"
    );
    return periodicData;
  }
  return undefined;
}

module.exports = { init, periodicCB };
