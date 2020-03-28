const fs = require("fs");
const lockfile = require("proper-lockfile");
var { Mutex } = require("async-mutex");
const path = require("path");

const Defs = require("../defs");
const { log } = require("./logFile");
const { fileWatch } = require("./fileWatch");

const {
  fileDeleteAsync,
  fileExistsAsync,
  fileReadAsync,
  fileWriteAsync
} = require("./fileIO");

let configFile = null;
const configFileMap = new Map();

class ConfigFile {
  // usage:
  // const configFile = new ConfigFile()
  // ...
  // await configFile.init({
  //   //   configFilename: 'user-preferences',
  //   defaults: {
  //     // 800x600 is the default size of our window
  //     windowBounds: { width: 800, height: 600 }
  //   }
  // });
  constructor(userDataPath, configFilename) {
    this.path = path.join(userDataPath, configFilename + ".json");
    log("configFile.constructor: path=" + this.path, "cfg", "info");

    this.lockFile = this.path + ".lock";

    this.data = {};

    this.configWatchCallbacks = [];

    this.mutex = new Mutex();

    configFileMap.set(configFilename, this);
  }

  async init() {
    log(">>>ConfigFile.init", "cfg", "info");

    if (!(await fileExistsAsync(this.lockFile))) {
      // create the LOCK file.
      log("ConfigFile.constructor - new LOCK file", "cfg", "info");
      await fileWriteAsync(this.lockFile, "{}");
    }

    let exists = false;

    await lockfile
      .lock(this.lockFile)
      .then(async release => {
        log("...>>>lock - init - acquiring lock", "cfg", "info");
        exists = await fileExistsAsync(this.path);
        if (exists) {
          try {
            this.data = JSON.parse(await fileReadAsync(this.path));
            if (this.data) {
              log(
                "ConfigFile.init - after read: " +
                  JSON.stringify(this.data, null, 2),
                "cfg",
                "info"
              );
              exists = true;
            } else {
              log("ConfigFile.init - empty file", "cfg", "info");
              await fileWriteAsync(this.path, "{}");
            }
          } catch (ex) {
            log("(Exception) ConfigFile.init: " + ex, "cfg", "error");
            await fileDeleteAsync(this.path);
            log("ConfigFile.init - new file", "cfg", "info");
            await fileWriteAsync(this.path, "{}");
          }
        } else {
          // create the file.
          log("ConfigFile.init - new file", "cfg", "info");
          await fileWriteAsync(this.path, "{}");
        }
        log("...<<<lock - init - releasing lock", "cfg", "info");
        return release();
      })
      .catch(ex => {
        // either lock could not be acquired
        // or releasing it failed
        log("(Exception) init lockfile.lock: " + ex, "cfg", "error");
      });

    fileWatch(this.path, async path => {
      log("...ConfigFile.fileWatch: path = " + path, "cfg", "info");
      if (this.path === path) {
        //this.data = JSON.parse(await fileReadAsync(this.path));
        await this.read_helper();
        // call watchers.
        for (let i = 0; i < this.configWatchCallbacks.length; i++) {
          const callback = this.configWatchCallbacks[i];
          callback();
        }
      }
    });

    log("<<<ConfigFile.init", "cfg", "info");

    return exists;
  }

  async read_helper() {
    await lockfile
      .lock(this.lockFile)
      .then(async release => {
        log("...>>>lock - read_helper - acquiring lock", "cfg", "info");
        await this.mutex.runExclusive(async () => {
          this.data = JSON.parse(await fileReadAsync(this.path));
        });
        log("...<<<lock - read_helper - releasing lock", "cfg", "info");
        return release();
      })
      .catch(ex => {
        // either lock could not be acquired
        // or releasing it failed
        log("(Exception) read_helper lockfile.lock: " + ex, "cfg", "error");
      });
  }

  watch(callback) {
    this.configWatchCallbacks.push(callback);
  }

  exists(key) {
    return !!this.data[key];
  }

  // get property
  get(key) {
    const val = this.data[key];
    log("...get, key=" + key + ", val=" + val, "cfg", "info");
    return val;
  }

  // set property
  async set(key, val) {
    log(
      "...>>>set, key=" + key + ", val='" + JSON.stringify(val, null, 2) + "'",
      "cfg",
      "info"
    );
    await lockfile
      .lock(this.lockFile)
      .then(async release => {
        log("...>>>lock - set - acquiring lock", "cfg", "info");
        await this.mutex.runExclusive(async () => {
          await this.set_helper(key, val);
        });
        log("...<<<lock - set - releasing lock", "cfg", "info");
        return release();
      })
      .catch(ex => {
        // either lock could not be acquired
        // or releasing it failed
        log("(Exception) set lockfile.lock: " + ex, "cfg", "error");
      });
    log("...<<<set", "cfg", "info");
  }

  async set_helper(key, val) {
    log(
      "...>>>set_helper, key=" +
        key +
        ", val='" +
        JSON.stringify(val, null, 2) +
        "'",
      "cfg",
      "info"
    );
    const valPrev = this.data[key];
    if (val !== valPrev) {
      this.data[key] = val;
      await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
      //await this.writeConfigFile(this.data);
    }
    log("...<<<set_helper", "cfg", "info");
  }
}

function configFileGet(key, configFilename_) {
  const configFilename = !!configFilename_
    ? configFilename_
    : Defs.configFilename;
  log("...configFileGet: title = " + configFilename, "cfg", "info");
  const configFile = configFileMap.get(configFilename);
  return configFile.get(key);
}

async function configFileSet(key, val, configFilename_) {
  const configFilename = !!configFilename_
    ? configFilename_
    : Defs.configFilename;
  log("...configFileSet: title = " + configFilename, "cfg", "info");
  const configFile = configFileMap.get(configFilename);
  await configFile.set(key, val);
}

module.exports = { ConfigFile, configFileGet, configFileSet };
