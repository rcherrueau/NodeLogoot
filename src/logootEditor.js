//! Use BOUNDARY Strategy in Logoot
BOUNDARY = 10;

/*!
 * LogootEditor start logoot on specified element.
 *
 * \param editorId  Id of div to use as editor.
 * \param serverLocation Websocket server address (something like ws://ip:port).
 * \param userName  The new user name.
 * \param connectHandler  Hanlder call  when user successfuly connect to server.
 * \param closeHandler  Handler call when user disconnected to server.
 * \param errorHandler  Handler call when error append.
 * \param newUserHandler  Handler call when new user append to edit document.
 * \param dropUserHandler Handler call when user drop from edit document.
 */
function LogootEditor(editorId, serverLocation, userName,
    connectHandler, closeHandler, errorHandler, newUserHandler, 
    dropUserHandler) {
  //! Pointer on current object.
  var me = this;

  //! Editor element.
  this.editor = document.getElementById(editorId);

  //! Current user.
  this.user = false;

  /*!
   * Connect Handler call when user successfully connect to server.
   *
   * \param id    The user id generated from server.
   * \param name  The user name.
   * \param colot The user color used to color text.
   */
  this.onconnect = connectHandler || false;

  /*!
   * Close Handler call when user is disconnected from server.
   *
   * \param id  The user id disconnected (obviously, curent id).
   */
  this.onclose = closeHandler || false;

  /*!
   * Error Handler call when error append.
   *
   * \param error Message about error.
   */
  this.onerror = errorHandler || false;

  /*!
   * New User Handler call when new user connected to edit document.
   *
   * \param id    The user id.
   * \param name  The user name.
   * \param colot The user color used to color text.
   */
  this.onnewuser = newUserHandler || false;

  /*!
   * Drop User Handler call when user disconnected from edit document.
   *
   * \param id    The user id.
   */
  this.ondropuser = dropUserHandler || false;

  /*!
   * On patch handler call patch receive from other user.
   *
   * \param patch The patch to update document.
   */
  this.onpatch = function(patch) {
    switch (patch.type) {
    case LogootEditor.TYPE_INSERTION:
      me.foreignInsertion(patch.repID, patch.keyCode, patch.lineIdentifier,
          me.closestSpan(patch.lineIdentifier).id);
      break;
    case LogootEditor.TYPE_DELETION:
      me.foreignDeletion(patch.repId, patch.lineIdentifier);
      break;
    default:
      console.log("ON PATCH, UNKNOW PATCH TYPE");
    }
  }

  //! Websocket.
  this.websocket = new WebSocket(serverLocation);
  this.websocket.onopen = function(evt) {
    console.log("CONNECTED TO " + serverLocation);
    console.log("USER: " + userName);
    me.websocket.send(JSON.stringify({ type:'register', name:  userName }));
  };
  this.websocket.onclose = function(evt) {
    console.log("DISCONNECTED FROM " + serverLocation);
    if (me.onclose !== false && me.user !== false) {
      me.onclose(me.user.id);
    }
  };
  this.websocket.onerror = function(evt) {
    console.log("ERROR FROM " + serverLocation + '['+ evt.data +']');
    if (me.onerror !== false) {
      me.onerror(evt.data);
    }
  };
  this.websocket.onmessage = function(evt) {
    console.log("WEBSOCKET MSG: " + evt.data);
    var obj = JSON.parse(evt.data);

    switch (obj.type) {
    // Current user well connected.
    case 'connected':
      me.user = { id: obj.id, name: obj.name, color: 'black' };
      me.makeLogootEditor();
      if (me.onconnect !== false) {
        me.onconnect(me.user.id, me.user.name, me.user.color);
      }
      break;
    // A new user connected.
    case 'userConnected':
      if (me.onnewuser !== false) {
        me.onnewuser(obj.id, obj.name, caretColorForRepID(obj.id));
      }
      break;
    // A user is disconnected.
    case 'userDisconnected':
      if (me.ondropuser !== false) {
        me.ondropuser(obj.id);
      }
      break;
    // Get new patch.
    case 'patch':
      me.onpatch(obj.patch);
      break;
    default:
      break;
    }
  };
}

//! LineId using at start of editor.
LogootEditor.BEGIN_LINE_ID = LineId.getDocumentStarter().serialize();

//! LineId using at end of editor.
LogootEditor.END_LINE_ID = LineId.getDocumentFinisher().serialize();

LogootEditor.CHARACTER_CLASS = "logoot_character";
LogootEditor.LIMIT_CLASS = "logoot_limit";
LogootEditor.TYPE_INSERTION = "logoot_insertion"; 
LogootEditor.TYPE_DELETION = "logoot_deletion";

