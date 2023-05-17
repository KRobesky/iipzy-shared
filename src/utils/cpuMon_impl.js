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
      mem_use_pct     : parseFloat(0),
      stg_use_pct     : parseFloat(0)
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
    } catch (ex) {
      log("(Exception) CpuMon.getCpuData - temp: " + ex, "cpum", "error"); 
    }

    try {  
      // cpu utilization
      const { stdout, stderr } = await spawnAsync("iostat", ["-y", "-c"]);
      if (stderr) {
        log("(Error) CpuMon.getCpuData - utlz: " + stderr, "cpum", "error");
      } else {
        //log("CpuMon.getCpuData: utilization = " + stdout);
        const lines = stdout.split('\n');
        const line = lines[3];
        const parts = line.replace(/\s\s+/g, ' ').split(' ');
        const cpu_utlz_pct =  parseFloat(parts[1]) + // user
                              parseFloat(parts[2]) + // nice
                              parseFloat(parts[3]) + //system
                              parseFloat(parts[4]) + // iowait
                              parseFloat(parts[5]);  // steal
        sample.cpu_utlz_pct = cpu_utlz_pct.toFixed(1);
      }
    } catch (ex) {
      log("(Exception) CpuMon.getCpuData - cpu_utlz: " + ex, "cpum", "error"); 
    }

    try {
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
    } catch (ex) {
      log("(Exception) CpuMon.getCpuData - free: " + ex, "cpum", "error");      
    }

    try {
      // storage
      const { stdout, stderr } = await spawnAsync("df", []);
      if (stderr) {
        log("(Error) CpuMon.getCpuData - df: " + stderr, "cpum", "error");
      } else if (stdout) {       
        //  Filesystem     1K-blocks    Used Available Use% Mounted on
        //  tmpfs                512       0       512   0% /dev
        //  tmpfs             392880     176    392704   1% /run
        //  overlay          6973304 4038328   2918592  59% /
        //  tmpfs            1964392   22356   1942036   2% /tmp
        //  cgroup           1964392       0   1964392   0% /sys/fs/cgroup
        const rows = stdout.split("\n");
        const fields = rows[3].match(/\S+/g);
        let total = parseInt(fields[1]);
        let used = parseInt(fields[2]);
        sample.stg_use_pct = ((used / total) * 100).toFixed(1);
      }   
    } catch (ex) {
      log("(Exception) CpuMon.getCpuData - free: " + ex, "cpum", "error");      
    }

    log("CpuMon.getCpuData:" + JSON.stringify(sample), "cpum", "info");
    
    this.dataFunc(sample);
  }    
}

module.exports = CpuMon;
