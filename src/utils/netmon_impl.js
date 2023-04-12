const { spawn } = require("child_process");

const { log } = require("./logFile");
const { sleep } = require("./utils");
const { spawnAsync } = require("./spawnAsync");

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
  
  startSendSample() {
    this.getRxTxData();
    this.netrate_interval = setInterval(() => {
      this.getRxTxData(); 
    }, this.intervalSeconds * 1000);      
  }

  stopSendSample() {
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

class NetRateIPTables {
  constructor(title, intervalSeconds, dataFunc) {
    log("NetRateIPTables.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "ping", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.netrate_interval = null;
    this.first_time = true;
  }

  initNetRateValue() {
    return {
      sample_time : null,
      rx_rate_bits : parseInt(0),
      rx_rate_dns_bits : parseInt(0),
      rx_rate_rt_bits : parseInt(0),
      tx_rate_bits : parseInt(0),
      tx_rate_dns_bits : parseInt(0),
      tx_rate_rt_bits : parseInt(0)
    }
  }

  startSendSample() {
    this.compute_netrate_value();
    this.netrate_interval = setInterval(() => {
      this.compute_netrate_value(); 
    }, this.intervalSeconds * 1000); 
  }

  stopSendSample() {
    if (this.netrate_interval) {
      clearInterval(this.netrate_interval);
      this.netrate_interval = null;
    }
  }

  // NB: Zeros out INGRESS_COUNT and EGRESS_COUNT
  async readIpTables() {

		/*
		root@FriendlyWrt:~# iptables -w 1 -W 10000 -t mangle -xvnL -Z INGRESS_COUNT
		Chain INGRESS_COUNT (1 references)
	  pkts		  bytes 			    target   prot opt 	in	out	source   	  destination
		63928764 	146804673019   	all  	  --   		    *   *	  0.0.0.0/0   0.0.0.0/0
		  435921 	49560854       	all  	  --   		    *   *	  0.0.0.0/0   0.0.0.0/0	mark match 0x100/0xff00
		  137589 	77981302       	all  	  --   	    	*   *   0.0.0.0/0   0.0.0.0/0	mark match 0x200/0xff00
		*/
    try {
      let results = [];
      results.push({key: "ingress_ipv6",  value: await spawnAsync("ip6tables", ["-w", "1", "-W", "10000", "-t", "mangle", "-xvnL", "-Z", "INGRESS_COUNT"])});
      results.push({key: "egress_ipv6",   value: await spawnAsync("ip6tables", ["-w", "1", "-W", "10000", "-t", "mangle", "-xvnL", "-Z", "EGRESS_COUNT"])});
      results.push({key: "ingress",       value: await spawnAsync("iptables",  ["-w", "1", "-W", "10000", "-t", "mangle", "-xvnL", "-Z", "INGRESS_COUNT"])});
      results.push({key: "egress",        value: await spawnAsync("iptables",  ["-w", "1", "-W", "10000", "-t", "mangle", "-xvnL", "-Z", "EGRESS_COUNT"])});
  
      //log("...results = " + JSON.stringify(results,null,2));
      return results;
    } catch (ex) {
      log("(Exception) NetRateIPTables.readIpTables: " + ex, "ping", "info");
    }
    return null;
	}

  updateNetRateValue(netrate_value, bytes, ingress, className) {
    //log("NetRateIPTables.updateNetRateValue: bytes = " + bytes + ", ingress = " + ingress + ", className = " + className, "ping", "info");
    const bits = Math.round((bytes * 8) / this.intervalSeconds);
    switch (className) {
      case 'DNS': {
        if (ingress) netrate_value.rx_rate_dns_bits = bits; else netrate_value.tx_rate_dns_bits = bits;
        break;
      }
      case 'RealTime' : {
        if (ingress) netrate_value.rx_rate_rt_bits = bits; else netrate_value.tx_rate_rt_bits = bits;
        break;
      }
      case 'Other' : {
        if (ingress) netrate_value.rx_rate_bits = bits; else netrate_value.tx_rate_bits = bits;
        break;
      }
    }
  }

  getClassName(line) {
    if (line.includes("mark match 0x100/0xff00")) return "DNS";
    if (line.includes("mark match 0x200/0xff00")) return "RealTime"; 
    return "Other"
  }


  // NB: From iptables INGRESS_COUNT and EGRESS_COUNT
  async compute_netrate_value() {
    
    try {
      let netrate_value = this.initNetRateValue();
      netrate_value.sample_time = Date.now();
      const ipTablesOutput = await this.readIpTables();
      for (let i = 0; i < ipTablesOutput.length; i++) {
        const chunk = ipTablesOutput[i];
        //log("...chunk = " + JSON.stringify(chunk, null,2));
        const key = chunk.key;
        const lines = chunk.value.stdout.split('\n');
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          //log("...line = " + line);
          const tokens = line.replace(/\s+/g, " ").split(' ');
          //log("...key = " + key + ", tokens = " + JSON.stringify(tokens));
          if (tokens[5] === '*') {
            //log("...key = " + key + ", tokens = " + JSON.stringify(tokens));
            switch (key) {
              case 'egress': {
                this.updateNetRateValue(netrate_value, tokens[2], false, this.getClassName(line));
                break;
              }
              case 'egress_ipv6' : {
                this.updateNetRateValue(netrate_value, tokens[2], false, this.getClassName(line));
                break;
              }
              case 'ingress':
                this.updateNetRateValue(netrate_value, tokens[2], true, this.getClassName(line));
                break;
              case 'ingress_ipv6': {
                this.updateNetRateValue(netrate_value, tokens[2], true, this.getClassName(line));
                break;
              }
              default: {
                break;
              }
            }
          }
        }
      }

      //log("...netrate_value = " + JSON.stringify(netrate_value, null, 2));

      if (this.first_time) this.first_time = false;
      else this.dataFunc(netrate_value);

      
    } catch (ex) {
      log("(Exception) NetRateIPTables.compute_netrate_value: " + ex, "ping", "info");
    }
  }  
}


class NetRateSaves {
  constructor(title, intf, intervalSeconds, dataFunc) {
    log("NetRateSaves.constructor: title = " + title + ", intf = " + intf + ", intervalSeconds = " + intervalSeconds, "ping", "info");
    this.title = title;
    this.intf = intf;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.netrate_interval = null
    this.cur_netrate_sample = {};
    this.cur_netrate_value = {};
    //this.cur_netrate_sample = this.initNetRateSample();
 
    this.stdoutLine = "";
  }
}

module.exports = {NetRate, NetRateIPTables, NetRateSaves};
