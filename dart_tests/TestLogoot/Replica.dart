class Replica {
  static final num BASE = 100;
  static final num BOUNDARY = 10;

  String name;
  int identifier;
  int clock;
  var textZone;
  Replica neighbor;
  List<LineIdentifier> idTable;
  String currentText;

  Replica(this.name, this.identifier) {
    this.clock = 1;
    this.textZone = document.query('#' + this.name);
    this.neighbor = null;
    this.idTable = new List<LineIdentifier>();
    this.currentText = "";

    this.idTable.add(LineIdentifier.firstIDL());
    this.idTable.add(LineIdentifier.lastIDL());

    document.query('#label_' + this.name).innerHTML = this.name;
    this.textZone.on.keyUp.add(logoot, false);
  }
  
  void setNeighbor(Replica neighbor) {
    this.neighbor = neighbor;
  }

  // FIXME considere que tout est ajout, pour l'instant
  void logoot(event) {
    print('===================================================================');
    for(int i = 0; i < idTable.length; ++i) {
      print(idTable[i]);
    }
    print('-------------------------------------------------------------------');
    List<Operation> patch = new List<Operation>();
    DiffMatchPatch dmp = new DiffMatchPatch();
    String newText = this.textZone.value;
    List<Diff> diffs = dmp.diff_main(this.currentText, newText, false);
    int index = 0;

    for(int i = 0; i < diffs.length; ++i) {
      Diff d = diffs[i];
      int nbChar = d.text.length;

      if(d.operation == DIFF_EQUAL) {
        index += nbChar;
      } else if(d.operation == DIFF_INSERT) {
        LineIdentifier p = idTable[index];
        LineIdentifier q = idTable[index + 1];
        List<LineIdentifier> newLinesID = this.generateLineIdentifiers(p, q, nbChar, BOUNDARY);
        
        for(int j = 0; j < newLinesID.length; ++j) {
          patch.add(new Operation(Operation.INSERTION, newLinesID[j], d.text[j]));
        }

        index += nbChar;
      } else if(d.operation == DIFF_DELETE) {
        for(int j = 0; j < nbChar; ++j) {
          LineIdentifier toRemove = idTable[index + 1];
          
          patch.add(new Operation(Operation.DELETION, toRemove, ""));
        }
      }
    }

    deliver(patch, this.identifier);
    this.neighbor.deliver(patch, this.identifier);
    print('-------------------------------------------------------------------');
    for(int i = 0; i < idTable.length; ++i) {
      print(idTable[i]);
    }
    print('===================================================================');
    
    // DEBUG
    if(this.textZone.value == this.neighbor.textZone.value) {
      print("Les deux clients ont la meme version :)");
    } else {
      print("Les deux clients n'ont pas la meme version :(");
    }
  }
  
  List<LineIdentifier> generateLineIdentifiers(LineIdentifier p, LineIdentifier q, int N, int boundary) {
    List<LineIdentifier> list = new List<LineIdentifier>();
    int index = 0;
    int interval = 0;
    int step;
    int r;
    
    // FIXME Si interval est negatif, alors la boucle est infinie...
    //       prefix(p,index) peut etre superieur a prefix(q,index)...
    while(interval < N) {
      index++;
      interval = prefix(q, index) - prefix(p, index) - 1;
    }
    
    if((interval / N) < boundary) {
      step = (interval / N).toInt();
    } else {
      step = boundary;
    }
    r = prefix(p, index);
    
    for(int i = 0; i < N; ++i) {
      num random = (Math.random() * (step - 1)) + 1;

      list.add(constructIdentifier(r + random.toInt(), p, q));

      r += step;
    }

    return list;
  }
  
  int prefix(LineIdentifier p, int index) {
    String result = "";
    int size = (Replica.BASE-1).toString().length;
    
    for(int i = 0; i < index; i++){
      String s = "0";
      
      if(i < p.length()) {
        s = p[i].digit.toString();
      }
      
      while(s.length < size) {
        s = "0" + s;
      }
      
      result += s;
    }
    
    return Math.parseInt(result);
  }
  
  List<int> prefix2list(int pref) {
    List<int> result = new List<int>();
    String ts = pref.toString();
    int size = (Replica.BASE - 1).toString().length;
    int endIndex = ts.length;
    int beginIndex = Math.max(0, endIndex - size);
    String cs = ts.substring(beginIndex, endIndex);
    
    result.addLast(Math.parseInt(cs));
    
    while (beginIndex != 0) {
      endIndex -= cs.length;
      beginIndex = Math.max(0, endIndex - size);
      cs = ts.substring(beginIndex, endIndex);
      result.insertRange(0, 1, Math.parseInt(cs));
    }
    
    return result;
  }
  
  LineIdentifier constructIdentifier(int r, LineIdentifier p, LineIdentifier q) {
    LineIdentifier id = new LineIdentifier();
    List<int> pref = prefix2list(r);

    for(int i = 0; i < pref.length; ++i) {
      int d = pref[i];
      int s;
      int c;
      
      if(p.length() > i && d == p[i].digit) {
        s = p[i].repid;
        c = p[i].clock;
      } else if(q.length() > i && d == q[i].digit) {
        s = q[i].repid;
        c = q[i].clock;
      } else {
        s = this.identifier;
        c = this.clock++;
      }
      
      id.conc(new Position(d, s, c));
    }
    
    return id;
  }
  
  void deliver(List<Operation> patch, int identifier) {
    for(int i = 0; i < patch.length; ++i) {
      Operation op = patch[i];
      
      if(op.type == Operation.INSERTION) {
        // cherche l'identifiant precedant le nouvel identifiant
        int position = closest(op.id);

        if(position <= this.currentText.length) {
          this.currentText = this.currentText.substring(0, position) + op.content + this.currentText.substring(position);
        }
        
        if(!(this.identifier == identifier)) {
          // insertion du content a la position, dans le textarea
          this.textZone.value = this.currentText;
        }

        // ajout du nouvel identifiant, a la bonne position
        idTable.insertRange(position + 1, 1, op.id);
      } else if(op.type == Operation.DELETION) {
        // cherche l'identifiat precedant l'identifiant a supprimer
        int position = indexOf(op.id);
        
        if(position != -1) {
          if(this.currentText.length >= position + 1) {
            this.currentText = this.currentText.substring(0, position - 1) + this.currentText.substring(position);
          } else {
            this.currentText = this.currentText.substring(0, position - 1);
          }
          this.textZone.value = this.currentText;
          this.idTable.removeRange(position, 1);
        }
      }
    }
  }
  
  // TODO appliquer l'algorithme de recherche dicotomique
  int closest(LineIdentifier idl) {
    int index = 0;

    for(int i = 0; i < idTable.length; ++i) {
      if(idTable[i] < idl) {
        index = i;
      } else {
        break;
      }
    }

    return index;
  }
  
  // TODO appliquer l'algorithme de recherche dicotomique
  int indexOf(LineIdentifier idl) {
    for(int i = 0; i < idTable.length; ++i) {
      if(idTable[i] == idl) {
        return i;
      }
    }

    return -1;
  }
}
