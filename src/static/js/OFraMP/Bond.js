/**
 * Data structure for a bond
 */
function Bond(list, a1, a2, type) {
  this.list = list;
  this.a1 = a1;
  this.a2 = a2;
  this.type = type;
  if(!a1.show || !a2.show)
    this.show = false;
  else
    this.show = true;
}

Bond.prototype.coords = function() {
  var s = this.list.molecule.mv.settings;

  // Leave some space around the atom
  var dx = this.a1.dx(this.a2);
  var dy = this.a1.dy(this.a2);
  var dist = this.a1.distance(this.a2);

  var ar1 = this.a1.radius();
  var ddx1 = dx * ar1 / dist;
  var ddy1 = dy * ar1 / dist;

  var ar2 = this.a2.radius();
  var ddx2 = dx * ar2 / dist;
  var ddy2 = dy * ar2 / dist;

  return {
    x1: this.a1.x + ddx1,
    y1: this.a1.y + ddy1,
    x2: this.a2.x - ddx2,
    y2: this.a2.y - ddy2
  };
};

Bond.prototype.length = function() {
  this.coords().extract(window);
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

Bond.prototype.inBB = function(x, y) {
  return x.between(this.a1.x, this.a2.x) && y.between(this.a1.y, this.a2.y);
};

Bond.prototype.touches = function(x, y) {
  if(!this.inBB(x, y))
    return false;

  this.coords().extract(window);
  var br = Math.abs(x1 - x2) / Math.abs(y1 - y2);
  var tr = Math.abs(x1 - x) / Math.abs(y1 - y);
  return br.approx(tr);
};

// With help from:
// http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
Bond.prototype.intersection = function(b) {
  if(this.length() < 10)
    return;

  var c = this.coords();
  var d = b.coords();
  var p = {
    x: c.x1,
    y: c.y1
  };
  var q = {
    x: d.x1,
    y: d.y1
  };
  var r = {
    x: c.x2 - c.x1,
    y: c.y2 - c.y1
  };
  var s = {
    x: d.x2 - d.x1,
    y: d.y2 - d.y1
  };
  var t = ((q.x - p.x) * s.y - (q.y - p.y) * s.x) / (r.x * s.y - r.y * s.x);
  var u = ((q.x - p.x) * r.y - (q.y - p.y) * r.x) / (r.x * s.y - r.y * s.x);
  if(t > 0 && t < 1 && u > 0 && u < 1) {
    return {
      x: p.x + t * r.x,
      y: p.y + t * r.y
    };
  }
};

Bond.prototype.draw = function() {
  this.drawConnectors();
  var a1 = this.a1;
  var a2 = this.a2;
  if(!this.show || a1.distance(a2) < a1.radius() + a2.radius())
    return;

  var ctx = this.list.molecule.mv.ctx;
  var s = this.list.molecule.mv.settings;
  this.coords().extract(window);

  ctx.lineWidth = s.bond_width;
  ctx.strokeStyle = s.bond_color;

  if(this.type == 1 || this.type == 3) {
    ctx.drawLine(x1, y1, x2, y2);
  }

  if(false) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect((x1 + x2) / 2 - 8, (y1 + y2) / 2 - 8, 16, 16);
    ctx.fillStyle = "#000000";
    ctx.fillText(this.list.bonds.indexOf(this), (x1 + x2) / 2, (y1 + y2) / 2);
    ctx.strokeStyle = s.bond_color;
  }

  // Draw double/triple/aromatic bonds
  if(this.type > 1) {
    dx = x2 - x1;
    dy = y2 - y1;
    dist = Math.sqrt(dx * dx + dy * dy);

    ddx = dy * s.bond_spacing / dist;
    ddy = dx * s.bond_spacing / dist;

    if(this.type == 4) {
      var cycle = this.a2.findCycle();
      var center = new AtomList(null, cycle).centerPoint();
      var cdx1 = center.x - (x1 + ddx);
      var cdy1 = center.y - (y1 - ddy);
      var cdx2 = center.x - (x1 - ddx);
      var cdy2 = center.y - (y1 + ddy);
      var cdist1 = Math.sqrt(cdx1 * cdx1 + cdy1 * cdy1);
      var cdist2 = Math.sqrt(cdx2 * cdx2 + cdy2 * cdy2);

      if(cdist1 > cdist2) {
        ctx.drawLine(x1 + ddx, y1 - ddy, x2 + ddx, y2 - ddy);
        ctx.drawDashedLine(x1 - ddx, y1 + ddy, x2 - ddx, y2 + ddy,
            s.bond_dash_count);
      } else {
        ctx.drawLine(x1 - ddx, y1 + ddy, x2 - ddx, y2 + ddy);
        ctx.drawDashedLine(x1 + ddx, y1 - ddy, x2 + ddx, y2 - ddy,
            s.bond_dash_count);
      }
    } else {
      ctx.drawLine(x1 + ddx, y1 - ddy, x2 + ddx, y2 - ddy);
      ctx.drawLine(x1 - ddx, y1 + ddy, x2 - ddx, y2 + ddy);
    }
  }
};

Bond.prototype.drawAtomConnector = function(a) {
  var ep = {
    x: a.x + a.radius(),
    y: a.y
  };

  var c = this.coords();
  if(this.a1 === a) {
    var sp = {
      x: c.x1,
      y: c.y1
    }
  } else {
    var sp = {
      x: c.x2,
      y: c.y2
    }
  }

  var d = Math.sqrt(Math.pow(ep.x - sp.x, 2) + Math.pow(ep.y - sp.y, 2));
  var r2 = Math.pow(a.radius(), 2);
  var alpha = Math.acos((2 * r2 - Math.pow(d, 2)) / (2 * r2));
  if(sp.y < a.y) {
    alpha = -alpha;
  }

  var ctx = this.list.molecule.mv.ctx;
  var s = this.list.molecule.mv.settings;
  ctx.lineWidth = s.bond_connector_width;
  ctx.strokeStyle = s.bond_connector_color;
  var delta = s.bond_connector_width / a.radius() / 2;

  if(this.type == 1 || this.type == 3) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius(), alpha - delta, alpha + delta);
    ctx.stroke();
  }

  // For double/triple/aromatic bonds
  if(this.type > 1) {
    var beta = Math.acos((2 * r2 - Math.pow(s.bond_spacing, 2)) / (2 * r2));

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius(), alpha + beta - delta, alpha + beta + delta);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius(), alpha - beta - delta, alpha - beta + delta);
    ctx.stroke();
  }
};

Bond.prototype.drawConnectors = function() {
  if(!this.show)
    return;

  this.drawAtomConnector(this.a1);
  this.drawAtomConnector(this.a2);
};