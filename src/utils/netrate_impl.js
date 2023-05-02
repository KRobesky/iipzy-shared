const { spawn } = require("child_process");

const { fileReadAsync } = require("./fileIO");
const { log } = require("./logFile");
const { sleep } = require("./utils");
const { spawnAsync } = require("./spawnAsync");
const { threadId } = require("worker_threads");

class NetRate {
  constructor(title, intervalSeconds, dataFunc) {
    log("NetRate.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "nrat", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.interval = null
    this.cur_sample = null;
 
    this.stdoutLine = "";
  }

  initSample() {
    return {
      sample_time : Date.now(),
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
    this.interval = setInterval(() => {
      this.getRxTxData(); 
    }, this.intervalSeconds * 1000);      
  }

  stopSendSample() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getRxTxData() {
    log("NetRate.getRxTxRate", "nrat", "info");

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

      let new_sample = this.initSample();
       
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

      //log("NetRate: new_sample = " + JSON.stringify(new_sample, null, 2), "nrat", "info");

      if (this.cur_sample) {

        let ret = {
          sample_time : new_sample.sample_time,
          rx_rate_bits : parseInt(0),
          rx_new_errors : parseInt(0),
          rx_new_dropped : parseInt(0),
          tx_rate_bits : parseInt(0),
          tx_new_errors : parseInt(0),
          tx_new_dropped : parseInt(0),
          // Supply missing NetRateIPTables fields
          rx_rate_dns_bits : parseInt(0),
          rx_rate_rt_bits : parseInt(0),
          tx_rate_dns_bits : parseInt(0),
          tx_rate_rt_bits : parseInt(0)
        }
       
        // receive (down)

        if (new_sample.rx_bytes > this.cur_sample.rx_bytes) {
          ret.rx_rate_bits = Math.round(((new_sample.rx_bytes - this.cur_sample.rx_bytes) * 8) / ((new_sample.sample_time - this.cur_sample.sample_time) / 1000));
        }

        if (new_sample.rx_errors > this.cur_sample.rx_errors) {
          ret.rx_new_errors = new_sample.rx_errors - this.cur_sample.rx_errors;
        }

        if (new_sample.rx_dropped > this.prev_rx_dropped) {
          ret.rx_new_dropped = new_sample.rx_dropped - this.cur_sample.rx_dropped;
        }

        // transmit (up)
         
        if (new_sample.tx_bytes > this.cur_sample.tx_bytes) {
          ret.tx_rate_bits = Math.round(((new_sample.tx_bytes - this.cur_sample.tx_bytes) * 8) / ((new_sample.sample_time - this.cur_sample.sample_time) / 1000));
        }
      
        if (new_sample.tx_errors > this.cur_sample.tx_errors) {
          ret.tx_new_errors = new_sample.tx_errors - this.cur_sample.tx_errors;
        }

        if (new_sample.tx_dropped > this.cur_sample.tx_dropped) {
          ret.tx_new_dropped = new_sample.tx_dropped - this.cur_sample.tx_dropped;
        }
       
        //log("NetRate: result = " + JSON.stringify(ret, null, 2), "nrat", "info");
        this.dataFunc(ret);
      }

      this.cur_sample = new_sample;
      //log("NetRate: this.cur_sample = " + JSON.stringify(this.cur_sample, null, 2), "nrat", "info");
    });

    exec.stderr.on("data", data => {
      log("NetRate stderr: " + data.toString(), "nrat", "info");
    });

    exec.on("exit", code => {
      //log(`NetRate exited with code ${code}`, "nrat", "info");
    });  
  }
}

class NetRateBandwidth {
  constructor(title, intervalSeconds, dataFunc) {
    log("NetRateBandwidth.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "nrat", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.interval = null;
    this.first_time = true;

    // state file names.
    this.STATE_PATH = "/etc/iipzy/";
    this.state_filename_receive = this.STATE_PATH + "bandwidth_receive.json";
    this.state_filename_transmit = this.STATE_PATH + "bandwidth_transmit.json";
  }

  initResult() {
    return {
      sample_time : Date.now(),
      rx_bw_peak_bits : parseInt(0),
      rx_bw_quality_bits : parseInt(0),
      tx_bw_peak_bits : parseInt(0),
      tx_bw_quality_bits : parseInt(0),
    }
  }

  startSendSample() {
    this.get_bandwidth();
    this.interval = setInterval(() => {
      this.get_bandwidth(); 
    }, this.intervalSeconds * 1000); 
  }

  stopSendSample() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async readBandwidthFile(filename) {
    let bw_peak_bits = null;
    let bw_quality_bits = null;
    try {
      const data = await fileReadAsync(filename);
      let joData = null;
      if (data) {
        joData = JSON.parse(data);
        bw_peak_bits = joData.transmitCapacity;
        bw_quality_bits = joData.bandwidthLowerBound;

      }
    } catch (ex) {
      log("(Exception) NetRateBandwidth.readBandwidthFile: " + ex, "nrat", "info");
    }
    return { bw_peak_bits, bw_quality_bits };
	}

  async get_bandwidth() {   
    try {
      let result = this.initResult();
      {
        const { bw_peak_bits, bw_quality_bits  } = await this.readBandwidthFile(this.state_filename_receive);
        result.rx_bw_peak_bits		= bw_peak_bits;
        result.rx_bw_quality_bits	= bw_quality_bits;
      }
      {
        const { bw_peak_bits, bw_quality_bits  } = await this.readBandwidthFile(this.state_filename_transmit);
        result.tx_bw_peak_bits		= bw_peak_bits;
        result.tx_bw_quality_bits	= bw_quality_bits;
      }

      this.dataFunc(result);
     
    } catch (ex) {
      log("(Exception) NetRateBandwidth.get_bandwidth: " + ex, "nrat", "info");
    }
  }  
}

class NetRateIPTables {
  constructor(title, intervalSeconds, dataFunc) {
    log("NetRateIPTables.constructor: title = " + title + ", intervalSeconds = " + intervalSeconds, "nrat", "info");
    this.title = title;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.interval = null;
    this.first_time = true;
  }

