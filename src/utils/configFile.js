//const fs = require("fs");
//const lockfile = require("proper-lockfile");
//var { Mutex } = require("async-mutex");
const { createClient } = require('redis');
const path = require("path");

const Defs = require("../defs");
const { log } = require("./logFile");
const { fileWatch } = require("./fileWatch");
const { sleep } = require("./utils");

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
  constructor(userDataPath, configFilename, master) {
    this.path = path.join(userDataPath, configFilename + ".json");
    log("configFile.constructor: path=" + this.path, "cfg", "info");

    this.configFilename = configFilename;
    this.master = master;

    this.redis_client = null;
    this.redis_subscriber = null;

    //this.lockFile = this.path + ".lock";

    this.data = {};

    this.configWatchCallbacks = [];

    //this.mutex = new Mutex();

    configFileMap.set(configFilename, this);
  }

  async init() {
    log(">>>ConfigFile.init", "cfg", "info");

    this.redis_client = createClient();
    this.redis_client.connect();

    if (this.master) {
      if (fileExistsAsync(this.path)) {
        try {
          this.data = JSON.parse(await fileReadAsync(this.path));
          if (this.data) {
            log(
              "ConfigFile.init - after read: " +
                JSON.stringify(this.data, null, 2),
              "cfg",
              "info"
            );
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
        this.data = {};
        await fileWriteAsync(this.path, this.data);
      }
      // write to redis
      await this.redis_client.publish(this.configFilename, this.jsonObjectToQuotedString(this.data));
    } else {
      // wait forever for config file to exist
      while (true) {
        if (await fileExistsAsync(this.path)) break;
        await sleep(1000);
      }

    }

    setupRedisSubscriber();

    if (this.master) {
      fileWatch(this.path, async path => {
        log("ConfigFile.init.fileWatch: path = " + path, "cfg", "info");
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
    }

    const sub

    log("<<<ConfigFile.init", "cfg", "info");

    return exists;
  }

  jsonObjectToQuotedString(jo) {
    const json = JSON.stringify(jo);
    return json.replace("\"", "\\\"");
  }
  
  jsonObjectFromQuotedString(qs) {
    const json = qs.replace("\\\"", "\"");
    return JSON.parse(json);
  }

  async setupRedisSubscriber() {
    try {
    this.redis_subscriber = this.redis_client.duplicate();
    this.redis_subscriber.connect();
    this.redis_subscriber.on(this.configFilename, this.redisSubscriberHandler.bind(this));
    } catch(ex) {
      log("(Exception) ConfigFile.setupRedisSubscriber: " + ex, "cfg", "error");
    }
  }

  redisSubscriberHandler(data) {
    log("ConfigFile.redisSubscriberHandler: data = " + data, "cfg", "info");
  }

  async watchRedis() {
    //const value = await client.get(this.configFilename);
    //??log("ConfigFile.init.watchRedis: value = " + value, "cfg", "info");
  }

  async read_helper() {
    try {
      this.data = JSON.parse(await fileReadAsync(this.path));
    } catch(ex) {
      log("(Exception) ConfigFile.read_helper: " + ex, "cfg", "error");
    }
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
    log("...>>>set, key=" + key + ", val='" + JSON.stringify(val, null, 2) + "'", "cfg", "info");
    await this.set_helper(key, val);
    log("...<<<set", "cfg", "info");
  }

  async set_helper(key, val) {
    log("...>>>set_helper, key=" + key + ", val='" + JSON.stringify(val, null, 2) + "'", "cfg", "info");
    const valPrev = this.data[key];
    if (val !== valPrev) {
      this.data[key] = val;
      if (this.master) {
        await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
      } else {
        await client.publish(this.configFilename, this.jsonObjectToQuotedString(this.data));
      }
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
