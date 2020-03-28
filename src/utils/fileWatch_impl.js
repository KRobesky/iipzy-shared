const fs = require("fs");
const path = require("path");

const { log } = require("./logFile");

// for fs.watchFile
let fileWatcherCallbacks = [];

async function fileWatch(path_, callback) {
  console.log("fileWatch: path_ = " + path_);
  fileWatcherCallbacks.push({ callback, path: path_ });
  fs.watchFile(path_, fileWatcherCallback);
}

function fileWatcherCallback(curr, prev) {
  log(
    "fileWatcherCallback: curr = " + curr.mtimeMs + ", prev = " + prev.mtimeMs,
    "fwat",
    "info"
  );
  if (curr.mtime !== prev.mtime) {
    for (let i = 0; i < fileWatcherCallbacks.length; i++) {
      const { callback, path } = fileWatcherCallbacks[i];
      log("fileWatcherCallback: path = " + path, "fwat", "info");
      callback(path);
    }
  }
}

// // for fs.watch
// const fileWatcherCallbacksByPath = new Map();

// async function fileWatch(path_, callback) {
//   console.log("fileWatch: path_ = " + path_);
//   const filename = path.basename(path_);
//   console.log("fileWatch: filename = " + filename);

//   let fileWatcherCallbacks = fileWatcherCallbacksByPath.get(filename);
//   if (!fileWatcherCallbacks) {
//     fileWatcherCallbacks = [callback];
//     fs.watch(path_, fileWatcherCallback);
//   } else {
//     fileWatcherCallbacks.push(callback);
//   }
//   fileWatcherCallbacksByPath.set(filename, fileWatcherCallbacks);
// }

// function fileWatcherCallback(eventType, filename) {
//   // console.log(
//   //   "fileWatcherCallback: event = " + eventType + ", filename = " + filename
//   // );
//   if (eventType === "change") {
//     const fileWatcherCallbacks = fileWatcherCallbacksByPath.get(filename);
//     if (fileWatcherCallbacks) {
//       for (let i = 0; i < fileWatcherCallbacks.length; i++) {
//         const callback = fileWatcherCallbacks[i];
//         callback(filename);
//       }
//     }
//   }
// }

module.exports = {
  fileWatch
};
