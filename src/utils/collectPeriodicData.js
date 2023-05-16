const { log } = require("../utils/logFile");
const { now } = require("../utils/time");
const { spawnAsync } = require("../utils/spawnAsync");

function parseUptime(uptime) {
  //log("parseUptime = " + uptime, "perd", "info");
  return uptime.substring(0, uptime.length - 1);
}

function parseTemp(temp) {
  //log("collectPeriodicData.parseTemp: temp = " + temp);
  // temp=41234 = 41.234 C
  const temp_celsius = parseFloat((parseInt(temp)/1000).toFixed(1));
  //log("collectPeriodicData.parseTemp: temp_celsius = " + temp_celsius);
  const temp_fahrenheit = (temp_celsius * 9) / 5 + 32;
  //log("collectPeriodicData.parseTemp: temp_fahrenheit = " + temp_fahrenheit);
  return temp_fahrenheit;
}

function parseDf(df) {
  //log("collectPeriodicData: df = " + df);
  //  Filesystem     1K-blocks    Used Available Use% Mounted on
  // /dev/root       30491968 2280096  26940752   8% /
  // devtmpfs          860916       0    860916   0% /dev
  // tmpfs             993012       0    993012   0% /dev/shm
  // tmpfs             993012   95516    897496  10% /run
  // tmpfs               5120       4      5116   1% /run/lock
  // tmpfs             993012       0    993012   0% /sys/fs/cgroup
  // /dev/mmcblk0p1    258096   40049    218047  16% /boot
  // tmpfs             198600       0    198600   0% /run/user/1000
  let ret = [];
  const rows = df.split("\n");
  for (let i = 1; i < rows.length; i++) {
    // see: https://blog.abelotech.com/posts/split-string-into-tokens-javascript/
    const fields = rows[i].match(/\S+/g);
    //log("---fields = " + JSON.stringify(fields));
    let row = {};
    if (fields && fields.length === 6) {
      row.fileSystem = fields[0];
      row.oneKBlocks = parseInt(fields[1], 10);
      row.used = parseInt(fields[2], 10);
      row.available = parseInt(fields[3], 10);
      row.usePercent = parseInt(
        fields[4].substring(0, fields[4].length - 1),
        10
      );
      row.mountedOn = fields[5];
      ret.push(row);
    }
  }
  return ret;
}

// function parseMpstat(mpstat) {
//   //log("collectPeriodicData: mpstat = " + mpstat);
//   //   Linux 4.19.66-v7l+ (raspberrypi) 	03/10/19 	_armv7l_	(4 CPU)
//   //
//   // 14:25:28     CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
//   // 14:25:28     all    0.95    0.00    0.72    0.50    0.00    0.03    0.00    0.00    0.00   97.80
//   // 14:25:28       0    0.76    0.00    0.63    0.67    0.00    0.12    0.00    0.00    0.00   97.82
//   // 14:25:28       1    1.02    0.00    0.75    0.48    0.00    0.00    0.00    0.00    0.00   97.74
//   // 14:25:28       2    0.90    0.00    0.77    0.37    0.00    0.00    0.00    0.00    0.00   97.95
//   // 14:25:28       3    1.12    0.00    0.72    0.47    0.00    0.00    0.00    0.00    0.00   97.68
//   return mpstat;
// }

function parseIostatMachineInfo(rows) {
  //log("collectPeriodicData: iostat = " + iostat);
  //   Linux 4.19.66-v7l+ (raspberrypi) 	03/10/19 	_armv7l_	(4 CPU)
  //
  // avg-cpu:  %user   %nice %system %iowait  %steal   %idle
  //            0.95    0.00    0.75    0.50    0.00   97.80
  //
  // Device             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
  // mmcblk0           2.46        17.49        57.88     327302    1083109
  const fields = rows[0].split("\t");
  //log("machine fields = " + JSON.stringify(fields));
  let ret = {};
  ret.linux = fields[0].trim();
  ret.date = fields[1].trim();
  ret.hardware = fields[2].trim();
  ret.info = fields[3].trim();
  return ret;
}

