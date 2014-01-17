function SmartBehavior(oframp) {
  this.__init(oframp);
}

SmartBehavior.prototype = {
  name: "Smart",

  __needle: undefined,
  __fragments: undefined,
  __currentFragment: undefined,

  __init: function(oframp) {
    this.oframp = oframp;
    var _this = this;
    $ext.dom.addEventListener(oframp.container, 'moleculedisplayed',
        function() {
          var ffb = document.getElementById("find_fragments");
          var pe = ffb.parentElement;
          if(ffb) {
            $ext.dom.remove(ffb);
          } else {
            var fcd = document.getElementById("fragment_controls");
            if(fcd) {
              $ext.dom.clear(fcd);
            }
          }
          ffb = document.createElement("button");
          ffb.id = "find_fragments";
          ffb.className = "border_box";
          ffb.appendChild(document.createTextNode("Start parameterising"));
          pe.appendChild(ffb);
          _this.__ffb = ffb;

          $ext.dom.onMouseClick(ffb, function() {
            _this.__selectAtom();
          }, $ext.mouse.LEFT);
        });

    $ext.dom.addEventListener(oframp.container, 'historychanged', function() {
      if(!_this.__ffb || !_this.__afb || !_this.__rfb || !_this.__pfb) {
        return;
      }

      if(_this.oframp.mv.molecule.getUnparameterized().length > 0) {
        if(_this.__needle === undefined) {
          _this.__ffb.style.display = "inline-block";
          _this.__afb.style.display = "none";
          _this.__rfb.style.display = "none";
          _this.__pfb.style.display = "none";
        } else {
          _this.__ffb.style.display = "none";
          _this.__afb.style.display = "inline-block";
          _this.__rfb.style.display = "inline-block";
          _this.__pfb.style.display = "inline-block";
        }
      } else {
        _this.__ffb.style.display = "none";
        _this.__afb.style.display = "none";
        _this.__rfb.style.display = "none";
        _this.__pfb.style.display = "none";
      }
    });
  },

  getJSON: function() {
    return {
      needle: this.__needle,
      fragments: this.__fragments,
      currentFragment: this.__currentFragment
    };
  },

  loadJSON: function(data) {
    this.__needle = data.needle;
    this.__fragments = data.fragments;
    this.__currentFragment = data.currentFragment;

    if(this.__needle !== undefined) {
      this.oframp.mv.molecule.centerOnAtom(this.__needle);
      if(this.__currentFragment !== undefined) {
        this.__showFragment(this.__currentFragment);
      }
    } else {
      this.oframp.mv.molecule.center();
    }
  },

  showSelectionDetails: function(selection) {
    NaiveBehavior.prototype.showSelectionDetails.call(this, selection);
  },

  __selectAtom: function() {
    var unpar = this.oframp.mv.molecule.getUnparameterized();
    if(!unpar) {
      alert("Could not find any more unparameterised atoms.");
      return;
    }

    var needle = $ext.array.randomElement(unpar);
    if(this.__fragments && this.__fragments.length > 0) {
      var fragment = this.__fragments[this.__currentFragment];
      var ua = $ext.each(fragment.atoms, function(atom) {
        var orig = this.oframp.mv.molecule.atoms.get(atom.id);
        var ua = $ext.each(orig.getBondedAtoms(), function(ba) {
          if(unpar.indexOf(ba) !== -1) {
            return ba;
          }
        });
        if(ua) {
          return ua;
        }
      }, this);
      if(ua) {
        needle = ua;
      }
    }
    this.__needle = needle;
    this.oframp.mv.molecule.centerOnAtom(needle);
    this.oframp.getMatchingFragments([needle]);
  },

  showRelatedFragments: function(fragments) {
    this.__fragments = fragments;

    if(this.__ffb.style.display !== "none") {
      this.__initFCD();
    }

    this.__showFragment(0);
    if(this.__fragments.length > 0) {
      this.oframp.checkpoint();
    }
  },

  __initFCD: function() {
    this.__ffb.style.display = "none";

    var fcd = document.getElementById("fragment_controls");
    var afb = document.createElement("button");
    afb.id = "accept_fragment";
    afb.className = "border_box";
    afb.title = "Accept fragment";
    afb.style.backgroundImage = "url('static/img/check_mark.png')";
    fcd.appendChild(afb);
    this.__afb = afb;

    var rfb = document.createElement("button");
    rfb.id = "reject_fragment";
    rfb.className = "border_box";
    rfb.title = "Reject fragment";
    rfb.style.backgroundImage = "url('static/img/ballot_x.png')";
    fcd.appendChild(rfb);
    this.__rfb = rfb;

    var pfb = document.createElement("button");
    pfb.id = "previous_fragment";
    pfb.className = "border_box";
    pfb.title = "Previous fragment";
    pfb.style.backgroundImage = "url('static/img/undo.png')";
    fcd.appendChild(pfb);
    this.__pfb = pfb;

    var _this = this;
    $ext.dom.onMouseClick(afb, function() {
      var cf = _this.__fragments[_this.__currentFragment];
      _this.oframp.mv.setPreviewCharges(cf);

      if(_this.oframp.mv.molecule.getUnparameterized().length > 0) {
        _this.__selectAtom();
      }
    }, $ext.mouse.LEFT);

    $ext.dom.onMouseClick(rfb, function() {
      if(!rfb.disabled) {
        _this.__showFragment(_this.__currentFragment + 1);
        _this.oframp.checkpoint();
      }
    }, $ext.mouse.LEFT);

    $ext.dom.onMouseClick(pfb, function() {
      if(!pfb.disabled) {
        _this.oframp.previousCheckpoint();
      }
    }, $ext.mouse.LEFT);
  },

  __showFragment: function(i) {
    this.__currentFragment = i;
    var fragment = this.__fragments[i];
    if(!fragment) {
      if(confirm("No fragments were found, select a different atom?")) {
        this.__selectAtom();
      } else {
        this.parameterizationFinished();
      }
      return;
    }

    var atoms = $ext.array.map(fragment.atoms, function(atom) {
      var orig = this.oframp.mv.molecule.atoms.get(atom.id);
      atom.element = orig.element;
      atom.x = orig.x;
      atom.y = orig.y;
      return atom;
    }, this);

    var charges = {};
    $ext.each(atoms, function(atom) {
      charges[atom.id] = atom.charge;
    }, this);
    this.oframp.mv.previewCharges(charges);

    if(this.__currentFragment === 0) {
      if(this.__fragments.length === 1) {
        this.__rfb.disabled = "disabled";
      } else {
        this.__rfb.disabled = "";
      }
      this.__pfb.disabled = "disabled";
    } else if(this.__currentFragment === this.__fragments.length - 1) {
      this.__rfb.disabled = "disabled";
      this.__pfb.disabled = "";
    } else {
      this.__rfb.disabled = "";
      this.__pfb.disabled = "";
    }
  },

  showChargeFixer: function(atom, rem, charges, fragment) {
    atom.setCharge((atom.charge + charges[atom.id]) / 2, fragment);
    atom.resetHighlight();

    var needsFix = false;
    rem.each(function(atom, i) {
      if(charges[atom.id]) {
        if(atom.charge) {
          this.showChargeFixer(atom, rem.slice(i + 1), charges, fragment);
          needsFix = true;
          return $ext.BREAK;
        } else {
          atom.setCharge(charges[atom.id], fragment);
          atom.resetHighlight();
        }
      }
    }, this);

    if(!needsFix) {
      if(this.oframp.mv.molecule.getUnparameterized().length == 0) {
        this.parameterizationFinished();
      }
    }
  },

  parameterizationFinished: function() {
    this.__needle = undefined;
    this.__fragments = undefined;
    this.__currentFragment = undefined;
    this.oframp.mv.molecule.center();
    this.oframp.checkpoint();
    alert("You're done! I don't know what should happen now...");
  }
};

SmartBehavior.prototype = $ext.extend($ext.copy(Behavior.prototype),
    SmartBehavior.prototype);
