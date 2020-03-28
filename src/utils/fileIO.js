var { Mutex } = require("async-mutex");
const path = require("path");
const fs = require("fs");

const { log } = require("./logFile");

const mutex = new Mutex();

async function fileChmodAsync(path, mode) {
  return await new Promise((resolve, reject) => {
    fs.chmod(path, mode, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

async function fileDeleteAsync_helper(path) {
  return await new Promise((resolve, reject) => {
    fs.unlink(path, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

async function fileDeleteAsync(path, deleteBak) {
  let ret = await fileDeleteAsync_helper(path);
  if (deleteBak) {
    const pathBak = path + ".bak";
    ret = await fileDeleteAsync_helper(pathBak);
  }
  return ret;
}

async function fileExistsAsync(path) {
  return await new Promise((resolve, reject) => {
    fs.exists(path, exists => {
      resolve(exists);
    });
  });
}

async function fileReadAsync(path) {
  let res = null;
  await mutex.runExclusive(async () => {
    res = await fileReadAsync_helper(path);
  });
  return res;
}

async function fileReadAsync_helper(path) {
  const pathBak = path + ".bak";

  try {
    if (await fileExistsAsync(path)) {
      // read from path.
      return await new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    } else {
      // see if .bak exists.  If so, rename then read.
      if (await fileExistsAsync(pathBak)) {
        await new Promise((resolve, reject) => {
          fs.rename(pathBak, path, err => {
            if (err) reject(err);
            else resolve();
          });
        });
        return await new Promise((resolve, reject) => {
          fs.readFile(path, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
      }
    }
  } catch (ex) {
    log("(Exception) fileReadAsync: " + ex, "fio", "error");
  }
  return null;
}

async function fileReadDirAsync(path, filter) {
  try {
    // get list of files.
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, files) => {
        if (err) resolve([]);
        else resolve(filter ? filter(files) : files);
      });
    });
  } catch (ex) {
    log("(Exception) fileReadDirAsync: " + ex, "fio", "error");
    return [];
  }
}

async function fileRenameAsync(oldPath, newPath) {
  try {
    // rename
    return new Promise((resolve, reject) => {
      fs.rename(oldPath, newPath, err => {
        if (err) resolve(false);
        else resolve(true);
      });
    });
  } catch (ex) {
    log("(Exception) fileRenameAsync: " + ex, "fio", "error");
    return false;
  }
}

async function fileStatAsync(path) {
  try {
    // get stats.
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, stats) => {
        if (err) resolve({});
        else resolve(stats);
      });
    });
  } catch (ex) {
    log("(Exception) fileStatAsync: " + ex, "fio", "error");
    return {};
  }
}

async function fileWriteAsync(path, data) {
  await mutex.runExclusive(async () => {
    await fileWriteAsync_helper(path, data);
  });
}

async function fileWriteAsync_helper(path, data) {
  const pathNew = path + ".new";
  const pathBak = path + ".bak";

  try {
    // delete any path.bak
    await new Promise((resolve, reject) => {
      fs.unlink(pathBak, err => {
        resolve();
      });
    });
    // rename path to path.bak
    await new Promise((resolve, reject) => {
      fs.rename(path, pathBak, err => {
        resolve();
      });
    });
    // write to path.new
    await new Promise((resolve, reject) => {
      fs.writeFile(pathNew, data, err => {
        if (err) reject(err);
        else resolve();
      });
    });
    // rename path.new to path
    await new Promise((resolve, reject) => {
      fs.rename(pathNew, path, err => {
        resolve();
      });
    });
  } catch (ex) {
    log("(Exception) fileWriteAsync: " + ex, "fio", "error");
  }
}

module.exports = {
  fileChmodAsync,
  fileDeleteAsync,
  fileExistsAsync,
  fileReadAsync,
  fileReadDirAsync,
  fileRenameAsync,
  fileStatAsync,
  fileWriteAsync
};
