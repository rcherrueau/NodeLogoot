var PORT = 1337;
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');
var fs = require('fs');

/*!
 * \brief Currently connected users.
 *
 * Each user has the followinf form:
 \verbatim
  {
    id          : <USER UNIQUE ID>,
    name        : <USER NAME>,
    connection  : <WEBSOCKET CONNECTION OBJECT>
  }
 \endverbatim
 */
var users = [];

//! Context is all transmited patchs from server start.
var patchs = [];

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

function sendContext(user) {
  // Send existing patch.
  for (var i in patchs) {
    var msg = JSON.stringify({ type: 'patch', patch: patchs[i] });

    user.connection.sendUTF(msg);
  }

  // Send connected user.
  for (var i in users) {
    if (users[i] != user) {
      var msg = JSON.stringify({
        type  : 'userConnected',
        id    : users[i].id,
        name  : users[i].name
      });

      user.connection.sendUTF(msg);
    }
  }
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
 * \param user  The new user successfuly connected object.
 */
function sendConnectSuccessful(user) {
  var msg = JSON.stringify({
    type  : 'connected',
    id    : user.id,
    name  : user.name
  });

  user.connection.sendUTF(msg);
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
 * The new user connected notification is not send to new user.
 *
 * \param user    The new user connected object.
 */
function sendNewUserConnected(user) {
  var msg = JSON.stringify({
    type  : 'userConnected',
    id    : user.id,
    name  : user.name
  });

  for (var i in users) {
    if (users[i].connection != user.connection) {
      users[i].connection.sendUTF(msg);
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
 * \param user      The disconnect user object.
 */
function sendUserDisconnected(user) {
  var msg = JSON.stringify({ type: 'userDisconnected', id: user.id });

  for (var i in users) {
    if (users[i].connection != user.connection) {
      users[i].connection.sendUTF(msg);
    }
  }
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

  for (var i in users) { 
    if (users[i].connection != except) {
      users[i].connection.sendUTF(msg);
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
 * Listen on a new user connect to WebSocket Server. A new user is store in
 * users after user identification. Each user is an object with following
 * format :
 \verbatim
  {
    id          : <USER UNIQUE ID>,
    name        : <USER NAME>,
    connection  : <WEBSOCKET CONNECTION OBJECT>
  }
 \endverbatim
 *
 * \param req   The user request.
 */
function onWsRequest(req) {
  var connection = req.accept(null, req.origin);

  var user = false;
  var index = false;

  // Each user send a message event, message is broadcasted to all users.
  connection.on('message', function(message) {
    if (message.type == 'utf8') {
      var obj = JSON.parse(message.utf8Data);

      switch (obj.type) {
      case 'register':
        user = { id: UUID.gen(), name: obj.name, connection: connection };
        index = users.push(user) - 1;
        sendConnectSuccessful(user);
        sendContext(user);
        sendNewUserConnected(user);
        break;
      case 'patch':
        sendPatch(obj.patch, connection);
        patchs.push(obj.patch);
        break;
      default: // Do Nothing
      }
    }
  });

  // At user disconection, he is remove from broadcast groupe.
  connection.on('close', function(connection) {
    if (index !== false) {
      users.splice(index, 1); 
      sendUserDisconnected(user);
    }
  });
}

//! Http Server.
var server = http.createServer(onHttpRequest).listen(PORT);

//! WebSocket Server.
var wsServer = new WebSocketServer({ httpServer: server })
  .on('request', onWsRequest);

console.log('Server running at http://127.0.0.1:' + PORT);

