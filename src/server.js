var PORT = 1337;
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');
var fs = require('fs');
var genId = require('./genid');

//! Currently connected clients.
var clients = [];

//! Context is all transmited message from server start.
var context = [];

/*!
 * \brief Http Request listener.
 *
 * \param req   The user request.
 * \param res   The response send to user.
 */
function onHttpRequest(req, res) {
  var route = url.parse(req.url).pathname

  // Ugly url routing ...
  switch (route) {
    case '/bootstrap.min.css':
    res.writeHeader(200, {'Content-Type': 'text/css'});  
    res.end(fs.readFileSync('./bootstrap.min.css','utf8'));  
    break;
  case '/logoot.js':
    res.writeHeader(200, {'Content-Type': 'application/javascript'});  
    res.end(fs.readFileSync('./logoot.js','utf8'));  
    break;
  case '/logoot_editor.js':
    res.writeHeader(200, {'Content-Type': 'application/javascript'});  
    res.end(fs.readFileSync('./logoot_editor.js','utf8'));  
    break;
  case '/logoot.html':
  case '/':
  default:
    res.writeHeader(200, {'Content-Type': 'text/html'});  
    res.end(fs.readFileSync('./logoot.html','utf8'));  
    break;
  }
}

/*!
 * \brief WebSocket Request Listener.
 *
 * Listen on a new user connect to WebSocket Server.
 *
 * \param req   The user request.
 */
function onWsRequest(req) {
  var connection = req.accept(null, req.origin);
  var index = clients.push(connection) - 1;

  // Send id and context to new user.
  var id = JSON.stringify({ type:'id', data:genId() });
  connection.sendUTF(id);
  for (var i in context) {
    var patch = JSON.stringify({ type:'patch', data:context[i] });
    connection.sendUTF(patch);
  }

  // Each user send a message event, message is broadcasted to all users.
  connection.on('message', function(message) {
    if (message.type == 'utf8') {
      for (var i in clients) {
        clients[i].sendUTF(message);
      }
    }
  });

  // At user disconection, he is remove from broadcast groupe.
  connection.on('close', function(connection) {
    clients.splice(index, 1);
  });
}

//! Http Server.
var server = http.createServer(onHttpRequest).listen(PORT);

//! WebSocket Server.
var wsServer = new WebSocketServer({ httpServer: server })
  .on('request', onWsRequest);

console.log('Server running at http://127.0.0.1:' + PORT);