function parseIostatCPUInfo(rows) {
  //log("collectPeriodicData: iostat = " + iostat);
  //   Linux 4.19.66-v7l+ (raspberrypi) 	03/10/19 	_armv7l_	(4 CPU)
  //
  // avg-cpu:  %user   %nice %system %iowait  %steal   %idle
  //            0.95    0.00    0.75    0.50    0.00   97.80
  //
  // Device             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
  // mmcblk0           2.46        17.49        57.88     327302    1083109
  const fields = rows[3].match(/\S+/g);
  //log("cpu fields = " + JSON.stringify(fields));
  let ret = {};
  ret.userPercent = parseFloat(fields[0]);
  ret.nicePercent = parseFloat(fields[1]);
  ret.systemPercent = parseFloat(fields[2]);
  ret.iowaitPercent = parseFloat(fields[3]);
  ret.stealPercent = parseFloat(fields[4]);
  ret.idlePercent = parseFloat(fields[5]);
  return ret;
}

function parseIostatDeviceInfo(rows) {
  //log("collectPeriodicData: iostat = " + iostat);
  //   Linux 4.19.66-v7l+ (raspberrypi) 	03/10/19 	_armv7l_	(4 CPU)
  //
  // avg-cpu:  %user   %nice %system %iowait  %steal   %idle
  //            0.95    0.00    0.75    0.50    0.00   97.80
  //
  // Device             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
  // mmcblk0           2.46        17.49        57.88     327302    1083109
  const fields = rows[6].match(/\S+/g);
  //log("dev fields = " + JSON.stringify(fields));
  let ret = {};
  ret.device = fields[0];
  ret.tps = parseFloat(fields[1]);
  ret.kbReadPerSec = parseFloat(fields[2]);
  ret.kbWrtnPerSec = parseFloat(fields[3]);
  ret.kbRead = parseInt(fields[4]);
  ret.kbWrtn = parseInt(fields[5]);
  return ret;
}

/*
function parseVmstat(vmstat) {
  //log("collectPeriodicData: vmstat = " + vmstat);
  //   procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
  //  r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
  //  1  0      0 905544  80284 842928    0    0     4    14   73   85  1  1 98  0  0
  const rows = vmstat.split("\n");
  const fields = rows[2].match(/\S+/g);
  //log("vmstat fields = " + JSON.stringify(fields));
  //["0","1","0","855068","85732","886012","0","0","3","11","67","81","1","1","98","0","0"]
  let ret = {};
  ret.free = parseInt(fields[3]);
  ret.buff = parseInt(fields[4]);
  ret.cache = parseInt(fields[5]);
  return ret;
}
*/

function parseFree(free) {
  //log("collectPeriodicData: free = " + free);
  //            total          used        free      shared  buff/cache   available
  //Mem:        3928784     3635720      186172       27540      106892      217036
  const rows = vmstat.split("\n");
  const fields = rows[2].match(/\S+/g);
  let ret = {};
  ret.total = parseInt(fields[1]);
  ret.used = parseInt(fields[2]);
  ret.free = parseInt(fields[3]);
  ret.shared = parseInt(fields[4]);
  ret.cache = parseInt(fields[5]);
  ret.available = parseInt(fields[6]);
  return ret;
}

let firstTime = true;

async function collectPeriodicData() {
  log(">>>collectPeriodicData", "perd", "info");

  let iostat = null;
  {
    const { stdout } = await spawnAsync("iostat", []);
    iostat = stdout;
  }

  const rows = iostat.split("\n");
  const machineInfo = firstTime ? parseIostatMachineInfo(rows) : undefined;
  const cpuInfo = parseIostatCPUInfo(rows);
  const deviceInfo = parseIostatDeviceInfo(rows);

  let bootTime = null;
  if (firstTime) {
    const { stdout } = await spawnAsync("uptime", ["-s"]);
    bootTime = parseUptime(stdout);
  } else bootTime = undefined;

  let degreesFahrenheit = null;
  {      
    const { stdout } = await spawnAsync("cat", ["/sys/devices/virtual/thermal/thermal_zone0/temp"]);
    degreesFahrenheit = parseTemp(stdout);
  } 

  let storage = null;
  {
    const { stdout } = await spawnAsync("df", []);
    storage = parseDf(stdout);
  }

  let memoryInfo = null;
  {
    const { stdout } = await spawnAsync("free", []);
    memoryInfo = parseFree(stdout);
  }

  firstTime = false;

  const ret = {
    time: now(),
    bootTime,
    degreesFahrenheit,
    storage,
    machineInfo,
    cpuInfo,
    deviceInfo,
    memoryInfo
  };

  log("<<<collectPeriodicData: " + JSON.stringify(ret, null, 2), "perd", "info");

  return ret;
}

module.exports = { collectPeriodicData };
