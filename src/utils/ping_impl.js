const { spawn } = require("child_process");

const { log } = require("./logFile");
const {NetRate, NetRateIPTables, NetRateSaves} = require("./netrate");
const { spawnAsync } = require("./spawnAsync");

let doSimulateDroppedPackets = false;

class Ping {
  constructor(title, dataFunc, doneFunc, target, durationSeconds, intervalSeconds, wantNetRate, tcMode) {
    log(
      "Ping.constructor: title = " +
        title +
        ", target = " + target +
        ", duration = " + durationSeconds +
        ", interval " + intervalSeconds +
        ", wantNetRate " + wantNetRate + 
        ", tcMode " + tcMode,
      "ping",
      "info"
    );
    this.title = title;
    this.dataFunc = dataFunc;
    this.doneFunc = doneFunc;
    this.target = target;
    this.durationSeconds = durationSeconds ? durationSeconds : 0;
    this.intervalSeconds = intervalSeconds ? intervalSeconds : 1;
    this.netrate = null;
    this.netrate_saves = null;
    if (wantNetRate) {
      this.netrate = tcMode ? new NetRateIPTables(title, this.intervalSeconds, this.netrateDataFunc.bind(this)) : 
                              new NetRate(title, this.intervalSeconds, this.netrateDataFunc.bind(this));
      this.netrate_saves = tcMode ? new NetRateSaves(title, "eth0", "eth1", this.intervalSeconds * 6, this.netrateSavesDataFunc.bind(this)) : null;

    }
    
    this.cancelled = false;

    // ping
    this.exec = null;
    this.totalSamples = 0;
    this.totalTimeMillis = 0;
    this.totalDroppedPackets = 0;
    this.ping_interval = null;
    this.timeout = null;
    this.inSendPingSample = false;
    this.cur_ping_sample = {};
    this.latestPingTime = 0;
    this.dropCheckEnabled = false;

    // netrate
    this.cur_netrate_result = {};
    this.cur_netrate_saves_result = {};
 
    this.stdoutLine = "";
  }


  // NB:  Had a case where ping did not respond for a number of minutes.  This caused the
  //      previous packet to be resent with a new timestamp.
  //      We should be indicating dropped packets in this case.
  //      Solution:
  //        1.  Need a timestamp of the latest response from ping.
  //        2.  If too old, send packets as dropped.
  //            - Too old is probably 5 seconds - 5 missed pings

