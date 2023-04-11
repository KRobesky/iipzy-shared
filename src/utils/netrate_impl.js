const { spawn } = require("child_process");

const { log } = require("./logFile");

class NetRate {
  constructor(title, intervalSeconds, dataFunc) {
    log("NetRate.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "ping", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.netrate_interval = null
    this.cur_netrate_sample = {};
    this.cur_netrate_value = {};
    this.cur_netrate_sample = this.initNetRateSample();
 
    this.stdoutLine = "";
  }

  initNetRateSample() {
    return {
      sample_time : null,
      rx_bytes : parseInt(0),
      rx_errors : parseInt(0),
      rx_dropped : parseInt(0),
      tx_bytes : parseInt(0),
      tx_errors : parseInt(0),
      tx_dropped : parseInt(0)
    }
  }
  
  startSendNetRateSample() {
    this.getRxTxData();
    this.netrate_interval = setInterval(() => {
      this.getRxTxData(); 
    }, this.intervalSeconds * 1000);      
  }

  stopSendNetRateSample() {
    if (this.netrate_interval) {
      clearInterval(this.netrate_interval);
      this.netrate_interval = null;
    }
  }

  getRxTxData() {
    log("NetRate.getRxTxRate", "rate", "info");

    if (this.cancelled) return;

    const exec = spawn("sudo", ["ip", "-s", "link", "show", "eth0"]);

    exec.stdout.on("data", data => {
      /*
        returns:
          2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq master br-lan state UP mode DEFAULT group default qlen 1000
              link/ether 68:27:19:ac:a8:fd brd ff:ff:ff:ff:ff:ff
              RX:  bytes  packets errors dropped  missed   mcast
              8632770553 13374010      4       0       0       0
              TX:  bytes  packets errors dropped carrier collsns
              6468249098  8463484      0       0       0       0
      */

      const lines = data.toString().split('\n');

      let new_sample = this.initNetRateSample();
      new_sample.sample_time = Date.now();
      
      let i = 0;
      for (var line in lines) {
        if (line == 3) {
          const fields = lines[3].replace(/\s\s+/g, ' ').split(' ');
          new_sample.rx_bytes = parseInt(fields[1], 10);
          new_sample.rx_errors = parseInt(fields[3], 10);
          new_sample.rx_dropped = parseInt(fields[4], 10);
        } if (line == 5) {
          const fields = lines[5].replace(/\s\s+/g, ' ').split(' ');
          new_sample.tx_bytes = parseInt(fields[1], 10);
          new_sample.tx_errors = parseInt(fields[3], 10);
          new_sample.tx_dropped = parseInt(fields[4], 10);
        }
        i++;
      } 

      /*
      log("NetRate: rx_bytes = " + new_sample.rx_bytes + ", rx_errors = " + new_sample.rx_errors + ", rx_dropped = " + new_sample.rx_dropped, "rate", "info");
      log("NetRate: tx_bytes = " + new_sample.tx_bytes + ", tx_errors = " + new_sample.tx_errors + ", tx_dropped = " + new_sample.tx_dropped, "rate", "info");
      */

      if (this.cur_netrate_sample.sample_time) {

        let ret = {
          sample_time : new_sample.sample_time,
          rx_rate_bits : parseInt(0),
          rx_new_errors : parseInt(0),
          rx_new_dropped : parseInt(0),
          tx_rate_bits : parseInt(0),
          tx_new_errors : parseInt(0),
          tx_new_dropped : parseInt(0)
        }
       
        // receive (down)

        if (this.cur_netrate_sample.rx_bytes != 0 && new_sample.rx_bytes > this.cur_netrate_sample.rx_bytes) {
          ret.rx_rate_bits = Math.round(((new_sample.rx_bytes - this.cur_netrate_sample.rx_bytes) * 8) / ((new_sample.sample_time - this.cur_netrate_sample.sample_time) / 1000));
        }

        if (new_sample.rx_errors > this.cur_netrate_sample.rx_errors) {
          ret.rx_new_errors = new_sample.rx_errors - this.cur_netrate_sample.rx_errors;
        }

        if (new_sample.rx_dropped > this.prev_rx_dropped) {
          ret.rx_new_dropped = new_sample.rx_dropped - this.cur_netrate_sample.rx_dropped;
        }

        // transmit (up)
         
        if (this.cur_netrate_sample.tx_bytes != 0 && new_sample.tx_bytes > this.cur_netrate_sample.tx_bytes) {
          ret.tx_rate_bits = Math.round(((new_sample.tx_bytes - this.cur_netrate_sample.tx_bytes) * 8) / ((new_sample.sample_time - this.cur_netrate_sample.sample_time) / 1000));
        }
      
        if (new_sample.tx_errors > this.cur_netrate_sample.tx_errors) {
          ret.tx_new_errors = new_sample.tx_errors - this.cur_netrate_sample.tx_errors;
        }

        if (new_sample.tx_dropped > this.cur_netrate_sample.tx_dropped) {
          ret.tx_new_dropped = new_sample.tx_dropped - this.cur_netrate_sample.tx_dropped;
        }
       
        //log("NetRate: result = " + JSON.stringify(ret, null, 2), "rate", "info");
        this.cur_netrate_value = ret;
        this.dataFunc(ret);
      }

      this.cur_netrate_sample = new_sample;
    });

    exec.stderr.on("data", data => {
      log("NetRate stderr: " + data.toString(), "rate", "info");
    });

    exec.on("exit", code => {
      //log(`NetRate exited with code ${code}`, "rate", "info");
    });  
  }
}

module.exports = NetRate;
