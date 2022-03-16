  var homeDir = require('path').join(require('os').homedir());
require('greenlock-express').create({
  version: 'draft-11'
, server: 'https://acme-v02.api.letsencrypt.org/directory'
//, server: 'https://acme-staging-v02.api.letsencrypt.org/directory'  // staging
, email: ''                               // CHANGE THIS
, agreeTos: true
, approveDomains: [ '', '' ]              // CHANGE THIS
, store: require('greenlock-store-fs')
, configDir: homeDir
, app: require('./server.js')
//, communityMember: true
}).listen(8080, 8443);
