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

/*
  Only the Master reads/writes file
  Only the Master does redis.set()
  Redis persists across reboots
  File has timestamp field to resolve redis vs file contents
  File having a missing or empty timestamp takes presidence over redis
*/

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
    log("configFile.constructor: path=" + this.path + ", filename = " + configFilename + ", master = " + master, "cfg", "info");

    this.configFilename = configFilename;
    this.master = master;

    this.redis_client = null;
    this.redis_update_subscriber = null;
    this.redis_set_subscriber = null;

    this.REDIS_PUBSUB_UPDATE_CHANNEL = "config-update";
    this.REDIS_PUBSUB_SET_CHANNEL = "config-set";
    this.REDIS_KEY_CONFIG = "config";

    //this.lockFile = this.path + ".lock";

    this.data = {};

    this.configWatchCallbacks = [];

    this.ready = false;

    //this.mutex = new Mutex();

    configFileMap.set(configFilename, this);
  }

  async init() {
    log(">>>ConfigFile.init", "cfg", "info");

    let exists = false;

    try {
      this.redis_client = createClient();
      await this.redis_client.connect();
      this.redis_update_subscriber = this.redis_client.duplicate();
      await this.redis_update_subscriber.connect();
      await this.redis_update_subscriber.subscribe(this.REDIS_PUBSUB_UPDATE_CHANNEL, (message) => {
        this.redisUpdateHandler(message);
      });

      let redis_data = null;
      const redis_raw = await this.redis_client.get(this.REDIS_KEY_CONFIG);
      if (redis_raw) {
        redis_data = JSON.parse(redis_raw);
        log("ConfigFile.init - redis_data " + JSON.stringify(redis_data, null, 2), "cfg", "info");
      }

      if (this.master) {
        exists = fileExistsAsync(this.path);
        if (exists) {
          try {
            const data_raw = await fileReadAsync(this.path);
            log("ConfigFile.init - data_raw: " + data_raw, "cfg", "info");
            if (data_raw) {
              this.data = JSON.parse(data_raw);
              log("ConfigFile.init - this.data: " + JSON.stringify(this.data, null, 2), "cfg", "info");
              if (!this.data.ts) {
                this.data.ts = Date.now();
                await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
              } else if (redis_data && redis_data.ts > this.data.ts) {
                this.data = redis_data;
                await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
              } 
            } else {
              log("ConfigFile.init - empty file", "cfg", "info");
              this.data = { ts: Date.now() };
              await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
             }
          } catch (ex) {
            log("(Exception) ConfigFile.init: " + ex, "cfg", "error");
            await fileDeleteAsync(this.path);
            log("ConfigFile.init - new file", "cfg", "info");
            this.data = { ts: Date.now() };
            await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
          }
        } else {
          // create the file.
          log("ConfigFile.init - new file", "cfg", "info");
          this.data = { ts: Date.now() };
          await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
        }
        // write to redis
        await this.redis_client.set(this.REDIS_KEY_CONFIG, JSON.stringify(this.data))
        await this.redis_client.publish(this.REDIS_PUBSUB_UPDATE_CHANNEL, 'update');
        log("ConfigFile.init AFTER PUBLISH", "cfg", "info");

        // enable "set"
        this.redis_set_subscriber = this.redis_client.duplicate();
        await this.redis_set_subscriber.connect();
        await this.redis_set_subscriber.subscribe(this.REDIS_PUBSUB_SET_CHANNEL, (message) => {
          this.redisSetHandler(message);
        });
      } else {
        // not master
        if (redis_data) {
          this.data = redis_data;
        } else {
          // wait forever for config data
          while (true) {
            const redis_data = JSON.parse(await this.redis_client.get(this.REDIS_KEY_CONFIG));
            log("ConfigFile.init - redis_data.2 " + JSON.stringify(redis_data, null, 2), "cfg", "info");
            if (redis_data) {
              this.data = redis_data;
              break;
            }
            await sleep(1000);
          }
        }
      }

      if (this.master) {
        fileWatch(this.path, async path => {
          log("ConfigFile.init.fileWatch: path = " + path, "cfg", "info");
          if (this.path === path) {
            // write to redis
            await this.read_helper();
            await this.redis_client.set(this.REDIS_KEY_CONFIG, JSON.stringify(this.data))
            await this.redis_client.publish(this.REDIS_PUBSUB_UPDATE_CHANNEL, 'update');
          }
        });
      }
    } catch(ex) {
      log("(Exception) ConfigFile.init: " + ex, "cfg", "error");
    }
    
    this.ready = true;

    log("<<<ConfigFile.init", "cfg", "info");

    return exists;
  }

  async redisUpdateHandler(message) {
    log("ConfigFile.redisUpdateHandler: message = " + message, "cfg", "info");
    try {
      if (!this.master) {
        this.data = JSON.parse(await this.redis_client.get(this.REDIS_KEY_CONFIG));
        log("ConfigFile.redisUpdateHandler: data = " + JSON.stringify(this.data), "cfg", "info");
      }
      // call watchers.
      for (let i = 0; i < this.configWatchCallbacks.length; i++) {
        const callback = this.configWatchCallbacks[i];
        callback();
      }   
    } catch(ex) {
      log("(Exception) ConfigFile.redisUpdateHandler: " + ex, "cfg", "error");
    }
  }

  async redisSetHandler(message) {
    log("ConfigFile.redisSetHandler: message = " + message, "cfg", "info");
    try {
      if (this.ready) {
        const jo = JSON.parse(message);
        await this.set(jo.key, jo.val);
      }
    } catch(ex) {
      log("(Exception) ConfigFile.redisSetHandler: " + ex, "cfg", "error");
    }
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
    try {
      const val = this.data[key];
      log("configFile.get, key=" + key + ", val=" + val, "cfg", "info");
      return val;
    } catch (ex) {
      log("(Exception) ConfigFile.get: " + ex, "cfg", "error");
    }
    return null;
  }

  // set property
  async set(key, val) {
    log("ConfigFile.set, key=" + key + ", val='" + JSON.stringify(val, null, 2) + "'", "cfg", "info");
    try {
      await this.set_helper(key, val);
    } catch (ex) {
      log("(Exception) ConfigFile.set: " + ex, "cfg", "error");
    }
    //log("...<<<set", "cfg", "info");
  }

  async set_helper(key, val) {
    log("ConfigFile.set_helper, key=" + key + ", val='" + JSON.stringify(val, null, 2) + "'", "cfg", "info");
    const valPrev = this.data[key];
    if (val !== valPrev) {
      this.data[key] = val;
      if (this.master) {
        this.data.ts = Date.now();
        await fileWriteAsync(this.path, JSON.stringify(this.data, null, 2));
      } else {
        await this.redis_client.publish(this.REDIS_PUBSUB_SET_CHANNEL, JSON.stringify({ key, val}));
      }
      //await this.writeConfigFile(this.data);
    }
    //log("...<<<set_helper", "cfg", "info");
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