  startSendPingSample() {
    this.latestPingTime = 0;
    this.dropCheckEnabled = false;
    this.ping_interval = setInterval(() => {
      if (!this.inSendPingSample) {
        this.inSendPingSample = true;
        try {
          const now = Date.now();
          log(
            "ping.sendPingSample: now = " + now + ", latest = " + this.latestPingTime,
            "ping",
            "info"
          );
          if (this.cur_ping_sample.timeMillis !== undefined) {
            this.cur_ping_sample.timeStamp = new Date().toISOString();
            if (this.dropCheckEnabled && now > this.latestPingTime + 10 * 1000) {
              log("ping.sendPingSample: no new ping sample for 10 seconds", "ping", "info");
              this.cur_ping_sample.timeMillis = "0";
              this.cur_ping_sample.dropped = true;
            }
          }
          //log("ping.sendPingSample: cur_netrate_result = " + JSON.stringify(this.cur_netrate_result));
          /*
          rx_rate_bits : parseInt(0),
          rx_new_errors : parseInt(0),
          rx_new_dropped : parseInt(0),
          tx_rate_bits : parseInt(0),
          tx_new_errors : parseInt(0),
          tx_new_dropped : parseInt(0)
          */
          if (this.netrate) {
            // consolidate ping and netrate
            let consolidatedSample = this.cur_ping_sample;       
            // NetRate or NetRateIPTables 
            consolidatedSample.rx_rate_bits = this.cur_netrate_result.rx_rate_bits;
            if (this.cur_netrate_result.rx_rate_dns_bits)
				      consolidatedSample.rx_rate_bits += this.cur_netrate_result.rx_rate_dns_bits;
            if (this.cur_netrate_result.rx_rate_rt_bits)
				      consolidatedSample.rx_rate_bits += this.cur_netrate_result.rx_rate_rt_bits;
            consolidatedSample.tx_rate_bits = this.cur_netrate_result.tx_rate_bits;
            if (this.cur_netrate_result.tx_rate_dns_bits)
             	consolidatedSample.tx_rate_bits += this.cur_netrate_result.tx_rate_dns_bits;
            if (this.cur_netrate_result.tx_rate_rt_bits)
              consolidatedSample.tx_rate_bits +=  this.cur_netrate_result.tx_rate_rt_bits;
            // NetRateIPTables
            consolidatedSample.rx_rate_dns_bits = this.cur_netrate_result.rx_rate_dns_bits;
            consolidatedSample.rx_rate_rt_bits = this.cur_netrate_result.rx_rate_rt_bits;
            consolidatedSample.tx_rate_dns_bits = this.cur_netrate_result.tx_rate_dns_bits;
            consolidatedSample.tx_rate_rt_bits = this.cur_netrate_result.tx_rate_rt_bits;
            // NetRateTC
            consolidatedSample.saved = this.cur_netrate_saves_result.saved;    
            //log("ping.sendPingSample: consolidatedSample" + JSON.stringify(consolidatedSample, null, 2), "ping", "error");
            this.dataFunc(consolidatedSample);
          } else {
            //log("ping.sendPingSample: this.cur_ping_sample" + JSON.stringify(this.cur_ping_sample), "ping", "error");
            this.dataFunc(this.cur_ping_sample);
          }
        } catch (ex) {
          log("(Exception) ping.sendPingSample: " + ex, "ping", "error");
        }
        this.inSendPingSample = false;
      }
    }, this.intervalSeconds * 1000);
    // wait 30 seconds before checking missed ping responses.
    this.timeout = setTimeout(() => {
      this.dropCheckEnabled = true;
    }, 30 * 1000);
  }

