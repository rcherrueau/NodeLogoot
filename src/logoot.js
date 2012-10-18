// ************************************************************** Logoot Utils *
/*!
 * \brief Returns input string padded on the left or right to specified length
 *        with pad_string.
 *
 * \see http://phpjs.org/functions/str_pad
 * \version 1109.2015
 * \example 1: str_pad('Kevin van Zonneveld', 30, '-=', 'STR_PAD_LEFT');
 * \returns 1: '-=-=-=-=-=-Kevin van Zonneveld'
 * \example 2: str_pad('Kevin van Zonneveld', 30, '-', 'STR_PAD_BOTH');
 * \returns 2: '------Kevin van Zonneveld-----'
 */
function str_pad(input, pad_length, pad_string, pad_type) {
    var half = '',
        pad_to_go;
 
    var str_pad_repeater = function (s, len) {
        var collect = '',
            i;
 
        while (collect.length < len) {
            collect += s;
        }
        collect = collect.substr(0, len);
 
        return collect;
    };
 
    input += '';
    pad_string = pad_string !== undefined ? pad_string : ' ';
 
    if (pad_type != 'STR_PAD_LEFT'
        && pad_type != 'STR_PAD_RIGHT'
        && pad_type != 'STR_PAD_BOTH') {
        pad_type = 'STR_PAD_RIGHT';
    }
    if ((pad_to_go = pad_length - input.length) > 0) {
        if (pad_type == 'STR_PAD_LEFT') {
            input = str_pad_repeater(pad_string, pad_to_go) + input;
        } else if (pad_type == 'STR_PAD_RIGHT') {
            input = input + str_pad_repeater(pad_string, pad_to_go);
        } else if (pad_type == 'STR_PAD_BOTH') {
            half = str_pad_repeater(pad_string, Math.ceil(pad_to_go / 2));
            input = half + input + half;
            input = input.substr(0, pad_length);
        }
    }
 
    return input;
}

/*!
 * \brief Convert a string to an array. If split_length is specified, break the
 *        string down into chunks each split_length characters long.  
 *
 * \see http://phpjs.org/functions/str_split
 * \version 1109.2015
 * \example 1: str_split('Hello Friend', 3);
 * \returns 1: ['Hel', 'lo ', 'Fri', 'end']
 */
function str_split (string, split_length) {
    if (split_length === null) {
        split_length = 1;
    }
    if (string === null || split_length < 1) {
        return false;
    }
    string += '';
    var chunks = [],
        pos = 0,
        len = string.length;
    while (pos < len) {
        chunks.push(string.slice(pos, pos += split_length));
    }
 
    return chunks;
}

/*!
 * \brief   Returns random value between min and max.
 *
 * \param   min Min range for random value.
 * \param   max Max range for random value.
 * \return  Random integer value in range <tt>[min..max]</tt>.
 */