//! Create logoot editor 
LogootEditor.prototype.makeLogootEditor = function() {
  // Clear user div.
  while (this.editor.firstChild) {
    this.editor.removeChild(this.editor.firstChild);
  }

  // Set user div to LogootEditor.
  var startLogootDocument = document.createElement('span');
  startLogootDocument.id = LogootEditor.BEGIN_LINE_ID;
  startLogootDocument.className = LogootEditor.LIMIT_CLASS;

  var endLogootDocument = document.createElement('span');
  endLogootDocument.id = LogootEditor.END_LINE_ID;
  endLogootDocument.className = LogootEditor.LIMIT_CLASS;

  this.editor.contentEditable = true;
  this.editor.appendChild(startLogootDocument);
  this.editor.appendChild(endLogootDocument);

  // Set LogootEditor events.
  this.editor.addEventListener("keypress", (function(instance) {
    return function(evt) { instance.insertion(evt); }
  })(this), false);
  this.editor.addEventListener("paste", (function(instance) {
    return function (evt) { instance.paste(evt); }
  })(this), false);
  this.editor.addEventListener("keydown", (function(instance) {
    return function (evt) { instance.deletion(evt); }
  })(this), false);
}

// ******************************************************* LogootEditor Events *
/*!
 * Call after insertion on LogootEditor.
 *
 * After each insertion on LogootEditor, logoot is used to generate the new
 * LineIdentifier (unique in document). After insertion a patch is computed
 * and broadcast to other user with websocket.
 */
LogootEditor.prototype.insertion = function(event) {
  var selection = window.getSelection();
  var range = selection.getRangeAt(0);
  var next = selection.anchorNode.parentNode.nextSibling;
  var span = document.createElement('span');
  var data = String.fromCharCode(event.keyCode);

  // space
  if (event.keyCode == 32) {
    data = '&nbsp;';
  }

  // be sure that the next node is between the begin and the end span
  if (selection.baseOffset == 0
      || (selection.baseOffset == 1
      && selection.anchorNode.id == "logoot")) {
    next = document.getElementById(LogootEditor.BEGIN_LINE_ID).nextSibling;
  } else if (next == document.getElementById(LogootEditor.BEGIN_LINE_ID)) {
    next = next.nextSibling;  
  } else if (next == null) {
    next = document.getElementById(LogootEditor.END_LINE_ID);
  }

  var previousLineIdentifier = next.previousSibling.id;
  var nextLineIdentifier = next.id;

  // the previous or next span could be a cursor so the lineIdentifiers must
  // be changed
  var previousLineIdTag = document.getElementById(previousLineIdentifier);
  var nextLineIdTag = document.getElementById(nextLineIdentifier);
  while (previousLineIdTag.className != LogootEditor.CHARACTER_CLASS
      && previousLineIdTag.className != LogootEditor.LIMIT_CLASS) {
    previousLineIdentifier = previousLineIdTag.previousSibling.id;
  }
  while (nextLineIdTag.className != LogootEditor.CHARACTER_CLASS
      && nextLineIdTag.className != LogootEditor.LIMIT_CLASS) {
    nextLineIdentifier = nextLineIdTag.nextSibling.id;
  }

  // set the new span
  span.innerHTML = data;
  span.className = LogootEditor.CHARACTER_CLASS;
  span.id = Logoot.generateLineId(LineId.unserialize(previousLineIdentifier),
    LineId.unserialize(nextLineIdentifier), 1, BOUNDARY,
    this.user.id)[0].serialize();

  // insert the added character
  this.editor.insertBefore(span, next);

  // move the caret to the end of the inserted character
  range.selectNode(span);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  // notify other clients
  var message = JSON.stringify({
    type  : 'patch',
    patch : {
      type            : LogootEditor.TYPE_INSERTION,
      repID           : this.user.id,
      keyCode         : event.keyCode,
      lineIdentifier  : span.id
    }
  });

  this.websocket.send(message);
  
  // cancel the event, then the character is not added twice
  event.returnValue = false;
}

/*!
 * Call after paste on LogootEditor.
 *
 * \todo  Treat paste event.
 */
LogootEditor.prototype.paste = function(event) {
  alert("Paste not supported.");
  console.error("Paste not supported.");
  event.returnValue = false;
}

/*!
 * Call after deletion on LogootEditor.
 *
 * After each deletion on LogootEditor char is delete on LogootEditor. After
 * deletiona patch is computed and broadcast to other user with websocket.
 */