  stopSendPingSample() {
    if (this.ping_interval) {
      clearInterval(this.ping_interval);
      this.ping_interval = null;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  parsePingLineLinux(str) {
    // log("...parsePingLineLinux = " + str, "ping", " info");
    // 64 bytes from 172,217,2,238: icmp_seq=0 ttl=50 time=42.453 ms
    if (str.startsWith("64 bytes from")) {
      let left = str.indexOf("time=");
      if (left != -1) {
        left += 5;
        const right = str.indexOf(" ms", left);
        const time = str.substring(left, right);
        this.totalSamples++;
        this.totalTimeMillis += Number(time);
        return { timeMillis: time, dropped: false };
        // return (
        //   '{"timeMillis":' +
        //   time +
        //   ',"dropped":false, "timeStamp": "' +
        //   new Date().toISOString() +
        //   '"}'
        // );
      }
    } else if (
      str.startsWith("Request timed out") ||
      str.indexOf("Destination Host Unreachable") !== -1
    ) {
      this.totalDroppedPackets++;
      return { timeMillis: "0", dropped: true };
      // return (
      //   '{"timeMillis":' +
      //   0 +
      //   ',"dropped":true, "timeStamp": "' +
      //   new Date().toISOString() +
      //   '"}'
      // );
    }
    return {};
  }

  run() {
    this.totalSamples = 0;
    this.totalTimeMillis = 0;
    this.totalDroppedPackets = 0;
    this.inSendPingSample = false;
    this.cur_ping_sample = {};
    this.stdoutLine = "";

    this.exec = spawn("ping", [this.target]);

    if (this.durationSeconds !== 0)
      setTimeout(() => {
        this.exec.kill(9);
      }, this.durationSeconds * 1000);

    this.startSendPingSample();
    if (this.netrate) this.netrate.startSendSample();
    if (this.netrate_saves) this.netrate_saves.startSendSample();

    this.exec.stdout.on("data", data => {
      const str = data.toString();
      if (str[str.length - 1] != "\n") {
        this.stdoutLine += str;
        return;
      } else this.stdoutLine += str;

      this.latestPingTime = Date.now();
      //
      log("ping - stdout(" + this.latestPingTime + "): " + this.stdoutLine, "ping", "info");
      //log("ping - platform: " + process.platform, "ping", "info");
      if (!doSimulateDroppedPackets) {
        let newSample = this.parsePingLineLinux(this.stdoutLine);
        if (newSample.timeMillis !== undefined) this.cur_ping_sample = newSample;
      } else {
        this.totalDroppedPackets++;
        this.cur_ping_sample = { timeMillis: "0", dropped: true };
        // '{"timeMillis":' +
        // 0 +
        // ',"dropped":true, "timeStamp": "' +
        // new Date().toISOString() +
        // '"}';
      }

      this.stdoutLine = "";
    });

    this.exec.stderr.on("data", data => {
      log("stderr: " + data.toString(), "ping", "info");
    });

    this.exec.on("exit", code => {
      log(`Ping exited with code ${code}`, "ping", "info");

      this.stopSendPingSample();
      if (this.netyrate) this.netrate.stopSendSample();

      if (code !== 0 && this.durationSeconds === 0 && !this.cancelled) {
        // restart.
        log("Ping restarting in 10 seconds", "ping", "info");
        setTimeout(() => {
          this.run();
        }, 10 * 1000);
        return;
      }

      const avgMillis = this.totalSamples === 0 ? 0 : this.totalTimeMillis / this.totalSamples;
      if (this.doneFunc) {
        const json =
          '{"avgMillis":' +
          avgMillis +
          ', "droppedPackets":' +
          this.totalDroppedPackets +
          ',"timeStamp": "' +
          Date.now() +
          '"}';
        this.doneFunc(code, json);
      }
    });
  }

  async ping(intf, target, timeoutSecs) {
      log(
        "ping.ping(" + this.title + ") intf = " + 
          intf +
          ", target = " +
          target +
          ", timeoutSecs = " +
          timeoutSecs,
        "ping",
        "info"
      );

    try {
      //??const { stdout, stderr } = await spawnAsync("ping", [target, "-I", intf, "-c", "1", "-w", timeoutSecs]);
      const { stdout, stderr } = await spawnAsync("ping", [target, "-c", "1", "-w", timeoutSecs]);
      //log("ping.ping: " + stdout, "ping", "info");
      if (stderr) {
        log("(Error) ping.ping: " + stderr, "ping", "error");
        return null;
      }

      const lines = stdout.split('\n');
      /*
      for (let i =0; i < lines.length; i++) {
        log("...ping line=" + lines[i]);
      }
      */
  
      return this.parsePingLineLinux(lines[1]);
    } catch(ex) {
      log("(Exception) ping.ping: " + ex, "ping", "error");
      return null;
    }
  }
 
  // netrate
  netrateDataFunc(data) {
    this.cur_netrate_result = data;
  }

  // netrateSaves
  netrateSavesDataFunc(data) {
    this.cur_netrate_saves_result = data;
  }

  cancel() {
    if (this.exec) {
      this.cancelled = true;
      this.exec.kill(9);
    }
  }

  getSimulateDroppedPackets() {
    log("Ping getSimulateDroppedPackets: state = " + doSimulateDroppedPackets, "ping", "info");
    return doSimulateDroppedPackets;
  }

  setSimulateDroppedPackets(state) {
    doSimulateDroppedPackets = state;
    log("Ping setSimulateDroppedPackets: state = " + doSimulateDroppedPackets, "ping", "info");
    return doSimulateDroppedPackets;
  }
}

module.exports = Ping;
