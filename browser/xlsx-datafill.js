(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _2 = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var defaultOpts = {
  templateRegExp: /\{\{([^}]*)\}\}/,
  fieldSplitter: "|",
  joinText: ",",
  mergeCells: true,
  followFormulae: false,
  copyStyle: true,
  callbacksMap: {
    '': function _(data) {
      return _2.keys(data);
    },
    $: function $(data) {
      return _2.values(data);
    }
  }
};
var refRegExp = /('?([^!]*)?'?!)?([A-Z]+\d+)(:([A-Z]+\d+))?/;
/**
 * Data fill engine, taking an instance of Excel sheet accessor and a JSON object as data, and filling the values from the latter into the former.
 */

var XlsxDataFill = /*#__PURE__*/function () {
  /**
   * Constructs a new instance of XlsxDataFill with given options.
   * @param {object} accessor An instance of XLSX spreadsheet accessing class.
   * @param {{}} opts Options to be used during processing.
   * @param {RegExp} opts.templateRegExp The regular expression to be used for template recognizing. 
   * Default is `/\{\{([^}]*)\}\}/`, i.e. Mustache.
   * @param {string} opts.fieldSplitter The string to be expected as template field splitter. Default is `|`.
   * @param {string} opts.joinText The string to be used when the extracted value for a single cell is an array, 
   * and it needs to be joined. Default is `,`.
   * @param {string|boolean} opts.mergeCells Whether to merge the higher dimension cells in the output. Default is true.
   * @param {boolean} opts.followFormulae If a template is located as a result of a formula, whether to still process it.
   * Default is false.
   * @param {boolean} opts.copyStyle Copy the style of the template cell when populating. Even when `false`, the template
   * styling _is_ applied. Default is true.
   * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data and value extraction.
   * There is one default - the empty one, for object key extraction.
   */
  function XlsxDataFill(accessor, opts) {
    _classCallCheck(this, XlsxDataFill);

    this._opts = _2.defaultsDeep({}, opts, defaultOpts);
    this._rowSizes = {};
    this._colSizes = {};
    this._access = accessor;
  }
  /**
   * Setter/getter for XlsxDataFill's options as set during construction.
   * @param {{}|null} newOpts If set - the new options to be used. 
   * @see {@constructor}.
   * @returns {XlsxDataFill|{}} The required options (in getter mode) or XlsxDataFill (in setter mode) for chaining.
   */


  _createClass(XlsxDataFill, [{
    key: "options",
    value: function options(newOpts) {
      if (newOpts !== null) {
        _2.merge(this._opts, newOpts);

        return this;
      } else return this._opts;
    }
    /**
     * The main entry point for whole data population mechanism.
     * @param {{}} data The data to be applied.
     * @returns {XlsxDataFill} For invocation chaining.
     */

  }, {
    key: "fillData",
    value: function fillData(data) {
      var _this = this;

      var dataFills = {}; // Build the dependency connections between templates.

      this.collectTemplates(function (template) {
        var aFill = {
          template: template,
          dependents: [],
          formulas: [],
          processed: false
        };

        if (template.reference) {
          var refFill = dataFills[template.reference];
          if (!refFill) throw new Error("Unable to find a reference '".concat(template.reference, "'!"));
          if (template.formula) refFill.formulas.push(aFill);else refFill.dependents.push(aFill);
          aFill.offset = _this._access.cellDistance(refFill.template.cell, template.cell);
        }

        dataFills[template.id] = aFill;
      }); // Apply each fill onto the sheet.

      _2.each(dataFills, function (fill) {
        if (fill.processed) return;else if (fill.template.formula) throw new Error("Non-referencing formula found '".concat(fill.extractor, "'. Use a non-templated one!"));else _this.applyFill(fill, data, fill.template.cell);
      });

      return this;
    }
    /**
     * Retrieves the provided handler from the map.
     * @param {string} handlerName The name of the handler.
     * @returns {function} The handler function itself.
     * @ignore
     */

  }, {
    key: "getHandler",
    value: function getHandler(handlerName) {
      var handlerFn = this._opts.callbacksMap[handlerName];
      if (!handlerFn) throw new Error("Handler '".concat(handlerName, "' cannot be found!"));else if (typeof handlerFn !== 'function') throw new Error("Handler '".concat(handlerName, "' is not a function!"));else return handlerFn;
    }
    /**
     * Parses the provided extractor (ot iterator) string to find a callback id inside, if present.
     * @param {string} extractor The iterator/extractor string to be investigated.
     * @returns {object.<string, function>} A { `path`, `handler` } object representing the JSON path
     * ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
     * If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.
     * @ignore
     */

  }, {
    key: "parseExtractor",
    value: function parseExtractor(extractor) {
      // A specific extractor can be specified after semilon - find and remember it.
      var extractParts = extractor.split(":"),
          handlerName = _2.trim(extractParts[1]);

      return extractParts.length == 1 ? {
        path: extractor,
        handler: null
      } : {
        path: _2.trim(extractParts[0]),
        handler: this.getHandler(handlerName)
      };
    }
    /**
     * Applies the style part of the template onto a given cell.
     * @param {Cell} cell The destination cell to apply styling to.
     * @param {{}} data The data chunk for that cell.
     * @param {{}} template The template to be used for that cell.
     * @returns {DataFiller} For invocation chaining.
     * @ignore
     */

  }, {
    key: "applyDataStyle",
    value: function applyDataStyle(cell, data, template) {
      var _this2 = this;

      var styles = template.styles;
      if (this._opts.copyStyle) this._access.copyStyle(cell, template.cell);

      if (styles && data) {
        _2.each(styles, function (pair) {
          if (_2.startsWith(pair.name, ":")) {
            _this2.getHandler(pair.name.substr(1)).call(_this2._opts, data, cell);
          } else {
            var val = _this2.extractValues(data, pair.extractor, cell);

            if (val) _this2._access.setCellStyle(cell, pair.name, val);
          }
        });
      }

      return this;
    }
    /**
     * Parses the contents of the cell into a valid template info.
     * @param {Cell} cell The cell containing the template to be parsed.
     * @returns {{}} The parsed template.
     * @description This method builds template info, taking into account the supplied options.
     * @ignore
     */

  }, {
    key: "parseTemplate",
    value: function parseTemplate(cell) {
      var value = this._access.cellValue(cell);

      if (value == null || typeof value !== 'string') return null;
      var reMatch = value.match(this._opts.templateRegExp);
      if (!reMatch || !this._opts.followFormulae && this._access.cellType(cell) === 'formula') return null;

      var parts = reMatch[1].split(this._opts.fieldSplitter).map(_2.trim),
          styles = !parts[4] ? null : parts[4].split(","),
          extractor = parts[2] || "",
          cellRef = this._access.buildRef(cell, parts[0]);

      if (parts.length < 2) throw new Error("Not enough components of the template '".concat(reMatch[0], "'"));
      if (!!parts[0] && !cellRef) throw new Error("Invalid reference passed: '".concat(parts[0], "'"));
      return {
        id: this._access.cellRef(cell),
        reference: cellRef,
        iterators: parts[1].split(/x|\*/).map(_2.trim),
        extractor: extractor,
        formula: extractor.startsWith("="),
        cell: cell,
        cellSize: this._access.cellSize(cell),
        padding: (parts[3] || "").split(/:|,|x|\*/).map(function (v) {
          return parseInt(v) || 0;
        }),
        styles: !styles ? null : _2.map(styles, function (s) {
          var pair = _2.trim(s).split("=");

          return {
            name: _2.trim(pair[0]),
            extractor: _2.trim(pair[1])
          };
        })
      };
    }
  }, {
    key: "sortTemplates",
    value: function sortTemplates(list) {
      var sorted = [],
          related = {},
          map = {},
          freeList = []; // First, make the dependency map and add the list of non-referencing templates

      for (var i = 0; i < list.length; ++i) {
        var t = list[i];
        map[t.id] = i;
        if (!t.reference) freeList.push(t.id);else (related[t.reference] = related[t.reference] || []).push(t.id);
      } // Now, make the actual sorting.


      while (freeList.length > 0) {
        var id = freeList.shift(),
            _t = list[map[id]];
        sorted.push(_t); // We use the fact that there is a single predecessor in our setup.

        if (related[_t.id]) freeList.push.apply(freeList, _toConsumableArray(related[_t.id]));
      }

      if (sorted.length < list.length) throw new Error("A reference cycle found, involving \"".concat(_2.map(_2.xor(list, sorted), 'id').join(','), "\"!"));
      return sorted;
    }
    /**
     * Searches the whole workbook for template pattern and constructs the templates for processing.
     * @param {Function} cb The callback to be invoked on each templated, after they are sorted.
     * @returns {undefined}
     * @description The templates collected are sorted, based on the intra-template reference - if one template
     * is referring another one, it'll appear _later_ in the returned array, than the referred template.
     * This is the order the callback is being invoked on.
     * @ignore
     */

  }, {
    key: "collectTemplates",
    value: function collectTemplates(cb) {
      var _this3 = this;

      var allTemplates = [];

      this._access.forAllCells(function (cell) {
        var template = _this3.parseTemplate(cell);

        if (template) allTemplates.push(template);
      });

      return this.sortTemplates(allTemplates).forEach(cb);
    }
    /**
     * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
     * @param {{}} root The data root to be extracted values from.
     * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
     * @param {Cell} cell A reference cell, if such exists.
     * @returns {string|number|Date|Array|Array.<Array.<*>>} The value to be used.
     * @description This method is used even when a whole - possibly rectangular - range is about to be set, so it can
     * return an array of arrays.
     * @ignore
     */

  }, {
    key: "extractValues",
    value: function extractValues(root, extractor, cell) {
      var _this4 = this;

      var _this$parseExtractor = this.parseExtractor(extractor),
          path = _this$parseExtractor.path,
          handler = _this$parseExtractor.handler;

      if (!Array.isArray(root)) root = _2.get(root, path, root);else if (root.sizes !== undefined) root = !extractor ? root : _2.map(root, function (entry) {
        return _this4.extractValues(entry, extractor, cell);
      });else if (!handler) return root.join(this._opts.joinText || ",");
      return !handler ? root : handler.call(this._opts, root, cell);
    }
    /**
     * Extracts an array (possibly of arrays) with data for the given fill, based on the given
     * root object.
     * @param {{}} root The main reference object to apply iterators to.
     * @param {Array} iterators List of iterators - string JSON paths inside the root object.
     * @param {Number} idx The index in the iterators array to work on.
     * @returns {Array|Array.<Array>} An array (possibly of arrays) with extracted data.
     * @ignore
     */

  }, {
    key: "extractData",
    value: function extractData(root, iterators, idx) {
      var _this5 = this;

      var iter = iterators[idx],
          sizes = [],
          transposed = false,
          data = null;

      if (iter == '1') {
        transposed = true;
        iter = iterators[++idx];
      }

      if (!iter) return root; // A specific extractor can be specified after semilon - find and remember it.

      var parsedIter = this.parseExtractor(iter);
      data = _2.get(root, parsedIter.path, root);
      if (typeof parsedIter.handler === 'function') data = parsedIter.handler.call(this._opts, data);
      if (!Array.isArray(data) && _typeof(data) === 'object') return data;else if (idx < iterators.length - 1) {
        data = _2.map(data, function (inRoot) {
          return _this5.extractData(inRoot, iterators, idx + 1);
        });
        sizes = data[0].sizes || [];
      } // data = _.values(data);
      // Some data sanity checks.

      if (!data) throw new Error("The iterator '".concat(iter, "' extracted no data!"));else if (_typeof(data) !== 'object') throw new Error("The data extracted from iterator '".concat(iter, "' is neither an array, nor object!"));
      sizes.unshift(transposed ? -data.length : data.length);
      data.sizes = sizes;
      return data;
    }
    /**
     * Put the data values into the proper cells, with correct extracted values.
     * @param {{}} cell The starting cell for the data to be put.
     * @param {Array} data The actual data to be put. The values will be _extracted_ from here first.
     * @param {{}} template The template that is being implemented with that data fill.
     * @returns {Array} Matrix size that this data has occupied on the sheet [rows, cols].
     * @ignore
     */

  }, {
    key: "putValues",
    value: function putValues(cell, data, template) {
      var _this6 = this;

      if (!cell) throw new Error("Crash! Null reference cell in 'putValues()'!");
      var entrySize = data.sizes,
          value = this.extractValues(data, template.extractor, cell); // if we've come up with a raw data

      if (!Array.isArray(value) || !entrySize || !entrySize.length) {
        this._access.setCellValue(cell, value);

        this.applyDataStyle(cell, data, template);
        entrySize = template.cellSize;
      } else if (entrySize.length <= 2) {
        // Normalize the size and data.
        if (entrySize[0] < 0) {
          entrySize = [1, -entrySize[0]];
          value = [value];
          data = [data];
        } else if (entrySize.length == 1) {
          entrySize = entrySize.concat([1]);
          value = _2.chunk(value, 1);
          data = _2.chunk(data, 1);
        }

        this._access.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1).forEach(function (cell, ri, ci) {
          _this6._access.setCellValue(cell, value[ri][ci]);

          _this6.applyDataStyle(cell, data[ri][ci], template);
        });
      } else throw new Error("Values extracted with '".concat(template.extractor, "' are more than 2 dimension!'"));

      return entrySize;
    }
    /**
     * Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.
     * @param {{}} aFill The fill to be applied, as constructed in the {@link fillData} method.
     * @param {{}} root The data root to be used for data extraction.
     * @param {Cell} mainCell The starting cell for data placement procedure.
     * @returns {Array} The size of the data put in [row, col] format.
     * @ignore
     */

  }, {
    key: "applyFill",
    value: function applyFill(aFill, root, mainCell) {
      var _this7 = this;

      var template = aFill.template,
          theData = this.extractData(root, template.iterators, 0);
      var entrySize = [1, 1];
      if (!aFill.dependents || !aFill.dependents.length) entrySize = this.putValues(mainCell, theData, template);else {
        var nextCell = mainCell;

        var sizeMaxxer = function sizeMaxxer(val, idx) {
          return entrySize[idx] = Math.max(entrySize[idx], val);
        };

        var _loop = function _loop(d) {
          var inRoot = theData[d];

          for (var f = 0; f < aFill.dependents.length; ++f) {
            var inFill = aFill.dependents[f],
                inCell = _this7._access.offsetCell(nextCell, inFill.offset[0], inFill.offset[1]);

            _2.forEach(_this7.applyFill(inFill, inRoot, inCell), sizeMaxxer);
          } // Now we have the inner data put and the size calculated.


          _2.forEach(_this7.putValues(nextCell, inRoot, template), sizeMaxxer);

          var rowOffset = entrySize[0],
              colOffset = entrySize[1],
              rowPadding = template.padding[0] || 0,
              colPadding = template.padding[1] || 0; // Make sure we grow only on one dimension.

          if (theData.sizes[0] < 0) {
            if (template.padding.length < 2) colPadding = rowPadding;
            rowOffset = rowPadding = 0;
            entrySize[1] = 1;
          } else if (theData.sizes.length < 2) {
            colOffset = colPadding = 0;
            entrySize[0] = 1;
          }

          if (rowOffset > 1 || colOffset > 1) {
            var rng = _this7._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0));

            if (_this7._opts.mergeCells === true || _this7._opts.mergeCell === 'both' || rowOffset > 1 && _this7._opts.mergeCells === 'vertical' || colOffset > 1 && _this7._opts.mergeCells === 'horizontal') _this7._access.rangeMerged(rng, true);
            rng.forEach(function (cell) {
              return _this7.applyDataStyle(cell, inRoot, template);
            });
          } // Finally, calculate the next cell.


          nextCell = _this7._access.offsetCell(nextCell, rowOffset + rowPadding, colOffset + colPadding);
        };

        for (var d = 0; d < theData.length; ++d) {
          _loop(d);
        } // Now recalc combined entry size.


        _2.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
      }

      _2.forEach(aFill.formulas, function (f) {
        return _this7.applyFormula(f, entrySize, mainCell);
      });

      aFill.processed = true;
      return entrySize;
    }
    /**
     * Process a formula be shifting all the fixed offset.
     * @param {String} formula The formula to be shifted.
     * @param {Array<Number,Number>} offset The offset of the referenced template to the formula one.
     * @param {Array<Number,Number>} size The size of the ranges as they should be.
     * @returns {String} The processed text.
     * @ignore
     */

  }, {
    key: "shiftFormula",
    value: function shiftFormula(formula, offset, size) {
      var newFormula = '';

      for (;;) {
        var match = formula.match(refRegExp);
        if (!match) break;

        var from = this._access.getCell(match[3], match[2]),
            newRef = null;

        if (offset[0] > 0 || offset[1] > 0) from = this._access.offsetCell(from, offset[0], offset[1]);
        newRef = !match[5] ? this._access.cellRef(from, !!match[2]) : this._access.rangeRef(this._access.getCellRange(from, size[0], size[1]), !!match[2]);
        newFormula += formula.substr(0, match.index) + newRef;
        formula = formula.substr(match.index + match[0].length);
      }

      newFormula += formula;
      return newFormula;
    }
    /**
     * Apply the given formula in the sheet, i.e. changing it to match the 
     * sizes of the references templates.
     * @param {{}} aFill The fill to be applied, as constructed in the {@link fillData} method.
     * @param {Array<Number>} entrySize The fill-to-size map, as constructed so far
     * @param {Cell} cell The cell to put/start this formula into
     * @returns {undefined}
     * @ignore
     */

  }, {
    key: "applyFormula",
    value: function applyFormula(aFill, entrySize, cell) {
      cell = this._access.offsetCell(cell, aFill.offset[0], aFill.offset[1]);

      var template = aFill.template,
          iter = _2.trim(template.iterators[0]),
          offset = this._access.cellDistance(template.cell, cell);

      var formula = template.extractor,
          rng;
      aFill.processed = true;

      this._access.setCellValue(cell, null);

      if (entrySize[0] < 2 && entrySize[1] < 2 || iter === 'both') {
        formula = this.shiftFormula(formula, offset, [0, 0]);
        rng = this._access.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1);
      } else if (iter === 'cols') {
        formula = this.shiftFormula(formula, offset, [entrySize[0] - 1, 0]);
        rng = this._access.getCellRange(cell, 0, entrySize[1] - 1);
      } else if (iter === 'rows') {
        formula = this.shiftFormula(formula, offset, [0, entrySize[1] - 1]);
        rng = this._access.getCellRange(cell, entrySize[0] - 1, 0);
      } else {
        // i.e. 'none'
        this._access.setCellFormula(cell, this.shiftFormula(formula, offset, [entrySize[0] - 1, entrySize[1] - 1]));

        return;
      }

      this._access.setRangeFormula(rng, formula);
    }
  }]);

  return XlsxDataFill;
}();
/**
 * The built-in accessor based on xlsx-populate npm module
 * @type {XlsxPopulateAccess}
 */


