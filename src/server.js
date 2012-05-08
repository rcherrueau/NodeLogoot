var PORT = 1337;
var WebSocketServer = require('websocket').server;
var http = require('http');
var url = require('url');
var fs = require('fs');

//! Currently connected clients.
var clients = [];

//! Context is all transmited message from server start.
var context = [];

//! Array with some colors.
var colors = ["blue", "blueviolet", "brown", "darkorange", "hotpink", "red", 
    "forestgreen", "cadetblue", "chartreuse", "chocolate", "coral",
    "cornflowerblue", "crimson", "cyan"];
colors.sort(function(a,b) { return Math.random() > 0.5; });

var id = 0;

function genId() { return ++id; }

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
    name  : <USER NAME>,
    color : <USER COLOR>
  }
 \endverbatim
 *
 * \param connection  The websocket user connection (to send message).
 * \param userId      The user id.
 * \param userName    The new user name.
 * \param userColor   The new user color.
 */
function sendConnectSuccessful(connection, userId, userName, userColor) {
  var msg = JSON.stringify({
    type  : 'connected',
    id    : userId,
    name  : userName,
    color : userColor
  });

  connection.sendUTF(msg);
}

/*!
 * \brief Specifie new user connected to edit document.
 *
 * Send via websocket a notification of new user connected to document. The
 * message is send to all clients. It is formated in json and have the
 * following form:
 \verbatim
 {
    type  : 'userConnected',
    id    : <USER UNIQUE ID>,
    name  : <USER NAME>,
    color : <USER COLOR>
 }
 \endverbatim
 *
 * \param userId      The new user id.
 * \param userName    The new user name.
 * \param userColor   The new user color.
 * \param except      The connection to not send.
 */
function sendNewUserConnected(userId, userName, userColor, except) {
  var msg = JSON.stringify({
    type  : 'userConnected',
    id    : userId,
    name  : userName,
    color : userColor
  });

  for (var i in clients) {
    if (clients[i] != except) {
      clients[i].sendUTF(msg);
    }
  }
}

/*!
 * \brief Specifie user disconnected on edit document.
 *
 * Send via websocket a notification of user disconnecte on edit document. The
 * message is send to all clients. It is formated in json and have the
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

  for (var i in clients) { clients[i].sendUTF(msg); }
}

/*!
 * \brief Send new patch to all clients.
 *
 * Send via websocket a new patch to all clients. The message is formated in
 * json with the following form:
 \verbatim
 {
    type  : 'patch',
    patch : <PATCH OBJECT>
 }
 \endverbatim
 *
 * \param patch The patch to send to all user.
 */
function sendPatch(patch) {
  var msg = JSON.stringify({ type: 'patch', patch: patch });
  for (var i in clients) { clients[i].sendUTF(msg); }
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
  var index = clients.push(connection) - 1;

  var userId = false;
  var userColor = false;
  var userName = false;

  // Each user send a message event, message is broadcasted to all users.
  connection.on('message', function(message) {
    if (message.type == 'utf8') {
      var obj = JSON.parse(message.utf8Data);

      switch (obj.type) {
      case 'register':
        userId = genId();
        userColor = colors.shift();
        userName = obj.name;
        sendConnectSuccessful(connection, userId, userName, userColor);
        sendNewUserConnected(userId, userName, userColor, connection);
        break;
      case 'patch':
        sendPatch(obj.patch);
        break;
      default: // Do Nothing
      }
    }
  });

  // At user disconection, he is remove from broadcast groupe.
  connection.on('close', function(connection) {
    clients.splice(index, 1); 
    sendUserDisconnected(userId);
  });
}

//! Http Server.
var server = http.createServer(onHttpRequest).listen(PORT);

//! WebSocket Server.
var wsServer = new WebSocketServer({ httpServer: server })
  .on('request', onWsRequest);

console.log('Server running at http://127.0.0.1:' + PORT);

