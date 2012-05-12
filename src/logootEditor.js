function User(id, name, color) {
  this.id = id;
  this.name = name;
  this.color = color;
}

function LogootEditor(editorId, serverLocation, userName,
    connectHandler, closeHandler, errorHandler, newUserHandler, 
    dropUserHandler) {
  var me = this;
  this.editor = document.getElementById(editorId);
  this.user = false;
  this.onconnect = connectHandler || false;
  this.onclose = closeHandler || false;
  this.onerror = errorHandler || false;
  this.onnewuser = newUserHandler || false;
  this.ondropuser = dropUserHandler || false;

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
    console.log(evt.data);
    var obj = JSON.parse(evt.data);

    switch (obj.type) {
    // Current user well connected.
    case 'connected':
      me.user = new User(obj.id, obj.name, obj.color);
      me.makeLogootEditor();
      if (me.onconnect !== false) {
        me.onconnect(obj.id, obj.name, obj.color);
      }
      break;
    // A new user connected.
    case 'userConnected':
      if (me.onnewuser !== false) {
        me.onnewuser(obj.id, obj.name, obj.color);
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

//==============================================================================
// initialisation
//==============================================================================

var EDITABLE_ID = "logoot";
var BEGIN_LINE_ID = LineId.getDocumentStarter().serialize();
var END_LINE_ID = LineId.getDocumentFinisher().serialize();
var CHARACTER_CLASS = "logoot_character";
var LIMIT_CLASS = "logoot_limit";
var TYPE_INSERTION = "logoot_insertion"; 
var TYPE_DELETION = "logoot_deletion";

var DOMAINE = "";
var REGISTER_URL = DOMAINE + "/r5aJS/sendData?action=register";
var SEND_URL = DOMAINE + "/r5aJS/sendData?action=send";
var PUSH_URL = DOMAINE + "/r5aJS/getData";

LogootEditor.prototype.makeLogootEditor = function() {
  this.editor.contentEditable = true;
  this.editor.addEventListener("keypress", (function(instance) {
    return function(evt) { instance.insertion(evt); }
  })(this), false);
  this.editor.addEventListener("paste", (function(instance) {
    return function (evt) { instance.paste(evt); }
  })(this), false);
  this.editor.addEventListener("keydown", (function(instance) {
    return function (evt) { instance.deletion(evt); }
  })(this), false);
  this.editor.innerHTML = "<span class='" + LIMIT_CLASS + "' id='"
    + BEGIN_LINE_ID + "'></span><span class='" + LIMIT_CLASS + "' id='"
    + END_LINE_ID + "'></span>";
}

LogootEditor.prototype.onpatch = function(patch) {
  if (patch.repID != this.user.id) {
    switch (patch.type) {
    case TYPE_INSERTION:
      this.foreignInsertion(patch.repID, patch.keyCode, patch.lineIdentifier,
          this.closestSpan(patch.lineIdentifier).id);
      break;
    case TYPE_DELETION:
      foreignDeletion(patch.repId, patch.lineIdentifier);
      break;
    }
  }
}

//==============================================================================
// events
//==============================================================================

LogootEditor.prototype.insertion = function(event) {
  var selection = window.getSelection();
  var range = selection.getRangeAt(0);
  var next = selection.anchorNode.parentNode.nextSibling;
  var span = document.createElement("span");
  var data = String.fromCharCode(event.keyCode);

  // space
  if (event.keyCode == 32) {
    data = "&nbsp;";
  }

  // be sure that the next node is between the begin and the end span
  if (selection.baseOffset == 0
      || (selection.baseOffset == 1
      && selection.anchorNode.id == "logoot")) {
    next = document.getElementById(BEGIN_LINE_ID).nextSibling;
  } else if (next == document.getElementById(BEGIN_LINE_ID)) {
    next = next.nextSibling;  
  } else if (next == null) {
    next = document.getElementById(END_LINE_ID);
  }

  var previousLineIdentifier = next.previousSibling.id;
  var nextLineIdentifier = next.id;

  // the previous or next span could be a cursor so the lineIdentifiers must
  // be changed
  var previousLineIdTag = document.getElementById(previousLineIdentifier);
  var nextLineIdTag = document.getElementById(nextLineIdentifier);
  while (previousLineIdTag.className != CHARACTER_CLASS
      && previousLineIdTag.className != LIMIT_CLASS) {
    previousLineIdentifier = previousLineIdTag.previousSibling.id;
  }
  while (nextLineIdTag.className != CHARACTER_CLASS
      && nextLineIdTag.className != LIMIT_CLASS) {
    nextLineIdentifier = nextLineIdTag.nextSibling.id;
  }

  // set the new span
  span.innerHTML = data;
  span.className = CHARACTER_CLASS;
  span.id = Logoot.generateLineId(LineId.unserialize(previousLineIdentifier),
    LineId.unserialize(nextLineIdentifier), 1, 10, this.user.id)[0].serialize();

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
      type            : TYPE_INSERTION,
      repID           : this.user.id,
      keyCode         : event.keyCode,
      lineIdentifier  : span.id
    }
  });

  this.websocket.send(message);
  
  // cancel the event, then the character is not added twice
  event.returnValue = false;
}

LogootEditor.prototype.paste = function(event) {
  alert("Paste not supported.");
  event.returnValue = false;
}

LogootEditor.prototype.deletion = function(event) {
  switch(event.keyCode) {
    // <-
    case 8:
      var selection = window.getSelection();
      var range = document.createRange();
      var span = selection.anchorNode.parentNode;

      // notify other clients
      var message = {"type": TYPE_DELETION, "repID": this.user.id, "lineIdentifier": span.id}
      send(message);

      if(span.id && span.className != LIMIT_CLASS) {
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
      if(selection.baseOffset==0
         || (selection.baseOffset==1 && selection.anchorNode.id == "logoot")) {
        next=document.getElementById(BEGIN_LINE_ID).nextSibling;
      }

      // notify other clients
	  var message = {"type": TYPE_DELETION, "repID": this.user.id, "lineIdentifier": next.id}
	  send(message);

      // delete the character
      if(next && next.className != LIMIT_CLASS) {
        this.editor.removeChild(next);
      }

      // cancel the event, then the character is not added twice
      event.returnValue = false;
    break;
  }
}

//==============================================================================
// utilities
//==============================================================================

LogootEditor.prototype.foreignInsertion = function(repID, keyCode,
    newLineIdentifier, previousLineIdentifier) {
  // do not process its own insertions
  if(repID != this.user.id
     && document.getElementById(newLineIdentifier) == undefined) {
    var selection = window.getSelection();
    var next = document.getElementById(previousLineIdentifier).nextSibling;
    var span = document.createElement("span");
    var data = String.fromCharCode(keyCode);
    
    // space
    if(keyCode == 32) {
      data = "&nbsp;";
    }

    // set the new span
    span.innerHTML = data;
    span.id = newLineIdentifier;
    span.className = CHARACTER_CLASS;
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