  initResult() {
    return {
      sample_time : Date.now(),
      rx_rate_bits : parseInt(0),
      rx_rate_dns_bits : parseInt(0),
      rx_rate_rt_bits : parseInt(0),
      tx_rate_bits : parseInt(0),
      tx_rate_dns_bits : parseInt(0),
      tx_rate_rt_bits : parseInt(0)
    }
  }

  startSendSample() {
    this.compute_netrate();
    this.interval = setInterval(() => {
      this.compute_netrate(); 
    }, this.intervalSeconds * 1000); 
  }

  stopSendSample() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
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
      log("(Exception) NetRateIPTables.readIpTables: " + ex, "nrat", "info");
    }
    return null;
	}

  updateNetRateValue(netrate_value, bytes, ingress, className) {
    //log("NetRateIPTables.updateNetRateValue: bytes = " + bytes + ", ingress = " + ingress + ", className = " + className, "nrat", "info");
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
  async compute_netrate() {   
    try {
      let result = this.initResult();
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
                this.updateNetRateValue(result, tokens[2], false, this.getClassName(line));
                break;
              }
              case 'egress_ipv6' : {
                this.updateNetRateValue(result, tokens[2], false, this.getClassName(line));
                break;
              }
              case 'ingress':
                this.updateNetRateValue(result, tokens[2], true, this.getClassName(line));
                break;
              case 'ingress_ipv6': {
                this.updateNetRateValue(result, tokens[2], true, this.getClassName(line));
                break;
              }
              default: {
                break;
              }
            }
          }
        }
      }

      //log("...result = " + JSON.stringify(result, null, 2));

      if (this.first_time) this.first_time = false;
      else this.dataFunc(result);

      
    } catch (ex) {
      log("(Exception) NetRateIPTables.compute_netrate: " + ex, "nrat", "info");
    }
  }  
}

class NetRateSaves {
  constructor(title, intfWAN, intfLAN, intervalSeconds, dataFunc) {
    log("NetRateSaves.constructor: title = " + title + ", intfWAN = " + intfWAN + ", intfLAN = " + intfLAN + ", intervalSeconds = " + intervalSeconds, "nrat", "info");
    this.title = title;
    this.intfWAN = intfWAN;
    this.intfLAN = intfLAN;
    this.intervalSeconds = intervalSeconds;
    this.dataFunc = dataFunc;
      
    this.cancelled = false;

    // netrate
    this.fq_codel_target = "1:11";
    this.interval = null
    this.cur_sample_WAN = null;
    this.cur_sample_LAN = null;

    // bit mask
    this.SAVED_WAN = 1;
    this.SAVED_LAN = 2;
  }

  initSample() {
    return {
      sample_time : Date.now(),
      dropped : parseInt(0),
      backlog : parseInt(0)
    }
  }
  
  initResult() {
    return {
      sample_time : Date.now(),
      dropped_WAN : parseInt(0),
      backlog_WAN : parseInt(0),
      dropped_LAN : parseInt(0),
      backlog_LAN : parseInt(0),
      saved : 0
    }
  }

  startSendSample() {
    this.compute_saved();
    this.interval = setInterval(() => {
      this.compute_saved(); 
    }, this.intervalSeconds * 1000); 
  }

