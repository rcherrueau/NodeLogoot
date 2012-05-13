var PORT = 1337;
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');
var fs = require('fs');

//! Currently connected websocket connections.
var connections = [];

//! Currently connected users.
var users = [];

//! Context is all transmited message from server start.
var context = [];

//! Unique identifier of user.
function UUID() { }
UUID.millisOld = 0;
UUID.counter = 0;
UUID.gen = function() {
  var millis = new Date().getTime() - 1262304000000;

  if (millis == UUID.millisOld) {
    ++ UUID.counter;
  } else {
    UUID.counter = 0;
    UUID.millisOld = millis;
  }

  return (millis * Math.pow(2, 12)) + UUID.counter;
}

/*!
 * \brief Specifie user is successfully connected.
 *
 * Send via websocket the connected message. Connected message specifie the
 * user is successfully connected. The message is formated in json and have the
 * following form:
 \verbatim
  {
    type  : 'connected',
    id    : <USER UNIQUE ID>,
    name  : <USER NAME>
  }
 \endverbatim
 *
 * \param connection  The websocket user connection (to send message).
 * \param userId      The user id.
 * \param userName    The new user name.
 */
function sendConnectSuccessful(connection, userId, userName) {
  var msg = JSON.stringify({
    type  : 'connected',
    id    : userId,
    name  : userName
  });

  connection.sendUTF(msg);
}

/*!
 * \brief Specifie new user connected to edit document.
 *
 * Send via websocket a notification of new user connected to document. The
 * message is send to all connections. It is formated in json and have the
 * following form:
 \verbatim
 {
    type  : 'userConnected',
    id    : <USER UNIQUE ID>,
    name  : <USER NAME>
 }
 \endverbatim
 *
 * \param userId      The new user id.
 * \param userName    The new user name.
 * \param except      The connection to not send.
 */
function sendNewUserConnected(userId, userName, except) {
  var msg = JSON.stringify({
    type  : 'userConnected',
    id    : userId,
    name  : userName
  });

  for (var i in connections) {
    if (connections[i] != except) {
      connections[i].sendUTF(msg);
    }
  }
}

/*!
 * \brief Specifie user disconnected on edit document.
 *
 * Send via websocket a notification of user disconnecte on edit document. The
 * message is send to all connections. It is formated in json and have the
 * following form:
 \verbatim
 {
    type  : 'userDisconnected',
    id    : <USER UNIQUE ID>
 }
 \endverbatim
 *
 * \param userId      The disconnect user id.
 */
function sendUserDisconnected(userId) {
  var msg = JSON.stringify({ type: 'userDisconnected', id: userId });

  for (var i in connections) { connections[i].sendUTF(msg); }
}

/*!
 * \brief Send new patch to all connections.
 *
 * Send via websocket a new patch to all connections. The message is formated in
 * json with the following form:
 \verbatim
 {
    type  : 'patch',
    patch : <PATCH OBJECT>
 }
 \endverbatim
 *
 * \param patch   The patch to send to all user.
 * \param except  The connection to not send.
 */
function sendPatch(patch, except) {
  var msg = JSON.stringify({ type: 'patch', patch: patch });

  for (var i in connections) { 
    if (connections[i] != except) {
      console.log("send to: " + connections[i]);
      connections[i].sendUTF(msg);
    }
  }
}

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
    case '/bootstrap.min.js':
    res.writeHeader(200, {'Content-Type': 'application/javascript'});  
    res.end(fs.readFileSync('./bootstrap.min.js','utf8'));  
    break;
  case '/logoot.js':
    res.writeHeader(200, {'Content-Type': 'application/javascript'});  
    res.end(fs.readFileSync('./logoot.js','utf8'));  
    break;
  case '/logootEditor.js':
    res.writeHeader(200, {'Content-Type': 'application/javascript'});  
    res.end(fs.readFileSync('./logootEditor.js','utf8'));  
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
  var index = connections.push(connection) - 1;

  var user = false;

  // Each user send a message event, message is broadcasted to all users.
  connection.on('message', function(message) {
    if (message.type == 'utf8') {
      var obj = JSON.parse(message.utf8Data);

      switch (obj.type) {
      case 'register':
        user = { id: UUID.gen(), name: obj.name };
        users.push(user);
        sendConnectSuccessful(connection, user);
        sendNewUserConnected(user, connection);
        break;
      case 'patch':
        sendPatch(obj.patch, connection);
        break;
      default: // Do Nothing
      }
    }
  });

  // At user disconection, he is remove from broadcast groupe.
  connection.on('close', function(connection) {
    connections.splice(index, 1); 
    sendUserDisconnected(userId);
  });
}

//! Http Server.
var server = http.createServer(onHttpRequest).listen(PORT);

//! WebSocket Server.
var wsServer = new WebSocketServer({ httpServer: server })
  .on('request', onWsRequest);

console.log('Server running at http://127.0.0.1:' + PORT);