LogootEditor.prototype.deletion = function(event) {
  switch(event.keyCode) {
    // <-
    case 8:
      var selection = window.getSelection();
      var range = document.createRange();
      var span = selection.anchorNode.parentNode;

      // notify other clients
      var message = JSON.stringify({
        type  : 'patch',
        patch : {
          type            : LogootEditor.TYPE_DELETION,
          repID           : this.user.id,
          lineIdentifier  : span.id
        }
      });

      this.websocket.send(message);

      if(span.id && span.className != LogootEditor.LIMIT_CLASS) {
        // move the caret to the end of the previous character
        range.selectNode(span.previousSibling);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // delete the character
        this.editor.removeChild(span);
      }

      // cancel the event, then the character is not added twice
      event.returnValue = false;
    break;

    // del
    case 46:
      var selection = window.getSelection();
      var span = selection.anchorNode.parentNode;
      var next = span.nextSibling;

      // space
      if (selection.baseOffset == 0
         || (selection.baseOffset == 1
            && selection.anchorNode.id == "logoot")) {
        next = document.getElementById(LogootEditor.BEGIN_LINE_ID).nextSibling;
      }

      // notify other clients
      var message = JSON.stringify({
        type  : 'patch',
        patch : {
          type            : LogootEditor.TYPE_DELETION,
          repID           : this.user.id,
          lineIdentifier  : next.id
        }
      });

      this.websocket.send(message);

      // delete the character
      if(next && next.className != LogootEditor.LIMIT_CLASS) {
        this.editor.removeChild(next);
      }

      // cancel the event, then the character is not added twice
      event.returnValue = false;
    break;
  }
}

// ******************************************************** LogootEditor Utils *
LogootEditor.prototype.foreignInsertion = function(repID, keyCode,
    newLineIdentifier, previousLineIdentifier) {
  // do not process its own insertions
  if(repID != this.user.id
     && document.getElementById(newLineIdentifier) == undefined) {
    var selection = window.getSelection();
    var next = document.getElementById(previousLineIdentifier).nextSibling;
    var span = document.createElement('span');
    var data = String.fromCharCode(keyCode);
    
    // space
    if(keyCode == 32) {
      data = '&nbsp;';
    }

    // set the new span
    span.innerHTML = data;
    span.id = newLineIdentifier;
    span.className = LogootEditor.CHARACTER_CLASS;
    span.style.color = caretColorForRepID(repID); 
    
    // insert the added character
    this.editor.insertBefore(span, next);
  }
}

LogootEditor.prototype.foreignDeletion = function(repID, lineIdentifier) {
  // do not process its own insertions
  if(repID != this.user.id
     && document.getElementById(lineIdentifier) != undefined) {
    var span = document.getElementById(lineIdentifier);

    // delete the character
    this.editor.removeChild(span);
  }
}

LogootEditor.prototype.raddCaretForRepID = function(repID,
    previousLineIdentifier) {
  // do not (re)display its own caret
  if(repID != this.user.id) {
    var next = document.getElementById(previousLineIdentifier).nextSibling;
    var span = document.createElement("span");

    // delete the old caret (if it exists)
    removeCaretForRepID(repID);

    // set the span to be a special caret
    span.className = CARET_CLASS;
    span.id = repID;
    span.hidden = false;
    span.innerHTML = "<font size=\"5\" face=\"arial\" style=\"color: "
                     + caretColorForRepID(repID)
                     + "\">|</font>";

    // insert the caret
    this.editor.insertBefore(span, next);
  }
}

LogootEditor.prototype.removeCaretForRepID = function(repID) {
  // do not (re)display its own caret
  if(repID != this.user.id) {
    var carets = document.getElementsByClassName(CARET_CLASS);

    for(var i = 0; i < carets.length; ++i) {
      if(carets[i].id = repID) {
        this.editor.removeChild(carets[i]);
      }
    }
  }
}

LogootEditor.prototype.closestSpan = function(newLineIdentifier) {
  var span = this.editor.firstChild.nextSibling;
  var spanLineID = LineId.unserialize(span.id);
  var newLineID = LineId.unserialize(newLineIdentifier);
  var compareTo = newLineID.compareTo(spanLineID);

  while(compareTo == 1) {
    span = span.nextSibling;
    spanLineID = LineId.unserialize(span.id);
    compareTo = newLineID.compareTo(spanLineID);
  }

  return span.previousSibling;
}

var notMe = new Array();
var color = [
  "blue",
  "blueviolet",
  "brown",
  "darkorange",
  "hotpink",
  "red",
  "forestgreen",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "crimson",
  "cyan"
];
var colorIndex = 0;
function caretColorForRepID(repID) {
  if(notMe[repID] == undefined){
   notMe[repID] = colorIndex;
   ++colorIndex;
  }

  return color[notMe[repID]];
}