  stopSendSample() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /*
  tc -j -s -d qdisc show dev eth0
  [
    {
      "kind": "htb",
      "handle": "1:",
      "root": true,
      "refcnt": 9,
      "options": {
        "r2q": 10,
        "default": "0x13",
        "direct_packets_stat": 10,
        "ver": "3.17",
        "direct_qlen": 1000
      },
      "bytes": 127340427220,
      "packets": 115187613,
      "drops": 0,
      "overlimits": 30329301,
      "requeues": 2533,
      "backlog": 0,
      "qlen": 0
    },
    {
      "kind": "fq_codel",
      "handle": "14:",
      "parent": "1:14",
      "options": {
        "limit": 10240,
        "flows": 1024,
        "quantum": 1514,
        "target": 49999,
        "interval": 499999,
        "memory_limit": 33554432,
        "ecn": true,
        "drop_batch": 64
      },
      "bytes": 0,
      "packets": 0,
      "drops": 0,
      "overlimits": 0,
      "requeues": 0,
      "backlog": 0,
      "qlen": 0,
      "maxpacket": 0,
      "drop_overlimit": 0,
      "new_flow_count": 0,
      "ecn_mark": 0,
      "new_flows_len": 0,
      "old_flows_len": 0
    },
    {
      "kind": "fq_codel",
      "handle": "12:",
      "parent": "1:12",
      "options": {
        "limit": 10240,
        "flows": 1024,
        "quantum": 1514,
        "target": 49999,
        "interval": 499999,
        "memory_limit": 33554432,
        "ecn": true,
        "drop_batch": 64
      },
      "bytes": 54092766,
      "packets": 134440,
      "drops": 0,
      "overlimits": 0,
      "requeues": 0,
      "backlog": 0,
      "qlen": 0,
      "maxpacket": 1492,
      "drop_overlimit": 0,
      "new_flow_count": 22404,
      "ecn_mark": 0,
      "new_flows_len": 1,
      "old_flows_len": 1
    },
    {
      "kind": "fq_codel",
      "handle": "11:",
      "parent": "1:11",
      "options": {
        "limit": 10240,
        "flows": 1024,
        "quantum": 1514,
        "target": 49999,
        "interval": 499999,
        "memory_limit": 33554432,
        "ecn": true,
        "drop_batch": 64
      },
      "bytes": 49293080,
      "packets": 519931,
      "drops": 0,
      "overlimits": 0,
      "requeues": 0,
      "backlog": 0,
      "qlen": 0,
      "maxpacket": 143,
      "drop_overlimit": 0,
      "new_flow_count": 236786,
      "ecn_mark": 0,
      "new_flows_len": 0,
      "old_flows_len": 1
    },
    {
      "kind": "fq_codel",
      "handle": "13:",
      "parent": "1:13",
      "options": {
        "limit": 10240,
        "flows": 1024,
        "quantum": 1514,
        "target": 49999,
        "interval": 499999,
        "memory_limit": 33554432,
        "ecn": true,
        "drop_batch": 64
      },
      "bytes": 127237039098,
      "packets": 114533230,
      "drops": 0,
      "overlimits": 0,
      "requeues": 0,
      "backlog": 0,
      "qlen": 0,
      "maxpacket": 68130,
      "drop_overlimit": 0,
      "new_flow_count": 20729068,
      "ecn_mark": 0,
      "new_flows_len": 1,
      "old_flows_len": 8
    }
  ]
  */

  async get_sample(intf) {
    const { stdout, stderr } = await spawnAsync("tc", [ "-j", "-s", "-d", "qdisc", "show", "dev", intf]);
    if (stderr) {
      log("(Error) NetRateSaved.get_sample: " + stderr, "nrat", "error");
      return null;
    }

    try {
      const ja = JSON.parse(stdout);

      let sample = this.initSample();
      for(let i = 0; i < ja.length; i++) {
        const jo = ja[i];
        if (jo.kind === "fq_codel" && jo.parent === this.fq_codel_target) {
          sample.dropped = jo.drops;
          sample.backlog = jo.backlog;
          break;
        }
      }
      return sample;
    } catch (ex) {
      log("(Exception) NetRateSaved.get_sample[" + intf + "]: " + ex, "nrat", "error");
    }
    return null;

  }

  async compute_saved() {
    try {
      const sample_WAN = await this.get_sample(this.intfWAN);
      const sample_LAN = await this.get_sample(this.intfLAN);
      
      let result = this.initResult();
      if (sample_WAN && this.cur_sample_WAN) {
        result.dropped_WAN = Math.ceil((sample_WAN.dropped - this.cur_sample_WAN.dropped) / this.intervalSeconds);
        result.backlog_WAN = Math.ceil((sample_WAN.backlog - this.cur_sample_WAN.backlog) / this.intervalSeconds);
      }
      if (sample_LAN && this.cur_sample_LAN) {
        result.dropped_LAN = Math.ceil((sample_LAN.dropped - this.cur_sample_LAN.dropped) / this.intervalSeconds);
        result.backlog_LAN = Math.ceil((sample_LAN.backlog - this.cur_sample_LAN.backlog) / this.intervalSeconds);
      }

      if (result.dropped_WAN > 0 || result.backlog_WAN > 0) result_saved = this.SAVED_WAN;
      if (result.dropped_LAN > 0 || result.backlog_LAN > 0) result_saved |= this.SAVED_LAN;

      if (this.cur_sample_WAN && this.cur_sample_LAN) {
        this.dataFunc(result);
        log("NetRateSaved.compute_saved: result = " + JSON.stringify(result), "nrat", "info");
      } 
      this.cur_sample_WAN = sample_WAN;
      this.cur_sample_LAN = sample_LAN;
    } catch (ex) {
      log("(Exception) NetRateSaved.compute_saved[" + this.intf + "]: " + ex, "nrat", "error");
    }
    return null;
  } 
}

module.exports = {NetRate, NetRateBandwidth, NetRateIPTables, NetRateSaves};