function rand(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

// ************************************************************** Logoot Datas *
//! BASE constant for position object (if not existe, BASE is set to MAX_INT).
if (!BASE) {
  var MAX_INT = Math.pow(2, 32);
  var BASE = MAX_INT;
}

// ! Number of digit in BASE.
var DIGIT = Number(BASE.toString().length - 1);

/*!
 * \class Triplet
 * \brief Triplet meta data.
 * 
 * \param a First element of triplet tuple.
 * \param b Second element of triplet tuple.
 * \param c Third element of triplet tuple.
 */
function Triplet(a, b, c) {

  // ! The first tuple element.
  this.first = a;

  // ! The second tuple element.
  this.second = b;

  // ! The third tuple element.
  this.third = c;
}

/*!
 * \brief Returns element at specific place.
 * 
 * Returns element at specific place. Index would be in range [0..2].
 * 
 * \param i The index place.
 * \return The element at place \c i or \c null if \c i not in range [0..2].
 */
Triplet.prototype.get = function(i) {
  var value;

  switch (i) {
  case 0:
    value = this.first;
    break;
  case 1:
    value = this.second;
    break;
  case 2:
    value = this.third;
    break;
  default:
    value = null;
  }

  return value;
}

/*!
 * \class Position
 * \extends Triplet
 * 
 * \param int_ Integer in range of <tt>[0..BASE[</tt>.
 * \param replica Unique replica identifier.
 * \param clock \c s timestamps (default 0).
 */
function Position(int_, replica, clock) {
  if (!clock) {
    var clock = 0;
  }

  Triplet.call(this, int_, replica, clock);
}
Position.prototype = new Triplet;
Position.prototype.constructor = Position;

/*!
 * \brief Returns the Integer in range of <tt>[0..BASE[</tt>.
 * 
 * \return The integer in range of <tt>[0..BASE[</tt>.
 */
Position.prototype.getInt = function() {
  return this.first;
}

/*!
 * \brief Returns replica identifying the user.
 * 
 * \return The unique identifier.
 */
Position.prototype.getReplica = function() {
  return this.second;
}

/*!
 * \brief Returns the current value of the clock.
 * 
 * \return The value of clock.
 */
Position.prototype.getClock = function() {
  return this.third;
}

/*!
 * \brief Compare current position with another.
 * 
 * \param position Position to compare with current.
 * \return Result of comparison. Values is one of (-1, 0, 1).
 */
Position.prototype.compareTo = function(position) {
  if (this.getInt() > position.getInt()) {
    return 1;
  } else if (this.getInt() < position.getInt()) {
    return -1;
  }

  if (this.getReplica > position.getReplica()) {
    return 1;
  } else if (this.getReplica < position.getReplica()) {
    return -1;
  }

  if (this.getClock > position.getClock()) {
    return 1;
  } else if (this.getClock < position.getClock()) {
    return -1;
  }

  return 0;
}

/*!
 * \brief Compare current position with another on int_ attribut.
 *
 * \param position Position to compare with current.
 * \return Result of comparison. Values is one of (-1, 0, 1).
 */
Position.prototype.compareOnInt = function(position) {
  if (this.getInt() > position.getInt()) {
    return 1;
  } else if (this.getInt() < position.getInt()) {
    return -1;
  } else {
    return 0;
  }
}

/*!
 * \brief Returns a string representation of the object.
 * 
 * \return A string representation of the object.
 */
Position.prototype.toString = function() {
  return "(" + this.getInt() + ":" + this.getReplica() + ":"
      + this.getClock() + ")";
}

/*!
 * \brief Returns minimum position value possible.
 * 
 * \return New Position that is minimum value accepted.
 */
Position.getMin = function() {
  return new Position(1, 0, 0);
}

/*!
 * \brief Returns maximum position value possible.
 * 
 * \return New Position that is maximum value accepted (aka \c BASE - 1).
 */
Position.getMax = function() {
  return new Position(BASE - 1, 0, 0);
}

/*!
 * \class LineId
 * \brief Line identifier.
 * 
 * LineId is a no mutable ordered Position list. The last Position of the list
 * is the last position of line and position used to create line. Moreover, each
 * position in LineId which have same \c BASE.
 */
function LineId() {
  // ! Positions container.
  this.positions = [];
}

/*!
 * \brief Adds new position to current Line Identifier.
 * 
 * \param position The position to add (needs have same \c BASE as others).
 */
LineId.prototype.add = function(position) {
  this.positions.push(position);
}

/*!
 * \brief Returns position at specified index.
 * 
 * \param i Index of position to return.
 * \return The position object at the specified index (or undefined).
 */
LineId.prototype.getPosition = function(i) {
  return this.positions[i];
}

/*
 * ! \brief Returns length of Line Identifier.
 * 
 * \return Number of Position in Line Identifier.
 */
LineId.prototype.length = function() {
  return this.positions.length;
}

/*!
 * \brief Compare a LineId with the current.
 * 
 * \param lineId The LineId to compare with current.
 * \return Result of comparison. Values is one of (-1, 0, 1).
 */
LineId.prototype.compareTo = function(lineId) {
  if (this.length() > 0 && lineId.length() > 0) {

    // Campare each position one by one.
    var minPosition = Math.min(this.length(), lineId.length());
    for (var i = 0; i < minPosition; ++i) {
      var comparison = this.getPosition(i).compareOnInt(lineId.getPosition(i));
      if (comparison != 0) {
        return comparison;
      }
    }

    // If no difference find, the comparison is get from the bigger one.
    if (this.length() > lineId.length()) {
      return 1;
    } else if (this.length() < lineId.length()) {
      return -1;
    }

    // If LineId are length equal and compareOnInt equals on each position,
    // compare last position on all attributes.
    return this.getPosition(Math.min(this.length(), lineId.length())-1).
      compareTo(lineId.getPosition(Math.min(this.length(), lineId.length())-1));
  }

  return 0;
}

/*
 * ! \brief Returns a string representation of the object.
 * 
 * \return A string representation of the object.
 */
LineId.prototype.toString = function() {
  var str;

  str = "[";
  for ( var key in this.positions) {
    str += this.positions[key].toString();
  }
  str += "]";

  return str;
}

/*!
 * \brief Returns a JSON representation of the object.
 * 
 * \return A JSON from object datas.
 */
LineId.prototype.serialize = function() {
  return JSON.stringify(this);
}

/*!
 * \brief Unserialize a JSON LineId.
 * 
 * \param json JSON datas of LineId.
 * \return A new LineId from JSON datas.
 */
LineId.unserialize = function(json) {
  var data = JSON.parse(json);
  var lineId = new LineId();

  for (i in data.positions) {
    var int_ = data.positions[i].first;
    var replica = data.positions[i].second;
    var clock = data.positions[i].third;

    lineId.add(new Position(int_, replica, clock));
  }

  return lineId;
}

/*!
 * \brief Returns new Line Identifier with min position only.
 * 
 * The Line Identifier with min position represent the starter of document.
 * 
 * \return New LineId with Min Position.
 */
LineId.getDocumentStarter = function() {
  var lineId = new LineId();

  lineId.add(Position.getMin());
  return lineId;
}

/*!
 * \brief Returns new Line Identifier with max position only.
 * 
 * The Line Identifier with max position represent the end of document.
 * 
 * \return New LineId with Max Position.
 */
LineId.getDocumentFinisher = function() {
  var lineId = new LineId();

  lineId.add(Position.getMax());
  return lineId;
}

// ***************************************************** Logoot Implementation *
/*!
 * \class   Logoot
 * \brief   Logoot algorithm implementation.
 *
 * Logoot algorithm implementation.
 */
function Logoot() {
}

Logoot.clock = 0;

/*!
 * \brief   Generation of a position, logoot algorithm.
 *
 * \param   previousLineId  The previous LineId.
 * \param   nextLineId      The next LineId.
 * \param   N               Number of positions generated.
 * \param   boundary        
 * \param   rep             Unique user replica.
 * \param   clock           Unique user clock at this time.
 * \return  List of N LineId between previous and next LineId.
 */
Logoot.generateLineId = function(previousLineId, nextLineId, N,
    boundary, replica) {
  var prefPrev = 0;
  var prefNext = 0;
  var index = 0;
  var interval = 0;

  // Compute index to ensure between p and q you could put N new LineId.
  while (interval < N) {
    index ++;

    // Compute prefix
    prefPrev = Logoot.prefix(previousLineId, index);
    prefNext = Logoot.prefix(nextLineId, index);

    // Compute interval
    interval = prefNext - prefPrev - 1;
  }

  // Construct Identifier.
  var step = interval/N;
  step = (boundary) ? Math.min(Math.round(step), boundary) : Math.round(step);
  var r = prefPrev;
  var list = [];

  // -- DEBUG START
  /*
  console.log('prefixPreviousLineId:' + prefPrev);
  console.log('prefixNextLineId:' + prefNext);
  console.log('interval:' + interval);
  console.log('step:' + step);
  //*/
  // -- DEBUG END

  for (var j = 1; j <= N; j++) {
    list.push(Logoot.constructLineId(r + rand(1, step), previousLineId,
          nextLineId, replica));

    r += step;
  }

  return list;
}

/*!
 * \brief   Compute the prefix from a LineId.
 *
 * Returns new number in same base as lineId position integer. It returns
 * \c index first position.getInt from lineId. Each position.getInt is
 * put in same base as \BASE.
 *
 * \param   lineId  The line id to compute prefix.
 * \param   index   Index first position.getInt of lineId.
 * \return  Prefix of lineId.
 */
Logoot.prefix = function(lineId, index) {
  var result = '';
  var min = Math.min(index, lineId.length());
  
  // Get each position.getInt and put it in right BASE.
  for (var id = 0; id < min; ++ id) {
    result += str_pad(lineId.getPosition(id).getInt().toString(), DIGIT, '0',
        'STR_PAD_LEFT');
  }

  // If index is bigger than positions available, fill with 0.
  while (min < index) {
    result += str_pad('', DIGIT, '0');
    ++ min;
  }

  return Number(result);
}

/*!
 * \brief   Generate randomly a LineId.
 *
 * \param   r             value to generate LineId.
 * \param   startLineId   LineId from generate r.
 * \param   endLineId     LineId to generate r.
 * \param   replica       User unqiue replica.
 */
Logoot.constructLineId = function(r, startLineId, endLineId, replica) {
  var strR = r.toString();

  // Cut strR on (DIGIT) to get each chunk. if strR isn't cutable on DIGIT,
  // add needed 0 at left.
  var lastChunkSize = strR.length % DIGIT;
  if (lastChunkSize != 0) {
    var zeroToAdd = str_pad('', DIGIT - lastChunkSize, '0');
    strR = zeroToAdd + strR;
  }

  var chunksR = str_split(strR, DIGIT);
  var lineId = new LineId();

  // Generate position of lineId.
  for (var i in chunksR) {
    var position;
    var d = Number(chunksR[i]);

    if (i < startLineId.length()
        && d == startLineId.getPosition(i).getInt()) {
      position = new Position(d,
          startLineId.getPosition(i).getReplica(),
          startLineId.getPosition(i).getClock());
    } else if (i < endLineId.length()
        && d == endLineId.getPosition(i).getInt()) {
      position = new Position(d,
          endLineId.getPosition(i).getReplica(),
          endLineId.getPosition(i).getClock());
    } else {
      position = new Position(d, replica, Logoot.clock);
      ++Logoot.clock;
    }

    if(isNaN(position.getInt())) {
      console.error("NaN in apostition.");
    }

    lineId.add(position);
  }

  return lineId;
}

