/**
 * Data structure for a list of atoms
 */
function AtomList(molecule, atoms) {
  this.__init(molecule, atoms);
}

AtomList.prototype = {
  molecule: undefined,
  settings: undefined,
  cache: undefined,

  atoms: undefined,

  __init: function(molecule, atoms) {
    this.molecule = molecule;
    this.settings = molecule.settings;
    this.cache = new Cache();

    this.atoms = new Array();
    $ext.each(atoms, function(atom) {
      if(atom instanceof Atom) {
        this.atoms.push(atom);
      } else {
        this.atoms.push(new Atom(this, atom.id, atom.element, atom.elementID,
            atom.iacm, atom.x, atom.y, atom.x3d, atom.y3d, atom.z3d, atom.charge, atom.previewCharge,
            atom.usedFragments, atom.status, atom.radius));
      }
    }, this);
  },

  /*
   * Convert the basic data of this AtomList to JSON.
   */
  getSimpleJSON: function() {
    return $ext.array.map(this.atoms, function(atom) {
      return atom.getSimpleJSON();
    });
  },

  /*
   * Get all data of this AtomList as a JSON object.
   */
  getJSON: function() {
    return $ext.array.map(this.atoms, function(atom) {
      return atom.getJSON();
    });
  },

  /**
   * Returns true if no atom has coordinates (0,0,0).
   * @returns {boolean}
   */
  checkCoordinates: function() {
    return this.map(function(atom) {
      return atom.x3d == 0 && atom.y3d == 0 && atom.z3d == 0
    }).length === 0
  },


  /**
   * Sets coordinates
   * @param json
   */
  setCoordinates: function(json) {
    this.each(function(atom) {
      for (i = 0; i < json.atoms.length; i++) {
        if (json.atoms[i].elementID == atom.elementID) {
          atom.x3d = json.atoms[i].x3d
          atom.y3d = json.atoms[i].y3d
          atom.z3d = json.atoms[i].z3d
          break
        }
      }
    })
  },

  getLGF: function() {
    var header = "@nodes\n"
        + "partial_charge\tlabel\tlabel2\tatomType\tcoordX\tcoordY\tcoordZ\t"
        + "initColor\t\n";
    var lgfs = this.map(function(atom) {
      return atom.getLGF();
    });
    return header + lgfs.join("");
  },

  /*
   * Get the atom with the given id.
   */
  get: function(id) {
    return this.atoms[this.indexOf(id)];
  },

  /*
   * Get the index of the atom with the given id.
   */
  indexOf: function(id) {
    for( var i = 0; i < this.atoms.length; i++) {
      if(this.atoms[i].id == id) {
        return i;
      }
    }
  },

  /*
   * Get the number of atoms in this list.
   */
  count: function() {
    return this.atoms.length;
  },

  /*
   * Apply a function f to each atom in this list.
   */
  each: function(f, scope) {
    return $ext.each(this.atoms, f, scope);
  },

  /*
   * Mapping function for a list of atoms.
   */
  map: function(f, scope) {
    return $ext.array.map(this.atoms, f, scope);
  },

  /*
   * Slice function for a list of atoms.
   */
  slice: function() {
    return new AtomList(this.molecule, Array.prototype.slice.apply(this.atoms,
        arguments));
  },

  /*
   * Get the selected atoms.
   */
  getSelected: function() {
    return $ext.array.filter(this.atoms, function(atom) {
      return (atom.status & ATOM_STATUSES.selected) > 0;
    });
  },

  /*
   * Get the unparameterised atoms.
   */
  getUnparameterized: function() {
    return $ext.array.filter(this.atoms, function(atom) {
      return !atom.isCharged() && atom.element !== "H";
    });
  },

  /**
   * Get the parameterised atoms.
   */
  getParameterizedIDs: function() {
    return $ext.array.map($ext.array.filter(this.atoms, function(atom) {
      return atom.isCharged() && atom.element !== "H";
    }), function (atom) {
      return atom.id;
    });
  },

  /*
   * Get the AtomList represented at a tree with Atom a as the root.
   * 
   * Only take into account the atoms with aromatic bonds if arom is true.
   */
  getTree: function(a, arom) {
    if(a instanceof Atom) {
      var root = a;
    } else if(a === undefined) {
      var root = this.atoms[0];
    } else {
      var root = this.get(a);
    }

    var tree = new Tree(root.id, root);
    var q = [tree];
    var pq = [];
    while(q.length > 0) {
      var n = q.shift();
      if(pq.indexOf(n.key) === -1) {
        pq.push(n.key);
        $ext.each(n.value.getBondedAtoms(arom), function (atom) {
          if (pq.indexOf(atom.id) === -1) {
            q.push(n.addChild(atom.id, atom));
          }
        });
      }
    }
    return tree;
  },

  /*
   * Get the smallest cycle with Atom a as the root.
   *
   * Only take into account the atoms with aromatic bonds if arom is true.
   */
  getCycle: function(a, arom) {
    if(a instanceof Atom) {
      var root = a;
    } else if(a === undefined) {
      var root = this.atoms[0];
    } else {
      var root = this.get(a);
    }

    var q = [root];
    var pq = [];
    var pred = {};

    while(q.length > 0) {
      var n = q.shift();
      if(pq.indexOf(n.id) === -1) {
        pq.push(n.id);
        var nbrs = n.getBondedAtoms(arom);
        for (i = 0; i < nbrs.length; i++) {
          var nbr = nbrs[i];
          if (pq.indexOf(nbr.id) === -1) {
            q.push(nbr);
            pred[nbr.id] = n.id;
          } else if (pred[n.id] !== nbr.id) {
            var cycle = [];
            var p = n.id;
            while (p !== root.id) {
              cycle.push(this.get(p));
              p = pred[p];
            }
            cycle.push(root);
            cycle = cycle.reverse();
            var p = nbr.id;
            while (p !== root.id) {
              cycle.push(this.get(p));
              p = pred[p];
            }
            return cycle;
          }
        }
      }
    }

    return [];
  },

  /*
   * Get the width of this AtomList.
   */
  getWidth: function() {
    if(this.cache.get('position.width')) {
      return this.cache.get('position.width');
    }
    var lt = this.getLeftTop();
    var rb = this.getRightBottom();
    var width = rb.x - lt.x;
    this.cache.set('position.width', width, [
        this.cache.getCache('position.leftTop'),
        this.cache.getCache('position.rightBottom')]);
    return width;
  },

  /*
   * Get the height of this AtomList.
   */
  getHeight: function() {
    if(this.cache.get('position.height')) {
      return this.cache.get('position.height');
    }
    var lt = this.getLeftTop();
    var rb = this.getRightBottom();
    var height = rb.y - lt.y;
    this.cache.set('position.height', height, [
        this.cache.getCache('position.leftTop'),
        this.cache.getCache('position.rightBottom')]);
    return height;
  },

  /*
   * Get the coordinates of the left top of this AtomList.
   */
  getLeftTop: function() {
    if(this.cache.get('position.leftTop')) {
      return this.cache.get('position.leftTop');
    }
    var lt = {
      x: $ext.array.min(this.map(function(atom) {
        if(!this.settings.atom.showHAtoms && atom.element === "H") {
          return Infinity;
        }
        return atom.x - atom.getRadius();
      }, this)),
      y: $ext.array.min(this.map(function(atom) {
        if(!this.settings.atom.showHAtoms && atom.element === "H") {
          return Infinity;
        }
        return atom.y - atom.getRadius();
      }, this))
    };
    this.cache.set('position.leftTop', lt, this.cache
        .getCache('appearance.radius'));
    return lt;
  },

  /*
   * Get the coordinates of the right bottom of this AtomList.
   */
  getRightBottom: function() {
    if(this.cache.get('position.rightBottom')) {
      return this.cache.get('position.rightBottom');
    }
    var rb = {
      x: $ext.array.max(this.map(function(atom) {
        if(!this.settings.atom.showHAtoms && atom.element === "H") {
          return 0;
        }
        return atom.x + atom.getRadius();
      }, this)),
      y: $ext.array.max(this.map(function(atom) {
        if(!this.settings.atom.showHAtoms && atom.element === "H") {
          return 0;
        }
        return atom.y + atom.getRadius();
      }, this))
    };
    this.cache.set('position.rightBottom', rb, this.cache
        .getCache('appearance.radius'));
    return rb;
  },

  /*
   * Get the size (width, height) of this AtomList.
   */
  getSize: function() {
    if(this.cache.get('position.size')) {
      return this.cache.get('position.size');
    }
    var s = {
      w: this.getWidth(),
      h: this.getHeight()
    };
    this.cache.set('position.size', s, [this.cache.getCache('position.width'),
        this.cache.getCache('position.height')]);
    return s;
  },

  /*
   * Get the coordinates of the center of this AtomList.
   */
  getCenterPoint: function() {
    if(this.cache.get('position.centerPoint')) {
      return this.cache.get('position.centerPoint');
    }
    var lt = this.getLeftTop();
    var s = this.getSize();
    var cp = {
      x: lt.x + s.w / 2,
      y: lt.y + s.h / 2
    };
    this.cache.set('position.centerPoint', cp, [
        this.cache.getCache('position.leftTop'),
        this.cache.getCache('position.size')]);
    return cp;
  },

  /*
   * Get the atom at position (x, y), if any.
   */
  getAtomAt: function(x, y) {
    return this.each(function(atom) {
      if(atom.isVisible() && atom.isTouching(x, y)) {
        return atom;
      }
    });
  },

  /*
   * Get all atoms in a bounding box from (x1, y1) to (x2, y2).
   */
  getAtomsIn: function(x1, y1, x2, y2) {
    var r = new Array();
    this.each(function(atom) {
      if(atom.isVisible() && atom.isInBB(x1, y1, x2, y2)) {
        r.push(atom);
      }
    });
    return r;
  },

  /*
   * Set the atom that is hovered to h. If h is undefined, no atom is hovered.
   * 
   * Returns true if the hover was changed and a redraw is needed.
   */
  setHover: function(h) {
    if(h && !h.isVisible()) {
      if(this.settings.atom.showHAtoms) {
        return;
      } else {
        h = h.getBase();
      }
    }

    var changed = false;

    // Unset hover from the currently hovered atom
    this.each(function(a) {
      if(a.status & ATOM_STATUSES.hover && a !== h) {
        a.dehover();
        changed = true;
        return;
      }
    });

    var c = this.molecule.mv.canvas;
    if(h) {
      if(!(h.status & ATOM_STATUSES.hover)) {
        h.hover();

        // Bring to back of list to be drawn last (on top).
        $ext.array.toBack(this.atoms, this.indexOf(h.id));
        changed = true;
      }
      c.style.cursor = this.settings.cursor.click;
    } else {
      c.style.cursor = this.settings.cursor.drag;
    }

    return changed;
  },

  /*
   * Set the selected atoms to s. If s is undefined, no atom is selected.
   * 
   * Returns true if the selection was changed and a redraw is needed.
   */
  setSelected: function(s) {
    if(!this.settings.atom.showHAtoms) {
      // Make sure only hydrogen bases are selected
      s = $ext.array.flatten($ext.array.map(s, function(atom) {
        return atom.getHydrogenAtoms().concat([atom, atom.getBase()]);
      }));
    }

    var changed = false;
    this.each(function(a) {
      if(a.status & ATOM_STATUSES.selected && s.indexOf(a) === -1) {
        a.deselect();
        changed = true;
        return;
      }
    });

    var c = this.molecule.mv.canvas;
    $ext.each(s, function(atom) {
      if(!(atom.status & ATOM_STATUSES.selected)) {
        atom.select();

        // Bring to back of list to be drawn last (on top).
        $ext.array.toBack(this.atoms, this.indexOf(atom.id));
        c.style.cursor = this.settings.cursor.normal;
        changed = true;
      }
    }, this);

    return changed;
  },

  addSelected: function(s) {
    if(!this.settings.atom.showHAtoms) {
      // Make sure only hydrogen bases are selected
      s = $ext.array.flatten($ext.array.map(s, function(atom) {
        return atom.getHydrogenAtoms().concat([atom, atom.getBase()]);
      }));
      s = $ext.array.unique(s);
    }

    $ext.each(s, function(atom) {
      if(atom.status & ATOM_STATUSES.selected) {
        atom.deselect();
      } else {
        atom.select();
      }
    });
  },

  /*
   * Dehighlight all atoms in this list.
   */
  dehighlight: function(status) {
    this.each(function(atom) {
      if(status) {
        atom.removeHighlight(status);
      } else {
        atom.resetHighlight();
      }
    });
  },

  /*
   * Move all atoms in this list dx in the x direction and dy on the y axis.
   */
  move: function(dx, dy) {
    this.each(function(a) {
      a.move(dx, dy);
    });
  },

  /*
   * Scale the atoms with a factor f.
   */
  scale: function(f) {
    this.each(function(a) {
      var dx = a.x * f - a.x;
      var dy = a.y * f - a.y;
      if (isNaN(dx) || isNaN(dy)) {
        throw "Moving to nowhere.";
      } else {
        a.move(dx, dy);
      }
    });

    this.molecule.mv.deoverlap();
  },

  /*
   * Center the list of atoms.
   */
  center: function() {
    var mc = this.getCenterPoint();
    this.centerOn(mc.x, mc.y);
  },

  /*
   * Center the list of atoms on the given (x, y) position.
   */
  centerOn: function(x, y) {
    var cc = $ext.context.centerPoint(this.molecule.mv.ctx);
    var dx = cc.x - x;
    var dy = cc.y - y;
    this.move(dx, dy);
  },

  /*
   * Center the list of atoms on the position of the given atom.
   */
  centerOnAtom: function(atom) {
    this.centerOn(atom.x, atom.y);
  },

  /*
   * Center the list of atoms on the center of the list of atoms provided.
   */
  centerOnAtoms: function(atoms) {
    if(!(atoms instanceof AtomList)) {
      atoms = new AtomList(this.molecule, atoms);
    }
    atoms.atoms = $ext.array.filter(atoms.atoms, function(atom) {
      return this.settings.showHAtoms || atom.element !== "H";
    }, this);
    var lc = atoms.getCenterPoint();
    this.centerOn(lc.x, lc.y);
  },

  /*
   * Zoom on the center of the molecule with a factor f.
   */
  zoom: function(f) {
    var c = this.getCenterPoint();
    this.zoomOn(c.x, c.y, f);
  },

  /*
   * Zoom on a specific point (x, y) with a factor f.
   */
  zoomOn: function(x, y, f) {
    this.move(-x, -y);
    this.scale(f);
    this.move(x, y);
  },

  /*
   * Fit the molecule in a box of size w * h and center it there.
   */
  bestFit: function(w, h) {
    var wf = w / this.getWidth();
    var hf = h / this.getHeight();
    var f = wf < hf ? wf : hf;
    this.scale(f);

    var tx = w / 2 - this.getWidth() / 2;
    var ty = h / 2 - this.getHeight() / 2;
    var lt = this.getLeftTop();
    var dx = tx - lt.x;
    var dy = ty - lt.y;
    this.move(dx, dy);
  },

  clearCache: function(name) {
    this.cache.clear(name);
    this.molecule.clearCache(name);
  },

  /*
   * Find all occurences of a given sequence in this list.
   */
  findSequences: function(seq) {
    var seqs = new Array();
    this.each(function(atom) {
      var t = this.getTree(atom);
      seqs = seqs.concat(t.findSequences($ext.copy(seq), function(a) {
        return a.element;
      }));
    }, this);
    return seqs;
  },

  /*
   * Find all occurences of a given AtomList in this list.
   */
  findOccurrences: function(list) {
    var seq = $ext.array.map(list.getTree().toArray(), function(atom) {
      return atom.element;
    }, null, true);
    return this.findSequences(seq);
  },

  /*
   * Draw all atoms in this list.
   */
  draw: function() {
    this.each(function(a) {
      a.draw();
    });
  }
};