XlsxDataFill.XlsxPopulateAccess = require('./XlsxPopulateAccess');
XlsxDataFill.version = "1.0.1";
module.exports = XlsxDataFill;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./XlsxPopulateAccess":2}],2:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null); // const allStyles = [
//     "bold", 
//     "italic", 
//     "underline", 
//     "strikethrough", 
//     "subscript", 
//     "superscript", 
//     "fontSize", 
//     "fontFamily", 
//     "fontGenericFamily", 
//     "fontScheme", 
//     "fontColor", 
//     "horizontalAlignment", 
//     "justifyLastLine", 
//     "indent", 
//     "verticalAlignment", 
//     "wrapText", 
//     "shrinkToFit", 
//     "textDirection", 
//     "textRotation", 
//     "angleTextCounterclockwise", 
//     "angleTextClockwise", 
//     "rotateTextUp", 
//     "rotateTextDown", 
//     "verticalText", 
//     "fill", 
//     "border", 
//     "borderColor", 
//     "borderStyle", 
//     "leftBorder", "rightBorder", "topBorder", "bottomBorder", "diagonalBorder", 
//     "leftBorderColor", "rightBorderColor", "topBorderColor", "bottomBorderColor", "diagonalBorderColor", 
//     "leftBorderStyle", "rightBorderStyle", "topBorderStyle", "bottomBorderStyle", "diagonalBorderStyle", 
//     "diagonalBorderDirection", 
//     "numberFormat"
// ];


