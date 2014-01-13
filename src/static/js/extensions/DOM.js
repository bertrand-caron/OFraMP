$ext.extend($ext, {
  dom: {
    /*
     * Remove an element from the DOM.
     */
    remove: function(elem) {
      return elem.parentNode.removeChild(elem);
    },

    /*
     * Remove all child elements from the given elem.
     */
    clear: function(elem) {
      // Make a copy of the children to not mess with the foreach loop.
      var children = $ext.copy(elem.children);
      $ext.each(children, function(child) {
        if(child instanceof Element) {
          elem.removeChild(child);
        }
      });
      elem.textContent = "";
    },

    addTableRow: function(table, label, value) {
      var row = document.createElement('tr');

      var head = document.createElement('th');
      if(!(label instanceof Element)) {
        label = document.createTextNode(label);
      }
      head.appendChild(label);

      var data = document.createElement('td');
      if(!(value instanceof Element)) {
        value = document.createTextNode(value);
      }
      data.appendChild(value);

      row.appendChild(head);
      row.appendChild(data);
      table.appendChild(row);
    },

    addSelectOption: function(select, value, label, selected) {
      var option = document.createElement('option');
      option.value = value;
      if(label) {
        option.appendChild(document.createTextNode(label));
      } else {
        option.appendChild(document.createTextNode(value));
      }
      if(selected) {
        option.selected = "selected";
      }
      select.appendChild(option);
    },

    /*
     * Custom mouse events.
     */
    mouseDragEndEvent: new Event('mousedragend'),
    mouseWheelEndEvent: new Event('mousewheelend'),

    /*
     * Fairly cross-browser function for adding an eventListener to an element.
     */
    addEventListener: function(elem, type, callback, useCapture) {
      elem = elem || window;
      useCapture = useCapture || false;

      if(elem.addEventListener) {
        return elem.addEventListener(type, callback, useCapture);
      } else {
        return elem.attachEvent("on" + type, callback, useCapture);
      }
    },

    /*
     * Fairly cross-browser function for removing an eventListener from an
     * element.
     */
    removeEventListener: function(elem, type, callback, useCapture) {
      elem = elem || window;
      useCapture = useCapture || false;

      if(elem.removeEventListener) {
        return elem.removeEventListener(type, callback, useCapture);
      } else {
        return elem.detachEvent("on" + type, callback, useCapture);
      }
    },

    /*
     * Get an Event represented as an Object (fix for IE <= 8 where this
     * strangely isn't the case and Firefox where event objects are immutable).
     */
    eventObject: function(evt) {
      if(evt instanceof Object && !$ext.onFirefox()) {
        return evt;
      }

      var r = new Object();
      for(k in evt) {
        r[k] = evt[k];
      }
      return r;
    },

    /*
     * Get the name the user's browser uses for the wheel event.
     */
    wheelEventName: (function() {
      if("onwheel" in document.createElement("div")) {
        return "wheel";
      } else if(document.onmousewheel !== undefined) {
        return "mousewheel";
      } else {
        return "DOMMouseScroll";
      }
    })(),

    /*
     * Bind a callback to the wheel event on a given element.
     * 
     * Based on the implementation from:
     * https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel
     */
    onMouseWheel: function(elem, callback, useCapture) {
      _onWheel(elem, this.wheelEventName, callback, useCapture);
      if(this.wheelEventName === "DOMMouseScroll") {
        _onWheel(elem, "MozMousePixelScroll", callback, useCapture);
      }

      function _onWheel(elem, wf, callback, useCapture) {
        if(wf === "wheel") {
          $ext.dom.addEventListener(elem, wf, callback, useCapture);
        } else {
          $ext.dom.addEventListener(elem, wf, function(originalEvent) {
            if(!originalEvent) {
              originalEvent = window.event;
            }

            // create a normalized event object
            var event = {
              // keep a ref to the original event object
              originalEvent: originalEvent,
              target: originalEvent.target || originalEvent.srcElement,
              type: "wheel",
              canBubble: originalEvent.canBubble,
              cancelable: originalEvent.cancelable,
              view: originalEvent.view,
              detail: originalEvent.detail,
              currentTarget: originalEvent.currentTarget,
              relatedTarget: originalEvent.relatedTarget,
              screenX: originalEvent.screenX || 0,
              screenY: originalEvent.screenY || 0,
              clientX: originalEvent.clientX || 0,
              clientY: originalEvent.clientY || 0,
              button: $ext.dom.getMouseButton(originalEvent),
              buttons: originalEvent.buttons,
              deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
              deltaX: 0,
              deltaY: 0,
              deltaZ: 0,
              preventDefault: function() {
                originalEvent.preventDefault ? originalEvent.preventDefault()
                    : originalEvent.returnValue = false;
              }
            };

            // calculate deltaY (and deltaX) according to the event
            if(wf === "mousewheel" || wf === "onmousewheel") {
              event.deltaY = -1 / 40 * originalEvent.wheelDelta;
              // Webkit also supports wheelDeltaX
              if(originalEvent.wheelDeltaX) {
                event.deltaX = -1 / 40 * originalEvent.wheelDeltaX;
              }
            } else {
              event.deltaY = originalEvent.detail;
            }

            // it's time to fire the callback
            return callback(event);
          }, useCapture);
        }
      }
    },

    // Minimal distance a mouse should move before a click becomes a drag.
    MOUSE_DRAG_EPSILON: 2,


    getMouseButton: function(evt) {
      if(!$ext.onBrokenIE() && !$ext.onFirefox()) {
        return evt.button;
      } else {
        if($ext.onFirefox()) {
          var button = evt.buttons;
        } else {
          var button = evt.button;
        }

        if(button & 1) {
          return 0;
        } else if(button & 2) {
          return 2;
        } else if(button & 4) {
          return 1;
        } else {
          return 0;
        }
      }
    },

    /*
     * Attach a callback to the mouseover event on a given elem.
     */
    onMouseOver: function(elem, callback, useCapture) {
      this.addEventListener(elem, "mouseover", function(evt) {
        evt = $ext.dom.eventObject(evt);
        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    /*
     * Attach a callback to the mouseout event on a given elem.
     */
    onMouseOut: function(elem, callback, useCapture) {
      this.addEventListener(elem, "mouseout", function(evt) {
        evt = $ext.dom.eventObject(evt);
        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    /*
     * Attach a callback to the mousedown event on a given elem.
     */
    onMouseDown: function(elem, callback, button, useCapture) {
      this.addEventListener(elem, "mousedown", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(button !== undefined && evt.button !== button) {
          return;
        }

        window.__mouseDown = true;
        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    /*
     * Attach a callback to the mouseup event on a given elem.
     */
    onMouseUp: function(elem, callback, button, useCapture) {
      this.addEventListener(elem, "mouseup", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(button !== undefined && evt.button !== button) {
          return;
        }

        window.__mouseDown = null;
        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    /*
     * Attach a callback to the mousemove event on a given elem.
     * 
     * Note that, in this implementation, this event will only be fired when the
     * mouse is moved but NOT down, i.e. the user is not dragging.
     */
    onMouseMove: function(elem, callback, button, useCapture) {
      this.onMouseDown(elem, null, button);
      this.onMouseUp(elem, null, button);
      this.addEventListener(elem, "mousemove", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(window.__mouseDown === true || button !== undefined
            && evt.button !== button) {
          return;
        }

        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    /*
     * Attach a callback to the mouseclick event on a given elem.
     * 
     * Note that, in this implementation, this event will only be fired when the
     * mouse is not moved more than MOUSE_DRAG_EPSILON, i.e. only when the user
     * is not dragging.
     */
    onMouseClick: function(elem, callback, button, useCapture) {
      this.onMouseDown(elem, function(evt) {
        window.__lastDownPos = {
          clientX: evt.clientX,
          clientY: evt.clientY
        };
      }, button, useCapture);

      this.onMouseUp(elem, function(evt) {
        var dp = window.__lastDownPos;
        if(!dp) {
          return;
        }

        var delta = Math.sqrt(Math.pow(dp.clientX - evt.clientX, 2)
            + Math.pow(dp.clientY - evt.clientY, 2));
        if(dp && delta < $ext.dom.MOUSE_DRAG_EPSILON) {
          return callback(evt);
        }
        window.__lastDownPos = null;
      }, button, useCapture);
    },

    /*
     * Attach a callback for when the mouse is dragged on a given elem.
     * 
     * Note the difference between this event and the regular onDrag event.
     */
    onMouseDrag: function(elem, callback, button, useCapture) {
      this.onMouseDown(elem, _onMouseDown, button, useCapture);
      this.onMouseUp(window, function(evt) {
        if(window.__mouseDragged !== true) {
          return;
        }

        window.__lastDragPos = null;
        window.__mouseDragged = null;
        $ext.dom.removeEventListener(window, "mousemove", _onMouseMove);

        var mdee = $ext.dom.mouseDragEndEvent;
        mdee.button = evt.button;
        elem.dispatchEvent(mdee);
      }, button, useCapture);

      this.addEventListener(elem, "mousemove", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(button !== undefined && evt.button !== button
            || window.__mouseDragged !== true || window.__mouseDown !== true) {
          return;
        }

        if(window.__lastDragPos) {
          var delta = {
            deltaX: evt.clientX - window.__lastDragPos.clientX,
            deltaY: evt.clientY - window.__lastDragPos.clientY
          };
        } else {
          var delta = {
            deltaX: evt.clientX - window.__lastDownPos.clientX,
            deltaY: evt.clientY - window.__lastDownPos.clientY
          };
        }
        $ext.merge(delta, {
          type: "mousedrag"
        });

        window.__lastDragPos = {
          clientX: evt.clientX,
          clientY: evt.clientY
        };

        if(callback instanceof Function) {
          return callback($ext.merge(evt, delta, true));
        }
      }, useCapture);

      function _onMouseDown(evt) {
        window.__mouseDown = true;
        window.__mouseDragged = false;
        window.__lastDownPos = {
          clientX: evt.clientX,
          clientY: evt.clientY
        };

        $ext.dom.addEventListener(elem, "mousemove", _onMouseMove, useCapture);
      }

      function _onMouseMove(evt) {
        var dp = window.__lastDownPos;
        if(!dp) {
          $ext.dom.removeEventListener(elem, "mousemove", _onMouseMove,
              useCapture);
          return;
        }

        var delta = Math.sqrt(Math.pow(dp.clientX - evt.clientX, 2)
            + Math.pow(dp.clientY - evt.clientY, 2));
        if(delta > $ext.dom.MOUSE_DRAG_EPSILON) {
          window.__mouseDragged = true;
          $ext.dom.removeEventListener(elem, "mousemove", _onMouseMove,
              useCapture);
        }
      }
    },

    onMouseDragEnd: function(elem, callback, button, useCapture) {
      this.addEventListener(elem, "mousedragend", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(button !== undefined && evt.button !== button) {
          return;
        }

        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    onContextMenu: function(elem, callback, button, useCapture) {
      this.addEventListener(elem, "contextmenu", function(evt) {
        evt = $ext.dom.eventObject(evt);
        evt.button = $ext.dom.getMouseButton(evt);
        if(button !== undefined && evt.button !== button) {
          return;
        }

        if(callback instanceof Function) {
          return callback(evt);
        }
      }, useCapture);
    },

    onScroll: function(elem, callback, useCapture) {
      this.addEventListener(elem, "scroll", callback, useCapture);
    }
  }
});
