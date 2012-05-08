function User(is, name, color) {
  this.id = id;
  this.name = name;
  this.color = color;
}

function LogootEditor(contentEditable, serverLocation, userName,
    connectHandler, closeHandler, errorHandler, newUserHandler, 
    dropUserHandler) {
  this.user = false;
  this.onconnect = (connectHandler) ? connectHandler : false;
  this.onclose = (closeHandler) ? closeHandler : false;
  this.onerror = (errorHandler) ? errorHandler : false;
  this.onnewuser = (newUserHandler) ? newUserHandler : false;
  this.ondropuser = (dropUserHandler) ? dropUserHandler : false;

  this.websocket = new WebSocket(serverLocation);
  this.websocket.onopen = function(evt) {
    console.log("CONNECTED TO " + serverLocation);
  };
  this.websocket.onclose = function(evt) {
    console.log("DISCONNECTED FROM " + serverLocation);
    if (this.onclose !== false && this.user !== false) {
      this.onclose(this.user.id);
    }
  };
  this.websocket.onerror = function(evt) {
    console.log("ERROR FROM " + serverLocation + '['+ evt.data +']');
    if (this.onerror !== false) {
      this.onerror(evt.data);
    }
  };
  this.websocket.onmessage = function(evt) {
    console.log(evt.data);
    var obj = JSON.parse(evt.data);

    switch (obj.type) {
    // Current user well connected.
    case 'connected':
      this.user = new User(obj.id, userNamen obj.color);
      this.makeLogootEditor(contentEditable);
      if (this.onconnect !== false) {
        this.onconnect(obj.id, obj.color);
      }
      break;
    // A new user connected.
    case 'userConnected':
      if (this.onnewuser !== false) {
        this.onnewuser(obj.id, obj.name, obj.color);
      }
      break;
    // A user is disconnected.
    case 'userDisconnected':
      if (this.ondropuser !== false) {
        this.ondropuser(obj.id);
      }
      break;
    // Get new patch.
    case 'patch':
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

// generated in makeLogootEditor()
var identifier = undefined;
var logootPusher = undefined;

LogootEditor.prototype.makeLogootEditor = function(divID) {
  var edit = document.getElementById(divID);

  edit.contentEditable = true;
  edit.addEventListener("keypress", insertion, false);
  edit.addEventListener("paste", paste, false);
  edit.addEventListener("keydown", deletion, false);
  edit.innerHTML = "<span class='"
                   + LIMIT_CLASS
                   + "' id='"
                   + BEGIN_LINE_ID
                   + "'></span><span class='"
                   + LIMIT_CLASS
                   + "' id='"
                   + END_LINE_ID
                   + "'></span>";
   logootPusher = new EventSource(PUSH_URL);
   
   logootPusher.onmessage = onReceive;
}

//==============================================================================
// events
//==============================================================================

function onReceive(event) {
  var message = JSON.parse(event.data);

  if(message.repID != identifier) {
    switch(message.type) {
    case TYPE_INSERTION:
      foreignInsertion(message.repID, message.keyCode, message.lineIdentifier,
          closestSpan(message.lineIdentifier).id);
      break;
    case TYPE_DELETION:
      foreignDeletion(message.repId, message.lineIdentifier);
      break;
    }
  }
}

function insertion(event) {
  var edit = document.getElementById(EDITABLE_ID);
  var selection = window.getSelection();
  var range = selection.getRangeAt(0);
  var next = selection.anchorNode.parentNode.nextSibling;
  var span = document.createElement("span");
  var data = String.fromCharCode(event.keyCode);

  // space
  if(event.keyCode==32) {
    data = "&nbsp;";
  }

  // be sure that the next node is between the begin and the end span
  if(selection.baseOffset==0
     || (selection.baseOffset==1 && selection.anchorNode.id == "logoot")) {
    next=document.getElementById(BEGIN_LINE_ID).nextSibling;
  } else if(next == document.getElementById(BEGIN_LINE_ID)) {
    next = next.nextSibling;  
  } else if(next == null) {
    next = document.getElementById(END_LINE_ID);
  }

  var previousLineIdentifier = next.previousSibling.id;
  var nextLineIdentifier = next.id;

  // the previous or next span could be a cursor so the lineIdentifiers must be
  // changed
  while(document.getElementById(previousLineIdentifier).className != CHARACTER_CLASS
        && document.getElementById(previousLineIdentifier).className != LIMIT_CLASS) {
    previousLineIdentifier = document.getElementById(previousLineIdentifier).previousSibling.id;
  }
  while(document.getElementById(nextLineIdentifier).className != CHARACTER_CLASS
        && document.getElementById(nextLineIdentifier).className != LIMIT_CLASS) {
    nextLineIdentifier = document.getElementById(nextLineIdentifier).nextSibling.id;
  }

  // set the new span
  span.innerHTML = data;
  span.className = CHARACTER_CLASS;
  span.id = Logoot.generateLineId(LineId.unserialize(previousLineIdentifier),
                                  LineId.unserialize(nextLineIdentifier),
                                  1,
                                  10,
                                  identifier)[0].serialize();

  // insert the added character
  edit.insertBefore(span, next);

  // move the caret to the end of the inserted character
  range.selectNode(span);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  // notify other clients
  var message = {"type": TYPE_INSERTION, "repID": identifier, "keyCode": event.keyCode, "lineIdentifier": span.id}
  send(message);
  
  // cancel the event, then the character is not added twice
  event.returnValue = false;
}

function paste(event) {
  alert("Paste not supported.");
  event.returnValue = false;
}

function deletion(event) {
  switch(event.keyCode) {
    // <-
    case 8:
      var edit = document.getElementById(EDITABLE_ID);
      var selection = window.getSelection();
      var range = document.createRange();
      var span = selection.anchorNode.parentNode;

      // notify other clients
	  var message = {"type": TYPE_DELETION, "repID": identifier, "lineIdentifier": span.id}
	  send(message);

      if(span.id && span.className != LIMIT_CLASS) {
        // move the caret to the end of the previous character
        range.selectNode(span.previousSibling);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // delete the character
        edit.removeChild(span);
      }

      // cancel the event, then the character is not added twice
      event.returnValue = false;
    break;

    // del
    case 46:
      var edit = document.getElementById(EDITABLE_ID);
      var selection = window.getSelection();
      var span = selection.anchorNode.parentNode;
      var next = span.nextSibling;

      // space
      if(selection.baseOffset==0
         || (selection.baseOffset==1 && selection.anchorNode.id == "logoot")) {
        next=document.getElementById(BEGIN_LINE_ID).nextSibling;
      }

      // notify other clients
	  var message = {"type": TYPE_DELETION, "repID": identifier, "lineIdentifier": next.id}
	  send(message);

      // delete the character
      if(next && next.className != LIMIT_CLASS) {
        edit.removeChild(next);
      }

      // cancel the event, then the character is not added twice
      event.returnValue = false;
    break;
  }
}

//==============================================================================
// utilities
//==============================================================================

function foreignInsertion(repID, keyCode, newLineIdentifier,
                          previousLineIdentifier) {
  // do not process its own insertions
  if(repID != identifier
     && document.getElementById(newLineIdentifier) == undefined) {
    var edit = document.getElementById(EDITABLE_ID);
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
    edit.insertBefore(span, next);
  }
}

function foreignDeletion(repID, lineIdentifier) {
  // do not process its own insertions
  if(repID != identifier
     && document.getElementById(lineIdentifier) != undefined) {
    var edit = document.getElementById(EDITABLE_ID);
    var span = document.getElementById(lineIdentifier);

    // delete the character
    edit.removeChild(span);
  }
}

function addCaretForRepID(repID, previousLineIdentifier) {
  // do not (re)display its own caret
  if(repID != identifier) {
    var edit = document.getElementById(EDITABLE_ID);
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
    edit.insertBefore(span, next);
  }
}

function removeCaretForRepID(repID) {
  // do not (re)display its own caret
  if(repID != identifier) {
    var edit = document.getElementById(EDITABLE_ID);
    var carets = document.getElementsByClassName(CARET_CLASS);

    for(var i = 0; i < carets.length; ++i) {
      if(carets[i].id = repID) {
        edit.removeChild(carets[i]);
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

function closestSpan(newLineIdentifier) {
  var edit = document.getElementById(EDITABLE_ID);
  var span = edit.firstChild.nextSibling;
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

function send(message)
{
	var http;
	if (window.XMLHttpRequest)
	{ // Mozilla, Safari, IE7 ...
		http = new XMLHttpRequest();
	}
	else if (window.ActiveXObject)
	{ // Internet Explorer 6
		http = new ActiveXObject("Microsoft.XMLHTTP");
	}

	http.open('GET', SEND_URL + '&message=' + JSON.stringify(message), true);
	//http.onreadystatechange = handleAJAXReturn;
	http.send(null);
}
