#!/usr/bin/env node

var net = require('net');
var allContainers = require('docker-allcontainers');
var loghose = require("docker-loghose");
var program = require('commander');
var through = require('through2');
var os = require("os");

program
  .version('0.4.0')
  .option('-h, --host [host]', 'Log.io server host', 'localhost')
  .option('-p, --port [port]', 'Log.io server port', 28777)
  .option('-n, --name [name]', 'Log.io node name', os.hostname())
  .parse(process.argv);

function connect() {
  var stream = net.createConnection(program.port, program.host);
  return stream;
}
var s = connect();

var ee = allContainers({
  preheat: true,
  docker: null,
});

var opts = {
  json: false,
  docker: null,
  events: ee
};

loghose(opts).pipe(through.obj(function(chunk, enc, cb) {
  var names = chunk.name.match(/^r-(.*)-([A-Za-z0-9]+)-[0-9]+-[0-9a-z]+$/);
  if (Array.isArray(names) && names.length > 2) {
    this.push('+log|'+names[1]+'|'+names[2]+'|info|'+chunk.line+'\r\n');
  }
  cb();
})).pipe(s);

ee.on('start', function(meta, container) {
  var names = meta.name.match(/^r-(.*)-([A-Za-z0-9]+)-[0-9]+-[0-9a-z]+$/);
  if (Array.isArray(names) && names.length > 2) {
    s.write('+node|'+names[2]+'|'+names[1]+'\r\n');
  }
});

ee.on('stop', function(meta, container) {
  var names = meta.name.match(/^r-(.*)-([A-Za-z0-9]+)-[0-9]+-[0-9a-z]+$/);
  if (Array.isArray(names) && names.length > 2) {
    s.write('-node|'+names[2]+'\r\n');
  }
});
