/**
 * Data structure for an atom
 */
function Atom(list, id, element, elementID, iacm, x, y, x3d, y3d, z3d, charge, previewCharge,
    usedFragments, status, radius) {
  this.__init(list, id, element, elementID, iacm, x, y, x3d, y3d, z3d, charge, previewCharge,
      usedFragments, status, radius);
}

Atom.prototype = {
  list: undefined,
  settings: undefined,
  cache: undefined,

  id: undefined,
  element: undefined,
  elementID: undefined,
  iacm: undefined,
  x: undefined,
  y: undefined,
  charge: undefined,
  previewCharge: undefined,
  usedFragments: undefined,
  status: undefined,
  radius: undefined,

  __init: function(list, id, element, elementID, iacm, x, y, x3d, y3d, z3d, charge,
      previewCharge, usedFragments, status, radius) {
    this.list = list;
    this.settings = list.settings;
    this.cache = new Cache();

    this.id = id;
    this.element = element;
    this.elementID = elementID;
    this.iacm = iacm;
    this.x = x;
    this.y = y;
    this.x3d = x3d;
    this.y3d = y3d;
    this.z3d = z3d;
    this.charge = charge;
    this.previewCharge = previewCharge;
    this.usedFragments = usedFragments || new Array();
    this.status = status || ATOM_STATUSES.todo;
    this.radius = radius;
  },

  /*
   * Convert the basic data of this Atom to JSON.
   */
  getSimpleJSON: function() {
    return {
      id: this.id,
      type: this.iacm,
      x: this.x,
      y: this.y,
      x3d: this.x3d,
      y3d: this.y3d,
      z3d: this.z3d
    };
  },

  /*
   * Get all data of this Atom as a JSON object.
   */
  getJSON: function() {
    return {
      id: this.id,
      element: this.element,
      elementID: this.elementID,
      iacm: this.iacm,
      x: this.x,
      y: this.y,
      x3d: this.x3d,
      y3d: this.y3d,
      z3d: this.z3d,
      charge: this.charge,
      previewCharge: this.previewCharge,
      usedFragments: this.usedFragments,
      status: this.status
    };
  },

  getLGF: function() {
    var charge = this.charge || 0.;
    // partial_charge label label2 atomType X Y Z initColor
    // Note: X Y Z unknown -> can be 0, initColor unknown -> can be equal to ID
    return $ext.number.format(charge, 1, 3, 0) + "\t" + this.id + "\t"
        + this.elementID + "\t" + this.iacm + "\t" + this.x3d + "\t" + this.y3d + "\t" + this.z3d + "\t"
        + this.id + "\t" + "\n";
  },

  get_name_and_charge: function() {
    return [this.elementID, this.charge];
  },

  /*
   * Get the base of a hydrogen atom.
   * 
   * Returns the atom itself if it is not a hydrogen atom.
   */
  getBase: function() {
    if(this.element === "H") {
      return this.getBondedAtoms()[0];
    }

    return this;
  },

  /*
   * Determine if this atom is currently visible.
   */
  isVisible: function() {
    if(this.cache.get('position.visible')) {
      return this.cache.get('position.visible');
    }

    var c = this.list.molecule.mv.canvas;
    var visible = ((this.settings.atom.showHAtoms || this.element != "H")
        && this.x + this.getRadius() > 0 && this.x - this.getRadius() < c.width
        && this.y + this.getRadius() > 0 && this.y - this.getRadius() < c.height);

    this.cache.set('position.visible', visible, this.cache
        .getCache('appearance.visible'));
    return visible;
  },

  /*
   * Get this atom's label.
   */
  getLabel: function(withHs) {
    var label = this.element;
    if(withHs
        || (this.settings.atom.combineHLabels === true && this.settings.atom.showHAtoms !== true)) {
      var hs = $ext.array.filter(this.getBondedAtoms(), function(atom) {
        return atom.element === "H";
      });

      if(hs.length > 0) {
        label += "H";
        if(hs.length > 1) {
          label += String.fromCharCode(8320 + hs.length);
        }
      }
    }
    return label;
  },

  /*
   * Determine if this atom's label should be shown.
   */
  isShowingLabel: function() {
    if(this.cache.get('appearance.showLabel')) {
      return this.cache.get('appearance.showLabel');
    }

    var show = (this.settings.atom.showCLabels || this.element != "C");

    this.cache.set('appearance.showLabel', show);
    return show;
  },

  /*
   * Determine if this atom lies within the bounding box from (x1, y1) to (x2,
   * y2).
   */
  isInBB: function(x1, y1, x2, y2) {
    return $ext.number.between(this.x, x1, x2)
        && $ext.number.between(this.y, y1, y2);
  },

  /*
   * Determine if this atom is bonded with another atom 'other'.
   */
  isBondedWith: function(other) {
    return this.getBondedAtoms().indexOf(other) !== -1;
  },

  /*
   * Get all bonds that are connected to this atom, or just the aromatic ones
   * when arom is set to true.
   */
  getBonds: function(arom) {
    if(arom && this.cache.get('structure.aromBonds')) {
      return this.cache.get('structure.aromBonds');
    } else if(!arom && this.cache.get('structure.bonds')) {
      return this.cache.get('structure.bonds');
    }

    var bonds = Array();
    this.list.molecule.bonds.each(function(bond) {
      if((this === bond.a1 || this === bond.a2) && (!arom || bond.type == 5)) {
        bonds.push(bond);
      }
    }, this);

    if(arom) {
      this.cache.set('structure.aromBonds', bonds);
    } else {
      this.cache.set('structure.bonds', bonds);
    }
    return bonds;
  },

  /*
   * Get the atoms with which this atom is bonded, or just those with which this
   * atom has an aromatic bond when arom is set to true.
   */
  getBondedAtoms: function(arom) {
    if(arom && this.cache.get('structure.aromAtoms')) {
      return this.cache.get('structure.aromAtoms');
    } else if(!arom && this.cache.get('structure.atoms')) {
      return this.cache.get('structure.atoms');
    }

    var bondedAtoms = $ext.array.map(this.getBonds(arom), function(b) {
      return b.a1 === this ? b.a2 : b.a1;
    }, this);

    if(arom) {
      this.cache.set('structure.aromAtoms', bondedAtoms);
    } else {
      this.cache.set('structure.atoms', bondedAtoms);
    }
    return bondedAtoms;
  },

  /*
   * Get the hydrogen atoms bonded with this atom.
   */
  getHydrogenAtoms: function() {
    return $ext.array.filter(this.getBondedAtoms(), function(atom) {
      return atom.element === "H";
    });
  },

  /*
   * Get the number of bonds this atom has, or just the aromatic ones.
   */
  getBondCount: function(arom) {
    if(arom && this.cache.get('structure.aromBondCount')) {
      return this.cache.get('structure.aromBondCount');
    } else if(!arom && this.cache.get('structure.bondCount')) {
      return this.cache.get('structure.bondCount');
    }

    var bondCount = this.getBonds(arom).length;
    if(arom) {
      this.cache.get('structure.aromBondCount', bondCount);
    } else {
      this.cache.get('structure.bondCount', bondCount);
    }
    return bondCount;
  },

  /*
   * Get the radius of this atom.
   */
  getRadius: function() {
    if(typeof this.radius !== "undefined"){
      return this.radius;
    };

    if(this.cache.get('appearance.radius')) {
      return this.cache.get('appearance.radius');
    }

    if(this.isCharged()) {
      var radius = this.settings.atom.radius.charged;
    } else {
      var radius = this.settings.atom.radius.standard;
    }
    this.cache.set('appearance.radius', radius, this.cache
        .getCache('appearance.showLabel'));
    return radius;
  },

  /*
   * Get the x distance of this atom to another atom a.
   */
  dx: function(a) {
    return a.x - this.x;
  },

  /*
   * Get the y distance of this atom to another atom a.
   */
  dy: function(a) {
    return a.y - this.y;
  },

  /*
   * Get the distance of this atom to another atom a.
   */
  getDistanceTo: function(a) {
    return Math.sqrt(Math.pow(this.dx(a), 2) + Math.pow(this.dy(a), 2));
  },

  /*
   * Get the distance of this atom to another atom a, from the edges of their
   * radiuses.
   */
  getRadiusDistanceTo: function(a) {
    return this.getDistanceTo(a) - this.getRadius() - a.getRadius();
  },

  /*
   * Get the anchor of this atom on a bond b, i.e. the closest point on the bond
   * from which a perpendicular line to the atom can be drawn.
   */
  getBondAnchor: function(bond) {
    if(bond.a1 === this || bond.a2 === this) {
      return;
    }

    var a = this.getDistanceTo(bond.a2);
    var b = this.getDistanceTo(bond.a1);
    var c = bond.a1.getDistanceTo(bond.a2);
    var cosp = (b * b + c * c - a * a) / (2 * b * c);
    var p = Math.acos(cosp);
    var d = Math.sin(p) * b;
    var c1 = cosp * b;
    var dx = bond.a1.dx(bond.a2) * c1 / c;
    var dy = bond.a1.dy(bond.a2) * c1 / c;
    var x = bond.a1.x + dx;
    var y = bond.a1.y + dy;
    if(bond.isTouching(x, y)) {
      return {
        x: x,
        y: y
      };
    }
  },

  /*
   * Get the perpendicular distance from this atom to a bond.
   * 
   * Returns Infinity if this atom has no bond anchor on that bond.
   */
  getDistanceToBond: function(bond) {
    var a = this.getBondAnchor(bond);
    if(!a) {
      return Infinity;
    }

    var dx = this.x - a.x;
    var dy = this.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /*
   * Returns whether the charge of this atom is set or not.
   */
  isCharged: function() {
    return this.charge !== undefined;
  },

  /*
   * Set the charge of this atom to the given value.
   */
  setCharge: function(charge, fragment) {
    this.charge = charge;
    if(fragment) {
      this.usedFragments.push(fragment);
    }
  },

  /*
   * Determine if a point (x, y) is within this atom's radius.
   */
  isTouching: function(x, y) {
    var dx = this.x - x;
    var dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= this.getRadius();
  },

  /*
   * Get the color of this atom.
   */
  getColor: function() {
    if(this.isCharged()) {
      var color = this.settings.atom.color.charged;
    } else {
      var color = this.settings.atom.color.standard;
    }

    if($ext.color.isDark(this.getBackgroundColor())) {
      return $ext.color.invert(color);
    } else {
      return color;
    }
  },

  getBackgroundColor: function() {
    var status = $ext.number.msb(this.getStatus());
    if(status === ATOM_STATUSES.conflict) {
      return this.settings.atom.backgroundColor["conflict"];
    } else if(status === ATOM_STATUSES.preview) {
      return this.settings.atom.backgroundColor["preview"];
    } else if(status === ATOM_STATUSES.selected) {
      return this.settings.atom.backgroundColor["selected"];
    } else if(status === ATOM_STATUSES.hover) {
      return this.settings.atom.backgroundColor["hover"];
    } else if(this.isCharged()) {
      return this.settings.atom.backgroundColor["charged"];
    } else if(status === ATOM_STATUSES.missing) {
      return this.settings.atom.backgroundColor["missing"];
    } else {
      return this.settings.atom.backgroundColor["standard"];
    }
  },

  /*
   * Get the status of this atom.
   */
  getStatus: function() {
    if(!this.settings.atom.showHAtoms && this.element === "H") {
      return this.getBase().getStatus();
    }

    return this.status;
  },

  /*
   * Get the displayed charge label for this atom.
   */
  getChargeLabel: function() {
    var charge = this.getCharge();
    var previewCharge = this.getPreviewCharge();
    if(previewCharge !== undefined && this.isCharged()) {
      charge = (previewCharge + charge) / 2;
    } else if(previewCharge !== undefined) {
      charge = previewCharge;
    }
    return $ext.number.format(charge, 1, 3, 9);
  },

  /*
   * Get the total charge of this atom.
   */
  getCharge: function() {
    var charge = this.charge;
    if(!this.settings.atom.showHAtoms) {
      $ext.each(this.getHydrogenAtoms(), function(atom) {
        if(!charge) {
          charge = 0;
        }
        charge += atom.charge;
      });
    }
    return charge;
  },

  /*
   * Get the total preview charge of this atom.
   */
  getPreviewCharge: function() {
    var charge = this.previewCharge;
    if(charge !== undefined && !this.settings.atom.showHAtoms) {
      $ext.each(this.getHydrogenAtoms(), function(atom) {
        charge += atom.previewCharge;
      });
    }
    return charge;
  },

  /*
   * Move this atom dx in the x direction and dy on the y axis.
   */
  move: function(dx, dy) {
    if(isNaN(dx) || isNaN(dy)) {
      throw "Moving to nowhere.";
    }

    this.x += dx;
    this.y += dy;

    this.clearCache('position');
    $ext.each(this.getBonds(), function(bond) {
      bond.clearCache('position');
    });
    return this;
  },

  /*
   * Rotate this atom around the point (x, y) by a given angle alpha in radians.
   */
  rotateAround: function(x, y, alpha) {
    var dx = this.x - x;
    var dy = this.y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if($ext.number.approx(dist, 0)) {
      return;
    }

    var v1 = (Math.cos(alpha) * dx + Math.sin(alpha) * dy) / dist;
    var v2 = (Math.cos(alpha) * dy - Math.sin(alpha) * dx) / dist;

    var tx = x + dist * v1;
    var ty = y + dist * v2;
    var ddx = tx - this.x;
    var ddy = ty - this.y;
    this.move(ddx, ddy);
  },

  /*
   * Set the highlight for this atom.
   */
  setHighlight: function(highlight) {
    this.status = highlight;
  },

  addHighlight: function(highlight) {
    this.status |= highlight;
  },

  removeHighlight: function(highlight) {
    this.status &= ~highlight;
  },

  resetHighlight: function() {
    this.setHighlight(ATOM_STATUSES.todo);
  },

  /*
   * Hover this atom.
   */
  hover: function() {
    this.addHighlight(ATOM_STATUSES.hover);
  },

  /*
   * Remove hover from this atom.
   */
  dehover: function() {
    this.removeHighlight(ATOM_STATUSES.hover);
  },

  /*
   * Select this atom.
   */
  select: function() {
    this.addHighlight(ATOM_STATUSES.selected);
  },

  /*
   * Deselect this atom.
   */
  deselect: function() {
    this.removeHighlight(ATOM_STATUSES.selected);
  },

  /*
   * Find the cycle this atom is a part of (if any).
   * 
   * If arom is set to true, only aromatic cycles will be considered.
   */
  getCycle: function(arom) {
    if(arom && this.cache.get('structure.aromCycle')) {
      return this.cache.get('structure.aromCycle');
    } else if(!arom && this.cache.get('structure.cycle')) {
      return this.cache.get('structure.cycle');
    }

    var path = this.list.getCycle(this, arom);
    if(path && path.length > 1) {
      if(arom) {
        this.cache.set('structure.aromCycle', path);
      } else {
        this.cache.set('structure.cycle', path);
      }
      return path;
    }
  },

  /*
   * Clear the given cache of this atom and its parent.
   */
  clearCache: function(name) {
    this.cache.clear(name);
    this.list.clearCache(name);
  },

  /*
   * Draw this atom.
   */
  draw: function() {
    if(!this.isVisible()) {
      return;
    }

    var ctx = this.list.molecule.mv.ctx;
    var s = this.settings;

    ctx.fillStyle = this.getBackgroundColor();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.getRadius(), 0, 2 * Math.PI);
    ctx.fill();

    if(!this.isShowingLabel()) {
      return;
    }

    if(s.atom.showCirc) {
      if(this.status > 1) {
        ctx.lineWidth = s.atom.borderWidth.active;
        ctx.strokeStyle = s.atom.borderColor.active;
      } else {
        ctx.lineWidth = s.atom.borderWidth.standard;
        ctx.strokeStyle = s.atom.borderColor.standard;
      }
      ctx.stroke();
    }

    var label = this.getLabel();
    if(s.atom.showID) {
      label += this.id;
    }

    ctx.font = s.atom.elementFont;
    ctx.fillStyle = this.getColor();
    var cl = this.getChargeLabel();
    if(cl) {
      ctx.fillText(label, this.x, this.y - s.atom.chargeOffset);
      ctx.font = s.atom.chargeFont;
      ctx.fillText(cl, this.x, this.y + s.atom.chargeOffset);
    } else {
      ctx.fillText(label, this.x, this.y);
    }
  }
};
