const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const {
  exec
} = require('child_process');
const bunyan = require('bunyan');

log = bunyan.createLogger(
  {
    name: 'dataLog',
    streams: [
      {
          level: 'info',  
          stream: process.stdout // log INFO and above to stdoout
      },
      {
          level: 'trace',  
          path: '/data/testing.log'  // log TRACE and above to log file
      }
    ]
  }
)

// logs with level info and message:
// This log will appear in resin web-log console and log file.
log.info('main app has started');
// This will only appear in /data/testing.log
log.debug('Some debugging info');  


server.listen(8080);

const getCpuLoad = (socket) => {
  exec('cat /proc/loadavg', (err, text) => {
    if (err) {
      log.error('failed getting CPU load:' + err);
      throw err;
    }
    // Get overall average from last minute
    const matchLoad = text.match(/(\d+\.\d+)\s+/);
    if (matchLoad) {
      const load = parseFloat(matchLoad[1]);
      log.debug('CPU load: ' + load)
      socket.emit('loadavg', {
        onemin: load
      });
    }
  });
};

const getMemoryInfo = (socket) => {
  exec('cat /proc/meminfo', (err, text) => {
    if (err) {
      log.error('failed getting meminfo: ' + err);
      throw err;
    }
    // Get overall average from last minute
    const matchTotal = text.match(/MemTotal:\s+([0-9]+)/);
    const matchFree = text.match(/MemFree:\s+([0-9]+)/);
    if (matchTotal && matchFree) {
      const total = parseInt(matchTotal[1], 10);
      const free = parseInt(matchFree[1], 10);
      const percentageUsed = (total - free) / total * 100;
      log.debug('memory percentage used: ' + percentageUsed);
      socket.emit('memory', {
        used: percentageUsed
      });
    }
  });
};

io.on('connection', function(socket) {
  'use strict';
  log.info('a user connected');
  let dataLoop = setInterval(function() {
    getCpuLoad(socket);
    getMemoryInfo(socket);
  }, 1000);
	socket.on('disconnect', function() {
      log.info('a user disconnected');
			clearInterval(dataLoop);
   });
});
