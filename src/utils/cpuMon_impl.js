const { log } = require("./logFile");
const { sleep } = require("./utils");
const { spawnAsync } = require("./spawnAsync");

class CpuMon {
  constructor(title, intervalSeconds, dataFunc) {
    log("CpuMon.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "cpum", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;

    this.interval = null;
  }

  initSample() {
    return {
      sample_time     : Date.now(),
      temp_celsius    : parseFloat(0),
      cpu_utlz_user   : parseFloat(0),
      cpu_utlz_nice   : parseFloat(0),
      cpu_utlz_system : parseFloat(0),
      cpu_utlz_iowait : parseFloat(0),
      cpu_utlz_steal  : parseFloat(0),
      cpu_utlz_idle   : parseFloat(0),
      mem_use_pct     : parseFloat(0)
    }
  }
    
  startSendSample() {
    this.getCpuData();
    this.interval = setInterval(() => {
      this.getCpuData(); 
    }, this.intervalSeconds * 1000);      
  }

  stopSendSample() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async getCpuData() {
    log("CpuMon.getCpuData", "cpum", "info");

    let sample = this.initSample();
    try {
      // temp
      const { stdout, stderr } = await spawnAsync("cat", ["/sys/devices/virtual/thermal/thermal_zone0/temp"]);
      if (stderr) {
        log("(Error) CpuMon.getCpuData - temp: " + stderr, "cpum", "error");
      } else {
        sample.temp_celsius = parseFloat((parseInt(stdout)/1000).toFixed(1));
      }

      {
        // cpu utilization
        const { stdout, strerr } = await spawnAsync("iostat", ["-y", "-c"]);
        if (stderr) {
          log("(Error) CpuMon.getCpuData - utlz: " + stderr, "cpum", "error");
        } else {
          //log("CpuMon.getCpuData: utilization = " + stdout);
          const lines = stdout.split('\n');
          const line = lines[3];
          const parts = line.replace(/\s\s+/g, ' ').split(' ');
          sample.cpu_utlz_user    = parseFloat(parts[1]);
          sample.cpu_utlz_nice    = parseFloat(parts[2]);
          sample.cpu_utlz_system  = parseFloat(parts[3]);
          sample.cpu_utlz_iowait  = parseFloat(parts[4]);
          sample.cpu_utlz_steal   = parseFloat(parts[5]);
          sample.cpu_utlz_idle    = parseFloat(parts[6]);
        }
      }
      {
        // memory
        const { stdout, stderr } = await spawnAsync("free", []);
        if (stderr) {
          log("(Error) CpuMon.getCpuData - utlz: " + stderr, "cpum", "error");
        } else if (stdout) {
          //            total          used        free      shared  buff/cache   available
          //Mem:        3928784     3635720      186172       27540      106892      217036
          const rows = stdout.split("\n");
          const fields = rows[1].match(/\S+/g);
          let total = parseInt(fields[1]);
          let used = parseInt(fields[2]);
          sample.mem_use_pct = ((used / total) * 100).toFixed(1);
        }
      }
    } catch (ex) {
      log("(Exception) CpuMon.getCpuData: " + ex, "cpum", "error");      
    }

    log("CpuMon.getCpuData:" + JSON.stringify(sample), "cpum", "info");
    
    this.dataFunc(sample);
  }    
}

module.exports = CpuMon;