var _RichText = null;
/**
 * `xslx-populate` library based accessor to a given Excel workbook. All these methods are internally used by {@link XlsxDataFill}, 
 * but can be used as a reference for implementing custom spreadsheet accessors.
 */

var XlsxPopulateAccess = /*#__PURE__*/function () {
  /**
   * Constructs a new instance of XlsxSmartTemplate with given options.
   * @param {Workbook} workbook - The workbook to be accessed.
   * @param {XlsxPopulate} XlsxPopulate - The actual xlsx-populate library object.
   * @description The `XlsxPopulate` object need to be passed in order to extract
   * certain information from it, _without_ referring the whole library, thus
   * avoiding making the `xlsx-datafill` package a dependency.
   */
  function XlsxPopulateAccess(workbook, XlsxPopulate) {
    _classCallCheck(this, XlsxPopulateAccess);

    this._workbook = workbook;
    this._rowSizes = {};
    this._colSizes = {};
    _RichText = XlsxPopulate.RichText;
  }
  /**
   * Returns the configured workbook for direct XlsxPopulate manipulation.
   * @returns {Workbook} The workbook involved.
   */


  _createClass(XlsxPopulateAccess, [{
    key: "workbook",
    value: function workbook() {
      return this._workbook;
    }
    /**
     * Gets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @returns {string} The textual representation of cell's contents.
     */

  }, {
    key: "cellValue",
    value: function cellValue(cell) {
      var theValue = cell.value();
      return theValue instanceof _RichText ? theValue.text() : theValue;
    }
    /**
     * Sets the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {*} value - The requested value for setting.
     * @returns {XlsxPopulateAccess} Either the requested value or chainable this.
     */

  }, {
    key: "setCellValue",
    value: function setCellValue(cell, value) {
      cell.value(value);
      return this;
    }
    /**
     * Gets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @returns {string} The type of the cell - 'formula', 'richtext', 
     * 'text', 'number', 'date', 'hyperlink', or 'unknown';
     */

  }, {
    key: "cellType",
    value: function cellType(cell) {
      if (cell.formula()) return 'formula';else if (cell.hyperlink()) return 'hyperlink';
      var theValue = cell.value();
      if (theValue instanceof _RichText) return 'richtext';else if (theValue instanceof Date) return 'date';else return _typeof(theValue);
    }
    /**
     * Sets the formula in the cell
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {string} formula - the text of the formula to be set.
     * @returns {XlsxPopulateAccess} For chaining.
     */

  }, {
    key: "setCellFormula",
    value: function setCellFormula(cell, formula) {
      cell.formula(_.trimStart(formula, ' ='));
      return this;
    }
    /**
     * Measures the distance, as a vector between two given cells.
     * @param {Cell} from The first cell.
     * @param {Cell} to The second cell.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the distance between the two cells.
     */

  }, {
    key: "cellDistance",
    value: function cellDistance(from, to) {
      return [to.rowNumber() - from.rowNumber(), to.columnNumber() - from.columnNumber()];
    }
    /**
     * Determines the size of cell, taking into account if it is part of a merged range.
     * @param {Cell} cell The cell to be investigated.
     * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the occupied size.
     */

  }, {
    key: "cellSize",
    value: function cellSize(cell) {
      var _this = this;

      var cellAddr = cell.address();
      var theSize = [1, 1];

      _.forEach(cell.sheet()._mergeCells, function (range) {
        var rangeAddr = range.attributes.ref.split(":");

        if (rangeAddr[0] == cellAddr) {
          theSize = _this.cellDistance(cell, cell.sheet().cell(rangeAddr[1]));
          ++theSize[0];
          ++theSize[1];
          return false;
        }
      });

      return theSize;
    }
    /**
     * Sets a named style of a given cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} name The name of the style property to be set.
     * @param {string|object} value The value for this property to be set.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "setCellStyle",
    value: function setCellStyle(cell, name, value) {
      cell.style(name, value);
      return this;
    }
    /**
     * Creates a reference Id for a given cell, based on its sheet and address.
     * @param {Cell} cell The cell to create a reference Id to.
     * @param {boolean} withSheet Whether to include the sheet name in the reference. Defaults to true.
     * @returns {string} The id to be used as a reference for this cell.
     */

  }, {
    key: "cellRef",
    value: function cellRef(cell, withSheet) {
      if (withSheet == null) withSheet = true;
      return cell.address({
        includeSheetName: withSheet
      });
    }
    /**
     * Build a reference string for a cell identified by @param adr, from the @param cell.
     * @param {Cell} cell A cell that is a base of the reference.
     * @param {string} adr The address of the target cell, as mentioned in @param cell.
     * @param {boolean} withSheet Whether to include the sheet name in the reference. Defaults to true.
     * @returns {string} A reference string identifying the target cell uniquely.
     */

  }, {
    key: "buildRef",
    value: function buildRef(cell, adr, withSheet) {
      if (withSheet == null) withSheet = true;
      return adr ? cell.sheet().cell(adr).address({
        includeSheetName: withSheet
      }) : null;
    }
    /**
     * Retrieves a given cell from a given sheet (or an active one).
     * @param {string|object|array} address The cell adress to be used
     * @param {string|idx} sheetId The id/name of the sheet to retrieve the cell from. Defaults to an active one.
     * @returns {Cell} A reference to the required cell.
     */

  }, {
    key: "getCell",
    value: function getCell(address, sheetId) {
      var theSheet = sheetId == null ? this._workbook.activeSheet() : this._workbook.sheet(sheetId);
      return theSheet.cell(address);
    }
    /**
     * Constructs and returns the range starting from the given cell and spawning given rows and cells.
     * @param {Cell} cell The starting cell of the range.
     * @param {Number} rowOffset Number of rows away from the starting cell. 0 means same row.
     * @param {Number} colOffset Number of columns away from the starting cell. 0 means same column.
     * @returns {Range} The constructed range.
     */

  }, {
    key: "getCellRange",
    value: function getCellRange(cell, rowOffset, colOffset) {
      return cell.rangeTo(cell.relativeCell(rowOffset, colOffset));
    }
    /**
     * Gets the cell at a certain offset from a given one.
     * @param {Cell} cell The reference cell to make the offset from.
     * @param {int} rows Number of rows to offset.
     * @param {int} cols Number of columns to offset.
     * @returns {Cell} The resulting cell.
     */

  }, {
    key: "offsetCell",
    value: function offsetCell(cell, rows, cols) {
      return cell.relativeCell(rows, cols);
    }
    /**
     * Merge or split range of cells.
     * @param {Range} range The range, as returned from {@link getCellRange}
     * @param {boolean} status The merged status to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "rangeMerged",
    value: function rangeMerged(range, status) {
      if (status === undefined) return range.merged();else {
        range.merged(status);
        return this;
      }
    }
    /**
     * Sets a formula for the whole range. If it contains only one - it is set directly.
     * @param {Range} range The range, as returned from {@link getCellRange}
     * @param {String} formula The formula to be set.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "setRangeFormula",
    value: function setRangeFormula(range, formula) {
      range.formula(_.trimStart(formula, ' ='));
      return this;
    }
    /**
     * Return the string representation of a given range.
     * @param {Range} range The range which address we're interested in.
     * @param {boolean} withSheet Whether to include sheet name in the address.
     * @return {String} The string, representing the given range.
     */

  }, {
    key: "rangeRef",
    value: function rangeRef(range, withSheet) {
      if (withSheet == null) withSheet = true;
      return range.address({
        includeSheetName: withSheet
      });
    }
    /**
     * Iterate over all used cells of the given workbook.
     * @param {function} cb The callback to be invoked with `cell` argument for each used cell.
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "forAllCells",
    value: function forAllCells(cb) {
      this._workbook.sheets().forEach(function (sheet) {
        var theRange = sheet.usedRange();
        if (theRange) theRange.forEach(cb);
      });

      return this;
    }
    /**
     * Copies the styles from `src` cell to the `dest`-ination one.
     * @param {Cell} dest Destination cell.
     * @param {Cell} src Source cell.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "copyStyle",
    value: function copyStyle(dest, src) {
      if (!src || !dest) throw new Error("Crash! Null 'src' or 'dest' for copyStyle()!");
      if (src == dest) return this;
      if (src._style !== undefined) dest.style(src._style);else if (src._styleId > 0) dest._styleId = src._styleId;
      var destSheetId = dest.sheet().name(),
          rowId = "'".concat(destSheetId, "':").concat(dest.rowNumber()),
          colId = "'".concat(destSheetId, "':").concat(dest.columnNumber());
      if (this._rowSizes[rowId] === undefined) dest.row().height(this._rowSizes[rowId] = src.row().height());
      if (this._colSizes[colId] === undefined) dest.column().width(this._colSizes[colId] = src.column().width());
      return this;
    }
  }]);

  return XlsxPopulateAccess;
}();

module.exports = XlsxPopulateAccess;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxTQUFTLEVBQUUsSUFOSztBQU9oQixFQUFBLFlBQVksRUFBRTtBQUNWLFFBQUksV0FBQSxJQUFJO0FBQUEsYUFBSSxFQUFDLENBQUMsSUFBRixDQUFPLElBQVAsQ0FBSjtBQUFBLEtBREU7QUFFVixJQUFBLENBQUMsRUFBRSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxNQUFGLENBQVMsSUFBVCxDQUFKO0FBQUE7QUFGRztBQVBFLENBQXBCO0FBYUEsSUFBTSxTQUFTLEdBQUcsNENBQWxCO0FBRUE7Ozs7SUFHTSxZO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBLHdCQUFZLFFBQVosRUFBc0IsSUFBdEIsRUFBNEI7QUFBQTs7QUFDeEIsU0FBSyxLQUFMLEdBQWEsRUFBQyxDQUFDLFlBQUYsQ0FBZSxFQUFmLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLENBQWI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLE9BQUwsR0FBZSxRQUFmO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs0QkFNUSxPLEVBQVM7QUFDYixVQUFJLE9BQU8sS0FBSyxJQUFoQixFQUFzQjtBQUNsQixR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LFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBTCxHQUFhLElBQWIsRUFBcEI7QUFBQSxVQUNJLEtBQUssY0FBTyxXQUFQLGVBQXVCLElBQUksQ0FBQyxTQUFMLEVBQXZCLENBRFQ7QUFBQSxVQUVJLEtBQUssY0FBTyxXQUFQLGVBQXVCLElBQUksQ0FBQyxZQUFMLEVBQXZCLENBRlQ7QUFJQSxVQUFJLEtBQUssU0FBTCxDQUFlLEtBQWYsTUFBMEIsU0FBOUIsRUFDSSxJQUFJLENBQUMsR0FBTCxHQUFXLE1BQVgsQ0FBa0IsS0FBSyxTQUFMLENBQWUsS0FBZixJQUF3QixHQUFHLENBQUMsR0FBSixHQUFVLE1BQVYsRUFBMUM7QUFFSixVQUFJLEtBQUssU0FBTCxDQUFlLEtBQWYsTUFBMEIsU0FBOUIsRUFDSSxJQUFJLENBQUMsTUFBTCxHQUFjLEtBQWQsQ0FBb0IsS0FBSyxTQUFMLENBQWUsS0FBZixJQUF3QixHQUFHLENBQUMsTUFBSixHQUFhLEtBQWIsRUFBNUM7QUFFSixhQUFPLElBQVA7QUFDSDs7Ozs7O0FBR0wsTUFBTSxDQUFDLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuY29uc3QgZGVmYXVsdE9wdHMgPSB7XG4gICAgdGVtcGxhdGVSZWdFeHA6IC9cXHtcXHsoW159XSopXFx9XFx9LyxcbiAgICBmaWVsZFNwbGl0dGVyOiBcInxcIixcbiAgICBqb2luVGV4dDogXCIsXCIsXG4gICAgbWVyZ2VDZWxsczogdHJ1ZSxcbiAgICBmb2xsb3dGb3JtdWxhZTogZmFsc2UsXG4gICAgY29weVN0eWxlOiB0cnVlLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICAnJzogZGF0YSA9PiBfLmtleXMoZGF0YSksXG4gICAgICAgICQ6IGRhdGEgPT4gXy52YWx1ZXMoZGF0YSlcbiAgICB9XG59O1xuXG5jb25zdCByZWZSZWdFeHAgPSAvKCc/KFteIV0qKT8nPyEpPyhbQS1aXStcXGQrKSg6KFtBLVpdK1xcZCspKT8vO1xuXG4vKipcbiAqIERhdGEgZmlsbCBlbmdpbmUsIHRha2luZyBhbiBpbnN0YW5jZSBvZiBFeGNlbCBzaGVldCBhY2Nlc3NvciBhbmQgYSBKU09OIG9iamVjdCBhcyBkYXRhLCBhbmQgZmlsbGluZyB0aGUgdmFsdWVzIGZyb20gdGhlIGxhdHRlciBpbnRvIHRoZSBmb3JtZXIuXG4gKi9cbmNsYXNzIFhsc3hEYXRhRmlsbCB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4RGF0YUZpbGwgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhY2Nlc3NvciBBbiBpbnN0YW5jZSBvZiBYTFNYIHNwcmVhZHNoZWV0IGFjY2Vzc2luZyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBvcHRzIE9wdGlvbnMgdG8gYmUgdXNlZCBkdXJpbmcgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gb3B0cy50ZW1wbGF0ZVJlZ0V4cCBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIGJlIHVzZWQgZm9yIHRlbXBsYXRlIHJlY29nbml6aW5nLiBcbiAgICAgKiBEZWZhdWx0IGlzIGAvXFx7XFx7KFtefV0qKVxcfVxcfS9gLCBpLmUuIE11c3RhY2hlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci4gRGVmYXVsdCBpcyBgfGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuam9pblRleHQgVGhlIHN0cmluZyB0byBiZSB1c2VkIHdoZW4gdGhlIGV4dHJhY3RlZCB2YWx1ZSBmb3IgYSBzaW5nbGUgY2VsbCBpcyBhbiBhcnJheSwgXG4gICAgICogYW5kIGl0IG5lZWRzIHRvIGJlIGpvaW5lZC4gRGVmYXVsdCBpcyBgLGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gb3B0cy5tZXJnZUNlbGxzIFdoZXRoZXIgdG8gbWVyZ2UgdGhlIGhpZ2hlciBkaW1lbnNpb24gY2VsbHMgaW4gdGhlIG91dHB1dC4gRGVmYXVsdCBpcyB0cnVlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5mb2xsb3dGb3JtdWxhZSBJZiBhIHRlbXBsYXRlIGlzIGxvY2F0ZWQgYXMgYSByZXN1bHQgb2YgYSBmb3JtdWxhLCB3aGV0aGVyIHRvIHN0aWxsIHByb2Nlc3MgaXQuXG4gICAgICogRGVmYXVsdCBpcyBmYWxzZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuY29weVN0eWxlIENvcHkgdGhlIHN0eWxlIG9mIHRoZSB0ZW1wbGF0ZSBjZWxsIHdoZW4gcG9wdWxhdGluZy4gRXZlbiB3aGVuIGBmYWxzZWAsIHRoZSB0ZW1wbGF0ZVxuICAgICAqIHN0eWxpbmcgX2lzXyBhcHBsaWVkLiBEZWZhdWx0IGlzIHRydWUuXG4gICAgICogQHBhcmFtIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBvcHRzLmNhbGxiYWNrc01hcCBBIG1hcCBvZiBoYW5kbGVycyB0byBiZSB1c2VkIGZvciBkYXRhIGFuZCB2YWx1ZSBleHRyYWN0aW9uLlxuICAgICAqIFRoZXJlIGlzIG9uZSBkZWZhdWx0IC0gdGhlIGVtcHR5IG9uZSwgZm9yIG9iamVjdCBrZXkgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ldyBvcHRpb25zIHRvIGJlIHVzZWQuIFxuICAgICAqIEBzZWUge0Bjb25zdHJ1Y3Rvcn0uXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbHx7fX0gVGhlIHJlcXVpcmVkIG9wdGlvbnMgKGluIGdldHRlciBtb2RlKSBvciBYbHN4RGF0YUZpbGwgKGluIHNldHRlciBtb2RlKSBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgICAgIGlmIChuZXdPcHRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMuX29wdHMsIG5ld09wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHdob2xlIGRhdGEgcG9wdWxhdGlvbiBtZWNoYW5pc20uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSB0byBiZSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGZpbGxEYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YUZpbGxzID0ge307XG5cdFxuICAgICAgICAvLyBCdWlsZCB0aGUgZGVwZW5kZW5jeSBjb25uZWN0aW9ucyBiZXR3ZWVuIHRlbXBsYXRlcy5cbiAgICAgICAgdGhpcy5jb2xsZWN0VGVtcGxhdGVzKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFGaWxsID0geyAgXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLCBcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzOiBbXSxcbiAgICAgICAgICAgICAgICBmb3JtdWxhczogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZkZpbGwgPSBkYXRhRmlsbHNbdGVtcGxhdGUucmVmZXJlbmNlXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXJlZkZpbGwpIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGEgcmVmZXJlbmNlICcke3RlbXBsYXRlLnJlZmVyZW5jZX0nIWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5mb3JtdWxhKSBcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5mb3JtdWxhcy5wdXNoKGFGaWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlZkZpbGwuZGVwZW5kZW50cy5wdXNoKGFGaWxsKTtcbiAgICBcbiAgICAgICAgICAgICAgICBhRmlsbC5vZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHJlZkZpbGwudGVtcGxhdGUuY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhRmlsbHNbdGVtcGxhdGUuaWRdID0gYUZpbGw7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBBcHBseSBlYWNoIGZpbGwgb250byB0aGUgc2hlZXQuXG4gICAgICAgIF8uZWFjaChkYXRhRmlsbHMsIGZpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKGZpbGwucHJvY2Vzc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGVsc2UgaWYgKGZpbGwudGVtcGxhdGUuZm9ybXVsYSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1yZWZlcmVuY2luZyBmb3JtdWxhIGZvdW5kICcke2ZpbGwuZXh0cmFjdG9yfScuIFVzZSBhIG5vbi10ZW1wbGF0ZWQgb25lIWApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWxsKGZpbGwsIGRhdGEsIGZpbGwudGVtcGxhdGUuY2VsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgcHJvdmlkZWQgaGFuZGxlciBmcm9tIHRoZSBtYXAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhhbmRsZXJOYW1lIFRoZSBuYW1lIG9mIHRoZSBoYW5kbGVyLlxuICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gaXRzZWxmLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyKGhhbmRsZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJGbiA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW2hhbmRsZXJOYW1lXTtcblxuICAgICAgICBpZiAoIWhhbmRsZXJGbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGNhbm5vdCBiZSBmb3VuZCFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGhhbmRsZXJGbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGlzIG5vdCBhIGZ1bmN0aW9uIWApO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJGbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHByb3ZpZGVkIGV4dHJhY3RvciAob3QgaXRlcmF0b3IpIHN0cmluZyB0byBmaW5kIGEgY2FsbGJhY2sgaWQgaW5zaWRlLCBpZiBwcmVzZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGl0ZXJhdG9yL2V4dHJhY3RvciBzdHJpbmcgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBBIHsgYHBhdGhgLCBgaGFuZGxlcmAgfSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBKU09OIHBhdGhcbiAgICAgKiByZWFkeSBmb3IgdXNlIGFuZCB0aGUgcHJvdmlkZWQgYGhhbmRsZXJgIF9mdW5jdGlvbl8gLSByZWFkeSBmb3IgaW52b2tpbmcsIGlmIHN1Y2ggaXMgcHJvdmlkZWQuXG4gICAgICogSWYgbm90IC0gdGhlIGBwYXRoYCBwcm9wZXJ0eSBjb250YWlucyB0aGUgcHJvdmlkZWQgYGV4dHJhY3RvcmAsIGFuZCB0aGUgYGhhbmRsZXJgIGlzIGBudWxsYC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKSB7XG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBleHRyYWN0UGFydHMgPSBleHRyYWN0b3Iuc3BsaXQoXCI6XCIpLFxuICAgICAgICAgICAgaGFuZGxlck5hbWUgPSBfLnRyaW0oZXh0cmFjdFBhcnRzWzFdKTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IF8udHJpbShleHRyYWN0UGFydHNbMF0pLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IHRoaXMuZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSlcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgc3R5bGUgcGFydCBvZiB0aGUgdGVtcGxhdGUgb250byBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBkZXN0aW5hdGlvbiBjZWxsIHRvIGFwcGx5IHN0eWxpbmcgdG8uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSBjaHVuayBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBiZSB1c2VkIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHJldHVybnMge0RhdGFGaWxsZXJ9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX29wdHMuY29weVN0eWxlKVxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzdHlsZXMgJiYgZGF0YSkge1xuICAgICAgICAgICAgXy5lYWNoKHN0eWxlcywgcGFpciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEhhbmRsZXIocGFpci5uYW1lLnN1YnN0cigxKSkuY2FsbCh0aGlzLl9vcHRzLCBkYXRhLCBjZWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgcGFpci5leHRyYWN0b3IsIGNlbGwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxTdHlsZShjZWxsLCBwYWlyLm5hbWUsIHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VUZW1wbGF0ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fYWNjZXNzLmNlbGxWYWx1ZShjZWxsKTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVNYXRjaCA9IHZhbHVlLm1hdGNoKHRoaXMuX29wdHMudGVtcGxhdGVSZWdFeHApO1xuICAgICAgICBpZiAoIXJlTWF0Y2ggfHwgIXRoaXMuX29wdHMuZm9sbG93Rm9ybXVsYWUgJiYgdGhpcy5fYWNjZXNzLmNlbGxUeXBlKGNlbGwpID09PSAnZm9ybXVsYScpIFxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0gcmVNYXRjaFsxXS5zcGxpdCh0aGlzLl9vcHRzLmZpZWxkU3BsaXR0ZXIpLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgc3R5bGVzID0gIXBhcnRzWzRdID8gbnVsbCA6IHBhcnRzWzRdLnNwbGl0KFwiLFwiKSxcbiAgICAgICAgICAgIGV4dHJhY3RvciA9IHBhcnRzWzJdIHx8IFwiXCIsXG4gICAgICAgICAgICBjZWxsUmVmID0gdGhpcy5fYWNjZXNzLmJ1aWxkUmVmKGNlbGwsIHBhcnRzWzBdKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCBjb21wb25lbnRzIG9mIHRoZSB0ZW1wbGF0ZSAnJHtyZU1hdGNoWzBdfSdgKTtcbiAgICAgICAgaWYgKCEhcGFydHNbMF0gJiYgIWNlbGxSZWYpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcmVmZXJlbmNlIHBhc3NlZDogJyR7cGFydHNbMF19J2ApO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogdGhpcy5fYWNjZXNzLmNlbGxSZWYoY2VsbCksXG4gICAgICAgICAgICByZWZlcmVuY2U6IGNlbGxSZWYsXG4gICAgICAgICAgICBpdGVyYXRvcnM6IHBhcnRzWzFdLnNwbGl0KC94fFxcKi8pLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgZXh0cmFjdG9yOiBleHRyYWN0b3IsXG4gICAgICAgICAgICBmb3JtdWxhOiBleHRyYWN0b3Iuc3RhcnRzV2l0aChcIj1cIiksXG4gICAgICAgICAgICBjZWxsOiBjZWxsLFxuICAgICAgICAgICAgY2VsbFNpemU6IHRoaXMuX2FjY2Vzcy5jZWxsU2l6ZShjZWxsKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IChwYXJ0c1szXSB8fCBcIlwiKS5zcGxpdCgvOnwsfHh8XFwqLykubWFwKHYgPT4gcGFyc2VJbnQodikgfHwgMCksXG4gICAgICAgICAgICBzdHlsZXM6ICFzdHlsZXMgPyBudWxsIDogXy5tYXAoc3R5bGVzLCBzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWlyID0gXy50cmltKHMpLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBfLnRyaW0ocGFpclswXSksIGV4dHJhY3RvcjogXy50cmltKHBhaXJbMV0pIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHNvcnRUZW1wbGF0ZXMobGlzdCkge1xuICAgICAgICBjb25zdCBzb3J0ZWQgPSBbXSxcbiAgICAgICAgICAgIHJlbGF0ZWQgPSB7fSxcbiAgICAgICAgICAgIG1hcCA9IHt9LFxuICAgICAgICAgICAgZnJlZUxpc3QgPSBbXTtcblxuICAgICAgICAvLyBGaXJzdCwgbWFrZSB0aGUgZGVwZW5kZW5jeSBtYXAgYW5kIGFkZCB0aGUgbGlzdCBvZiBub24tcmVmZXJlbmNpbmcgdGVtcGxhdGVzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgY29uc3QgdCA9IGxpc3RbaV07XG4gICAgICAgICAgICBtYXBbdC5pZF0gPSBpO1xuXG4gICAgICAgICAgICBpZiAoIXQucmVmZXJlbmNlKVxuICAgICAgICAgICAgICAgIGZyZWVMaXN0LnB1c2godC5pZCk7XG4gICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgIChyZWxhdGVkW3QucmVmZXJlbmNlXSA9IHJlbGF0ZWRbdC5yZWZlcmVuY2VdIHx8IFtdKS5wdXNoKHQuaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm93LCBtYWtlIHRoZSBhY3R1YWwgc29ydGluZy5cbiAgICAgICAgd2hpbGUgKGZyZWVMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZnJlZUxpc3Quc2hpZnQoKSxcbiAgICAgICAgICAgICAgICB0ID0gbGlzdFttYXBbaWRdXTtcblxuICAgICAgICAgICAgc29ydGVkLnB1c2godCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdlIHVzZSB0aGUgZmFjdCB0aGF0IHRoZXJlIGlzIGEgc2luZ2xlIHByZWRlY2Vzc29yIGluIG91ciBzZXR1cC5cbiAgICAgICAgICAgIGlmIChyZWxhdGVkW3QuaWRdKVxuICAgICAgICAgICAgICAgIGZyZWVMaXN0LnB1c2goLi4ucmVsYXRlZFt0LmlkXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc29ydGVkLmxlbmd0aCA8IGxpc3QubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBIHJlZmVyZW5jZSBjeWNsZSBmb3VuZCwgaW52b2x2aW5nIFwiJHtfLm1hcChfLnhvcihsaXN0LCBzb3J0ZWQpLCAnaWQnKS5qb2luKCcsJyl9XCIhYCk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuc29ydFRlbXBsYXRlcyhhbGxUZW1wbGF0ZXMpLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIHJlZmVyZW5jZSBjZWxsLCBpZiBzdWNoIGV4aXN0cy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bWJlcnxEYXRlfEFycmF5fEFycmF5LjxBcnJheS48Kj4+fSBUaGUgdmFsdWUgdG8gYmUgdXNlZC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgaXMgdXNlZCBldmVuIHdoZW4gYSB3aG9sZSAtIHBvc3NpYmx5IHJlY3Rhbmd1bGFyIC0gcmFuZ2UgaXMgYWJvdXQgdG8gYmUgc2V0LCBzbyBpdCBjYW5cbiAgICAgKiByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIHJvb3QsIGNlbGwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIGFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZGF0YSBmb3IgdGhlIGdpdmVuIGZpbGwsIGJhc2VkIG9uIHRoZSBnaXZlblxuICAgICAqIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIG1haW4gcmVmZXJlbmNlIG9iamVjdCB0byBhcHBseSBpdGVyYXRvcnMgdG8uXG4gICAgICogQHBhcmFtIHtBcnJheX0gaXRlcmF0b3JzIExpc3Qgb2YgaXRlcmF0b3JzIC0gc3RyaW5nIEpTT04gcGF0aHMgaW5zaWRlIHRoZSByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IFRoZSBpbmRleCBpbiB0aGUgaXRlcmF0b3JzIGFycmF5IHRvIHdvcmsgb24uXG4gICAgICogQHJldHVybnMge0FycmF5fEFycmF5LjxBcnJheT59IEFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZXh0cmFjdGVkIGRhdGEuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3REYXRhKHJvb3QsIGl0ZXJhdG9ycywgaWR4KSB7XG4gICAgICAgIGxldCBpdGVyID0gaXRlcmF0b3JzW2lkeF0sXG4gICAgICAgICAgICBzaXplcyA9IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IGZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGl0ZXIgPT0gJzEnKSB7XG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGl0ZXIgPSBpdGVyYXRvcnNbKytpZHhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpdGVyKSByZXR1cm4gcm9vdDtcblxuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgcGFyc2VkSXRlciA9IHRoaXMucGFyc2VFeHRyYWN0b3IoaXRlcik7XG5cbiAgICAgICAgZGF0YSA9IF8uZ2V0KHJvb3QsIHBhcnNlZEl0ZXIucGF0aCwgcm9vdCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlZEl0ZXIuaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIGRhdGEgPSBwYXJzZWRJdGVyLmhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCBkYXRhKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIGVsc2UgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcyB8fCBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZGF0YSA9IF8udmFsdWVzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNvbWUgZGF0YSBzYW5pdHkgY2hlY2tzLlxuICAgICAgICBpZiAoIWRhdGEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBpdGVyYXRvciAnJHtpdGVyfScgZXh0cmFjdGVkIG5vIGRhdGEhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGRhdGEgZXh0cmFjdGVkIGZyb20gaXRlcmF0b3IgJyR7aXRlcn0nIGlzIG5laXRoZXIgYW4gYXJyYXksIG5vciBvYmplY3QhYCk7XG5cbiAgICAgICAgc2l6ZXMudW5zaGlmdCh0cmFuc3Bvc2VkID8gLWRhdGEubGVuZ3RoIDogZGF0YS5sZW5ndGgpO1xuICAgICAgICBkYXRhLnNpemVzID0gc2l6ZXM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1dCB0aGUgZGF0YSB2YWx1ZXMgaW50byB0aGUgcHJvcGVyIGNlbGxzLCB3aXRoIGNvcnJlY3QgZXh0cmFjdGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciB0aGUgZGF0YSB0byBiZSBwdXQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSBUaGUgYWN0dWFsIGRhdGEgdG8gYmUgcHV0LiBUaGUgdmFsdWVzIHdpbGwgYmUgX2V4dHJhY3RlZF8gZnJvbSBoZXJlIGZpcnN0LlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0aGF0IGlzIGJlaW5nIGltcGxlbWVudGVkIHdpdGggdGhhdCBkYXRhIGZpbGwuXG4gICAgICogQHJldHVybnMge0FycmF5fSBNYXRyaXggc2l6ZSB0aGF0IHRoaXMgZGF0YSBoYXMgb2NjdXBpZWQgb24gdGhlIHNoZWV0IFtyb3dzLCBjb2xzXS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcHV0VmFsdWVzKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGlmICghY2VsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ3Jhc2ghIE51bGwgcmVmZXJlbmNlIGNlbGwgaW4gJ3B1dFZhbHVlcygpJyFcIik7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG4gICAgICAgIC8vIGlmIHdlJ3ZlIGNvbWUgdXAgd2l0aCBhIHJhdyBkYXRhXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBfLmNodW5rKGRhdGEsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWVbcmldW2NpXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhW3JpXVtjaV0sIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWVzIGV4dHJhY3RlZCB3aXRoICcke3RlbXBsYXRlLmV4dHJhY3Rvcn0nIGFyZSBtb3JlIHRoYW4gMiBkaW1lbnNpb24hJ2ApO1xuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSB1c2VkIGZvciBkYXRhIGV4dHJhY3Rpb24uXG4gICAgICogQHBhcmFtIHtDZWxsfSBtYWluQ2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgZGF0YSBwbGFjZW1lbnQgcHJvY2VkdXJlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHNpemUgb2YgdGhlIGRhdGEgcHV0IGluIFtyb3csIGNvbF0gZm9ybWF0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXSxcbiAgICAgICAgICAgICAgICAgICAgcm93UGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMF0gfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgY29sUGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMDtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnBhZGRpbmcubGVuZ3RoIDwgMilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbFBhZGRpbmcgPSByb3dQYWRkaW5nO1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSByb3dQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoZURhdGEuc2l6ZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSBjb2xQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzBdID0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocm93T2Zmc2V0ID4gMSB8fCBjb2xPZmZzZXQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UobmV4dENlbGwsIE1hdGgubWF4KHJvd09mZnNldCAtIDEsIDApLCBNYXRoLm1heChjb2xPZmZzZXQgLSAxLCAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gdHJ1ZSB8fCB0aGlzLl9vcHRzLm1lcmdlQ2VsbCA9PT0gJ2JvdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCByb3dPZmZzZXQgPiAxICYmIHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gJ3ZlcnRpY2FsJyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGNvbE9mZnNldCA+IDEgJiYgdGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSAnaG9yaXpvbnRhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MucmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICBybmcuZm9yRWFjaChjZWxsID0+IHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArIHJvd1BhZGRpbmcsIGNvbE9mZnNldCArIGNvbFBhZGRpbmcpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5mb3JFYWNoKGFGaWxsLmZvcm11bGFzLCBmID0+IHRoaXMuYXBwbHlGb3JtdWxhKGYsIGVudHJ5U2l6ZSwgbWFpbkNlbGwpKTtcblxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBmb3JtdWxhIGJlIHNoaWZ0aW5nIGFsbCB0aGUgZml4ZWQgb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNoaWZ0ZWQuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gb2Zmc2V0IFRoZSBvZmZzZXQgb2YgdGhlIHJlZmVyZW5jZWQgdGVtcGxhdGUgdG8gdGhlIGZvcm11bGEgb25lLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IHNpemUgVGhlIHNpemUgb2YgdGhlIHJhbmdlcyBhcyB0aGV5IHNob3VsZCBiZS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcHJvY2Vzc2VkIHRleHQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIHNpemUpIHtcbiAgICAgICAgbGV0IG5ld0Zvcm11bGEgPSAnJztcblxuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGZvcm11bGEubWF0Y2gocmVmUmVnRXhwKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIGJyZWFrO1xuXG4gICAgICAgICAgICBsZXQgZnJvbSA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsKG1hdGNoWzNdLCBtYXRjaFsyXSksXG4gICAgICAgICAgICAgICAgbmV3UmVmID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKG9mZnNldFswXSA+IDAgfHwgb2Zmc2V0WzFdID4gMClcbiAgICAgICAgICAgICAgICBmcm9tID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoZnJvbSwgb2Zmc2V0WzBdLCBvZmZzZXRbMV0pO1xuXG4gICAgICAgICAgICBuZXdSZWYgPSAhbWF0Y2hbNV1cbiAgICAgICAgICAgICAgICA/IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGZyb20sICEhbWF0Y2hbMl0pXG4gICAgICAgICAgICAgICAgOiB0aGlzLl9hY2Nlc3MucmFuZ2VSZWYodGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShmcm9tLCBzaXplWzBdLCBzaXplWzFdKSwgISFtYXRjaFsyXSk7XG5cbiAgICAgICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYS5zdWJzdHIoMCwgbWF0Y2guaW5kZXgpICsgbmV3UmVmO1xuICAgICAgICAgICAgZm9ybXVsYSA9IGZvcm11bGEuc3Vic3RyKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYTtcbiAgICAgICAgcmV0dXJuIG5ld0Zvcm11bGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZvcm11bGEgaW4gdGhlIHNoZWV0LCBpLmUuIGNoYW5naW5nIGl0IHRvIG1hdGNoIHRoZSBcbiAgICAgKiBzaXplcyBvZiB0aGUgcmVmZXJlbmNlcyB0ZW1wbGF0ZXMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyPn0gZW50cnlTaXplIFRoZSBmaWxsLXRvLXNpemUgbWFwLCBhcyBjb25zdHJ1Y3RlZCBzbyBmYXJcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gcHV0L3N0YXJ0IHRoaXMgZm9ybXVsYSBpbnRvXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlGb3JtdWxhKGFGaWxsLCBlbnRyeVNpemUsIGNlbGwpIHtcbiAgICAgICAgY2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKGNlbGwsIGFGaWxsLm9mZnNldFswXSwgYUZpbGwub2Zmc2V0WzFdKTtcblxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgaXRlciA9IF8udHJpbSh0ZW1wbGF0ZS5pdGVyYXRvcnNbMF0pLFxuICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZSh0ZW1wbGF0ZS5jZWxsLCBjZWxsKTtcbiAgICAgICAgICAgIFxuICAgICAgICBsZXQgZm9ybXVsYSA9IHRlbXBsYXRlLmV4dHJhY3RvciwgXG4gICAgICAgICAgICBybmc7XG4gICAgICAgICAgICBcbiAgICAgICAgYUZpbGwucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCBudWxsKTtcblxuICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMiAmJiBlbnRyeVNpemVbMV0gPCAyIHx8IGl0ZXIgPT09ICdib3RoJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ2NvbHMnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCAwLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAncm93cycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCBlbnRyeVNpemVbMV0gLSAxXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIDApO1xuICAgICAgICB9IGVsc2UgeyAvLyBpLmUuICdub25lJ1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxGb3JtdWxhKGNlbGwsIHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDFdKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0UmFuZ2VGb3JtdWxhKHJuZywgZm9ybXVsYSk7XG4gICAgfVxufVxuXG4vKipcbiAqIFRoZSBidWlsdC1pbiBhY2Nlc3NvciBiYXNlZCBvbiB4bHN4LXBvcHVsYXRlIG5wbSBtb2R1bGVcbiAqIEB0eXBlIHtYbHN4UG9wdWxhdGVBY2Nlc3N9XG4gKi9cblhsc3hEYXRhRmlsbC5YbHN4UG9wdWxhdGVBY2Nlc3MgPSByZXF1aXJlKCcuL1hsc3hQb3B1bGF0ZUFjY2VzcycpO1xuWGxzeERhdGFGaWxsLnZlcnNpb24gPSBcInt7VkVSU0lPTn19XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuLy8gY29uc3QgYWxsU3R5bGVzID0gW1xuLy8gICAgIFwiYm9sZFwiLCBcbi8vICAgICBcIml0YWxpY1wiLCBcbi8vICAgICBcInVuZGVybGluZVwiLCBcbi8vICAgICBcInN0cmlrZXRocm91Z2hcIiwgXG4vLyAgICAgXCJzdWJzY3JpcHRcIiwgXG4vLyAgICAgXCJzdXBlcnNjcmlwdFwiLCBcbi8vICAgICBcImZvbnRTaXplXCIsIFxuLy8gICAgIFwiZm9udEZhbWlseVwiLCBcbi8vICAgICBcImZvbnRHZW5lcmljRmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udFNjaGVtZVwiLCBcbi8vICAgICBcImZvbnRDb2xvclwiLCBcbi8vICAgICBcImhvcml6b250YWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJqdXN0aWZ5TGFzdExpbmVcIiwgXG4vLyAgICAgXCJpbmRlbnRcIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbEFsaWdubWVudFwiLCBcbi8vICAgICBcIndyYXBUZXh0XCIsIFxuLy8gICAgIFwic2hyaW5rVG9GaXRcIiwgXG4vLyAgICAgXCJ0ZXh0RGlyZWN0aW9uXCIsIFxuLy8gICAgIFwidGV4dFJvdGF0aW9uXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q291bnRlcmNsb2Nrd2lzZVwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENsb2Nrd2lzZVwiLCBcbi8vICAgICBcInJvdGF0ZVRleHRVcFwiLCBcbi8vICAgICBcInJvdGF0ZVRleHREb3duXCIsIFxuLy8gICAgIFwidmVydGljYWxUZXh0XCIsIFxuLy8gICAgIFwiZmlsbFwiLCBcbi8vICAgICBcImJvcmRlclwiLCBcbi8vICAgICBcImJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwiYm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyXCIsIFwicmlnaHRCb3JkZXJcIiwgXCJ0b3BCb3JkZXJcIiwgXCJib3R0b21Cb3JkZXJcIiwgXCJkaWFnb25hbEJvcmRlclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJDb2xvclwiLCBcInJpZ2h0Qm9yZGVyQ29sb3JcIiwgXCJ0b3BCb3JkZXJDb2xvclwiLCBcImJvdHRvbUJvcmRlckNvbG9yXCIsIFwiZGlhZ29uYWxCb3JkZXJDb2xvclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJTdHlsZVwiLCBcInJpZ2h0Qm9yZGVyU3R5bGVcIiwgXCJ0b3BCb3JkZXJTdHlsZVwiLCBcImJvdHRvbUJvcmRlclN0eWxlXCIsIFwiZGlhZ29uYWxCb3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImRpYWdvbmFsQm9yZGVyRGlyZWN0aW9uXCIsIFxuLy8gICAgIFwibnVtYmVyRm9ybWF0XCJcbi8vIF07XG5cbmxldCBfUmljaFRleHQgPSBudWxsO1xuXG4vKipcbiAqIGB4c2x4LXBvcHVsYXRlYCBsaWJyYXJ5IGJhc2VkIGFjY2Vzc29yIHRvIGEgZ2l2ZW4gRXhjZWwgd29ya2Jvb2suIEFsbCB0aGVzZSBtZXRob2RzIGFyZSBpbnRlcm5hbGx5IHVzZWQgYnkge0BsaW5rIFhsc3hEYXRhRmlsbH0sIFxuICogYnV0IGNhbiBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciBpbXBsZW1lbnRpbmcgY3VzdG9tIHNwcmVhZHNoZWV0IGFjY2Vzc29ycy5cbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIHRodXNcbiAgICAgKiBhdm9pZGluZyBtYWtpbmcgdGhlIGB4bHN4LWRhdGFmaWxsYCBwYWNrYWdlIGEgZGVwZW5kZW5jeS5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3b3JrYm9vaywgWGxzeFBvcHVsYXRlKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rID0gd29ya2Jvb2s7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgXG4gICAgICAgIF9SaWNoVGV4dCA9IFhsc3hQb3B1bGF0ZS5SaWNoVGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb25maWd1cmVkIHdvcmtib29rIGZvciBkaXJlY3QgWGxzeFBvcHVsYXRlIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7V29ya2Jvb2t9IFRoZSB3b3JrYm9vayBpbnZvbHZlZC5cbiAgICAgKi9cbiAgICB3b3JrYm9vaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtib29rOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGNlbGwncyBjb250ZW50cy5cbiAgICAgKi9cbiAgICBjZWxsVmFsdWUoY2VsbCkge1xuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0ID8gdGhlVmFsdWUudGV4dCgpIDogdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHJlcXVlc3RlZCB2YWx1ZSBmb3Igc2V0dGluZy5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBFaXRoZXIgdGhlIHJlcXVlc3RlZCB2YWx1ZSBvciBjaGFpbmFibGUgdGhpcy5cbiAgICAgKi9cbiAgICBzZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC52YWx1ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHR5cGUgb2YgdGhlIGNlbGwgLSAnZm9ybXVsYScsICdyaWNodGV4dCcsIFxuICAgICAqICd0ZXh0JywgJ251bWJlcicsICdkYXRlJywgJ2h5cGVybGluaycsIG9yICd1bmtub3duJztcbiAgICAgKi9cbiAgICBjZWxsVHlwZShjZWxsKSB7XG4gICAgICAgIGlmIChjZWxsLmZvcm11bGEoKSlcbiAgICAgICAgICAgIHJldHVybiAnZm9ybXVsYSc7XG4gICAgICAgIGVsc2UgaWYgKGNlbGwuaHlwZXJsaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2h5cGVybGluayc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0KVxuICAgICAgICAgICAgcmV0dXJuICdyaWNodGV4dCc7XG4gICAgICAgIGVsc2UgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcbiAgICAgICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGZvcm11bGEgaW4gdGhlIGNlbGxcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybXVsYSAtIHRoZSB0ZXh0IG9mIHRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0Q2VsbEZvcm11bGEoY2VsbCwgZm9ybXVsYSkge1xuICAgICAgICBjZWxsLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZWFzdXJlcyB0aGUgZGlzdGFuY2UsIGFzIGEgdmVjdG9yIGJldHdlZW4gdHdvIGdpdmVuIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZnJvbSBUaGUgZmlyc3QgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHRvIFRoZSBzZWNvbmQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBjZWxscy5cbiAgICAgKi9cbiAgICBjZWxsRGlzdGFuY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRvLnJvd051bWJlcigpIC0gZnJvbS5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIHRvLmNvbHVtbk51bWJlcigpIC0gZnJvbS5jb2x1bW5OdW1iZXIoKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgdGhlIHNpemUgb2YgY2VsbCwgdGFraW5nIGludG8gYWNjb3VudCBpZiBpdCBpcyBwYXJ0IG9mIGEgbWVyZ2VkIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBvY2N1cGllZCBzaXplLlxuICAgICAqL1xuICAgIGNlbGxTaXplKGNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbEFkZHIgPSBjZWxsLmFkZHJlc3MoKTtcbiAgICAgICAgbGV0IHRoZVNpemUgPSBbMSwgMV07XG4gICAgXG4gICAgICAgIF8uZm9yRWFjaChjZWxsLnNoZWV0KCkuX21lcmdlQ2VsbHMsIHJhbmdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQWRkciA9IHJhbmdlLmF0dHJpYnV0ZXMucmVmLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChyYW5nZUFkZHJbMF0gPT0gY2VsbEFkZHIpIHtcbiAgICAgICAgICAgICAgICB0aGVTaXplID0gdGhpcy5jZWxsRGlzdGFuY2UoY2VsbCwgY2VsbC5zaGVldCgpLmNlbGwocmFuZ2VBZGRyWzFdKSk7XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzBdO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhlU2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmFtZWQgc3R5bGUgb2YgYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgc3R5bGUgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIGZvciB0aGlzIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRDZWxsU3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2VsbC5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgcmVmZXJlbmNlIHN0cmluZyBmb3IgYSBjZWxsIGlkZW50aWZpZWQgYnkgQHBhcmFtIGFkciwgZnJvbSB0aGUgQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgY2VsbCB0aGF0IGlzIGEgYmFzZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZHIgVGhlIGFkZHJlc3Mgb2YgdGhlIHRhcmdldCBjZWxsLCBhcyBtZW50aW9uZWQgaW4gQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSByZWZlcmVuY2Ugc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0YXJnZXQgY2VsbCB1bmlxdWVseS5cbiAgICAgKi9cbiAgICBidWlsZFJlZihjZWxsLCBhZHIsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYSBnaXZlbiBjZWxsIGZyb20gYSBnaXZlbiBzaGVldCAob3IgYW4gYWN0aXZlIG9uZSkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBhZGRyZXNzIFRoZSBjZWxsIGFkcmVzcyB0byBiZSB1c2VkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8aWR4fSBzaGVldElkIFRoZSBpZC9uYW1lIG9mIHRoZSBzaGVldCB0byByZXRyaWV2ZSB0aGUgY2VsbCBmcm9tLiBEZWZhdWx0cyB0byBhbiBhY3RpdmUgb25lLlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBBIHJlZmVyZW5jZSB0byB0aGUgcmVxdWlyZWQgY2VsbC5cbiAgICAgKi9cbiAgICBnZXRDZWxsKGFkZHJlc3MsIHNoZWV0SWQpIHtcbiAgICAgICAgY29uc3QgdGhlU2hlZXQgPSBzaGVldElkID09IG51bGwgPyB0aGlzLl93b3JrYm9vay5hY3RpdmVTaGVldCgpIDogdGhpcy5fd29ya2Jvb2suc2hlZXQoc2hlZXRJZCk7XG4gICAgICAgIHJldHVybiB0aGVTaGVldC5jZWxsKGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYW5kIHJldHVybnMgdGhlIHJhbmdlIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIGNlbGwgYW5kIHNwYXduaW5nIGdpdmVuIHJvd3MgYW5kIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHJvd09mZnNldCBOdW1iZXIgb2Ygcm93cyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSByb3cuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvbE9mZnNldCBOdW1iZXIgb2YgY29sdW1ucyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSBjb2x1bW4uXG4gICAgICogQHJldHVybnMge1JhbmdlfSBUaGUgY29uc3RydWN0ZWQgcmFuZ2UuXG4gICAgICovXG4gICAgZ2V0Q2VsbFJhbmdlKGNlbGwsIHJvd09mZnNldCwgY29sT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJhbmdlVG8oY2VsbC5yZWxhdGl2ZUNlbGwocm93T2Zmc2V0LCBjb2xPZmZzZXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBjZWxsIGF0IGEgY2VydGFpbiBvZmZzZXQgZnJvbSBhIGdpdmVuIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHJlZmVyZW5jZSBjZWxsIHRvIG1ha2UgdGhlIG9mZnNldCBmcm9tLlxuICAgICAqIEBwYXJhbSB7aW50fSByb3dzIE51bWJlciBvZiByb3dzIHRvIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge2ludH0gY29scyBOdW1iZXIgb2YgY29sdW1ucyB0byBvZmZzZXQuXG4gICAgICogQHJldHVybnMge0NlbGx9IFRoZSByZXN1bHRpbmcgY2VsbC5cbiAgICAgKi9cbiAgICBvZmZzZXRDZWxsKGNlbGwsIHJvd3MsIGNvbHMpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmVsYXRpdmVDZWxsKHJvd3MsIGNvbHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lcmdlIG9yIHNwbGl0IHJhbmdlIG9mIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdHVzIFRoZSBtZXJnZWQgc3RhdHVzIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICByYW5nZU1lcmdlZChyYW5nZSwgc3RhdHVzKSB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5tZXJnZWQoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIGZvcm11bGEgZm9yIHRoZSB3aG9sZSByYW5nZS4gSWYgaXQgY29udGFpbnMgb25seSBvbmUgLSBpdCBpcyBzZXQgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHNldFJhbmdlRm9ybXVsYShyYW5nZSwgZm9ybXVsYSkge1xuICAgICAgICByYW5nZS5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBnaXZlbiByYW5nZS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2Ugd2hpY2ggYWRkcmVzcyB3ZSdyZSBpbnRlcmVzdGVkIGluLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSBzaGVldCBuYW1lIGluIHRoZSBhZGRyZXNzLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiByYW5nZS5cbiAgICAgKi9cbiAgICByYW5nZVJlZihyYW5nZSwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiByYW5nZS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGhlUmFuZ2UgPSBzaGVldC51c2VkUmFuZ2UoKTtcbiAgICAgICAgICAgIGlmICh0aGVSYW5nZSkgXG4gICAgICAgICAgICAgICAgdGhlUmFuZ2UuZm9yRWFjaChjYik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmICghc3JjIHx8ICFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCAnc3JjJyBvciAnZGVzdCcgZm9yIGNvcHlTdHlsZSgpIVwiKTtcbiAgICAgICAgaWYgKHNyYyA9PSBkZXN0KSByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG5cbiAgICAgICAgY29uc3QgZGVzdFNoZWV0SWQgPSBkZXN0LnNoZWV0KCkubmFtZSgpLFxuICAgICAgICAgICAgcm93SWQgPSBgJyR7ZGVzdFNoZWV0SWR9Jzoke2Rlc3Qucm93TnVtYmVyKCl9YCxcbiAgICAgICAgICAgIGNvbElkID0gYCcke2Rlc3RTaGVldElkfSc6JHtkZXN0LmNvbHVtbk51bWJlcigpfWA7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvd1NpemVzW3Jvd0lkXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93SWRdID0gc3JjLnJvdygpLmhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9jb2xTaXplc1tjb2xJZF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3QuY29sdW1uKCkud2lkdGgodGhpcy5fY29sU2l6ZXNbY29sSWRdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
