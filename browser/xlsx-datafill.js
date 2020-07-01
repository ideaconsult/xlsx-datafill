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
  duplicateCells: false,
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
   * @param {string|boolean} opts.duplicateCells Whether to duplicate the content of higher dimension cells, when not merged. Default is false.
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

            if (_this7._opts.mergeCells === true || _this7._opts.mergeCell === 'both' || rowOffset > 1 && _this7._opts.mergeCells === 'vertical' || colOffset > 1 && _this7._opts.mergeCells === 'horizontal') _this7._access.rangeMerged(rng, true);else if (_this7._opts.duplicateCells === true || _this7._opts.duplicateCells === 'both' || rowOffset > 1 && _this7._opts.duplicateCells === 'vertical' || colOffset > 1 && _this7._opts.duplicateCells === 'horizontal') _this7._access.duplicateCell(nextCell, rng);
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
XlsxDataFill.version = "1.0.2";
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
     * Duplicates a cell across a given range.
     * @param {Cell} cell Cell, which needs duplicating.
     * @param {Range} range The range, as returned from {@link getCellRange}
     * @returns {XlsxPopulateAccess} For chain invokes.
     */

  }, {
    key: "duplicateCell",
    value: function duplicateCell(cell, range) {
      range.value(cell.value());
      return this;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxjQUFjLEVBQUUsS0FOQTtBQU9oQixFQUFBLFNBQVMsRUFBRSxJQVBLO0FBUWhCLEVBQUEsWUFBWSxFQUFFO0FBQ1YsUUFBSSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxDQUFKO0FBQUEsS0FERTtBQUVWLElBQUEsQ0FBQyxFQUFFLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULENBQUo7QUFBQTtBQUZHO0FBUkUsQ0FBcEI7QUFjQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLHdCQUFZLFFBQVosRUFBc0IsSUFBdEIsRUFBNEI7QUFBQTs7QUFDeEIsU0FBSyxLQUFMLEdBQWEsRUFBQyxDQUFDLFlBQUYsQ0FBZSxFQUFmLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLENBQWI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLE9BQUwsR0FBZSxRQUFmO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs0QkFNUSxPLEVBQVM7QUFDYixVQUFJLE9B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ZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiAvXFx7XFx7KFtefV0qKVxcfVxcfS8sXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIG1lcmdlQ2VsbHM6IHRydWUsXG4gICAgZHVwbGljYXRlQ2VsbHM6IGZhbHNlLFxuICAgIGZvbGxvd0Zvcm11bGFlOiBmYWxzZSxcbiAgICBjb3B5U3R5bGU6IHRydWUsXG4gICAgY2FsbGJhY2tzTWFwOiB7XG4gICAgICAgICcnOiBkYXRhID0+IF8ua2V5cyhkYXRhKSxcbiAgICAgICAgJDogZGF0YSA9PiBfLnZhbHVlcyhkYXRhKVxuICAgIH1cbn07XG5cbmNvbnN0IHJlZlJlZ0V4cCA9IC8oJz8oW14hXSopPyc/ISk/KFtBLVpdK1xcZCspKDooW0EtWl0rXFxkKykpPy87XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZSwgdGFraW5nIGFuIGluc3RhbmNlIG9mIEV4Y2VsIHNoZWV0IGFjY2Vzc29yIGFuZCBhIEpTT04gb2JqZWN0IGFzIGRhdGEsIGFuZCBmaWxsaW5nIHRoZSB2YWx1ZXMgZnJvbSB0aGUgbGF0dGVyIGludG8gdGhlIGZvcm1lci5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggc3ByZWFkc2hlZXQgYWNjZXNzaW5nIGNsYXNzLlxuICAgICAqIEBwYXJhbSB7e319IG9wdHMgT3B0aW9ucyB0byBiZSB1c2VkIGR1cmluZyBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBvcHRzLnRlbXBsYXRlUmVnRXhwIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCBmb3IgdGVtcGxhdGUgcmVjb2duaXppbmcuIFxuICAgICAqIERlZmF1bHQgaXMgYC9cXHtcXHsoW159XSopXFx9XFx9L2AsIGkuZS4gTXVzdGFjaGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZmllbGRTcGxpdHRlciBUaGUgc3RyaW5nIHRvIGJlIGV4cGVjdGVkIGFzIHRlbXBsYXRlIGZpZWxkIHNwbGl0dGVyLiBEZWZhdWx0IGlzIGB8YC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5qb2luVGV4dCBUaGUgc3RyaW5nIHRvIGJlIHVzZWQgd2hlbiB0aGUgZXh0cmFjdGVkIHZhbHVlIGZvciBhIHNpbmdsZSBjZWxsIGlzIGFuIGFycmF5LCBcbiAgICAgKiBhbmQgaXQgbmVlZHMgdG8gYmUgam9pbmVkLiBEZWZhdWx0IGlzIGAsYC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xib29sZWFufSBvcHRzLm1lcmdlQ2VsbHMgV2hldGhlciB0byBtZXJnZSB0aGUgaGlnaGVyIGRpbWVuc2lvbiBjZWxscyBpbiB0aGUgb3V0cHV0LiBEZWZhdWx0IGlzIHRydWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gb3B0cy5kdXBsaWNhdGVDZWxscyBXaGV0aGVyIHRvIGR1cGxpY2F0ZSB0aGUgY29udGVudCBvZiBoaWdoZXIgZGltZW5zaW9uIGNlbGxzLCB3aGVuIG5vdCBtZXJnZWQuIERlZmF1bHQgaXMgZmFsc2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRzLmZvbGxvd0Zvcm11bGFlIElmIGEgdGVtcGxhdGUgaXMgbG9jYXRlZCBhcyBhIHJlc3VsdCBvZiBhIGZvcm11bGEsIHdoZXRoZXIgdG8gc3RpbGwgcHJvY2VzcyBpdC5cbiAgICAgKiBEZWZhdWx0IGlzIGZhbHNlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5jb3B5U3R5bGUgQ29weSB0aGUgc3R5bGUgb2YgdGhlIHRlbXBsYXRlIGNlbGwgd2hlbiBwb3B1bGF0aW5nLiBFdmVuIHdoZW4gYGZhbHNlYCwgdGhlIHRlbXBsYXRlXG4gICAgICogc3R5bGluZyBfaXNfIGFwcGxpZWQuIERlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgYW5kIHZhbHVlIGV4dHJhY3Rpb24uXG4gICAgICogVGhlcmUgaXMgb25lIGRlZmF1bHQgLSB0aGUgZW1wdHkgb25lLCBmb3Igb2JqZWN0IGtleSBleHRyYWN0aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFjY2Vzc29yLCBvcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHMgPSBfLmRlZmF1bHRzRGVlcCh7fSwgb3B0cywgZGVmYXVsdE9wdHMpO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9hY2Nlc3MgPSBhY2Nlc3NvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXR0ZXIvZ2V0dGVyIGZvciBYbHN4RGF0YUZpbGwncyBvcHRpb25zIGFzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uLlxuICAgICAqIEBwYXJhbSB7e318bnVsbH0gbmV3T3B0cyBJZiBzZXQgLSB0aGUgbmV3IG9wdGlvbnMgdG8gYmUgdXNlZC4gXG4gICAgICogQHNlZSB7QGNvbnN0cnVjdG9yfS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfHt9fSBUaGUgcmVxdWlyZWQgb3B0aW9ucyAoaW4gZ2V0dGVyIG1vZGUpIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0dGVyIG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3Igd2hvbGUgZGF0YSBwb3B1bGF0aW9uIG1lY2hhbmlzbS5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIHRvIGJlIGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbH0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgZmlsbERhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBkYXRhRmlsbHMgPSB7fTtcblx0XG4gICAgICAgIC8vIEJ1aWxkIHRoZSBkZXBlbmRlbmN5IGNvbm5lY3Rpb25zIGJldHdlZW4gdGVtcGxhdGVzLlxuICAgICAgICB0aGlzLmNvbGxlY3RUZW1wbGF0ZXModGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYUZpbGwgPSB7ICBcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsIFxuICAgICAgICAgICAgICAgIGRlcGVuZGVudHM6IFtdLFxuICAgICAgICAgICAgICAgIGZvcm11bGFzOiBbXSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmRmlsbCA9IGRhdGFGaWxsc1t0ZW1wbGF0ZS5yZWZlcmVuY2VdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcmVmRmlsbCkgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSByZWZlcmVuY2UgJyR7dGVtcGxhdGUucmVmZXJlbmNlfSchYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLmZvcm11bGEpIFxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmZvcm11bGFzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgIFxuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFGaWxsc1t0ZW1wbGF0ZS5pZF0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsbC5wcm9jZXNzZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZWxzZSBpZiAoZmlsbC50ZW1wbGF0ZS5mb3JtdWxhKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXJlZmVyZW5jaW5nIGZvcm11bGEgZm91bmQgJyR7ZmlsbC5leHRyYWN0b3J9Jy4gVXNlIGEgbm9uLXRlbXBsYXRlZCBvbmUhYCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbGwoZmlsbCwgZGF0YSwgZmlsbC50ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBwcm92aWRlZCBoYW5kbGVyIGZyb20gdGhlIG1hcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGFuZGxlck5hbWUgVGhlIG5hbWUgb2YgdGhlIGhhbmRsZXIuXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgaGFuZGxlciBmdW5jdGlvbiBpdHNlbGYuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldEhhbmRsZXIoaGFuZGxlck5hbWUpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlckZuID0gdGhpcy5fb3B0cy5jYWxsYmFja3NNYXBbaGFuZGxlck5hbWVdO1xuXG4gICAgICAgIGlmICghaGFuZGxlckZuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgY2Fubm90IGJlIGZvdW5kIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaGFuZGxlckZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgaXMgbm90IGEgZnVuY3Rpb24hYCk7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlckZuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpIHtcbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RQYXJ0cyA9IGV4dHJhY3Rvci5zcGxpdChcIjpcIiksXG4gICAgICAgICAgICBoYW5kbGVyTmFtZSA9IF8udHJpbShleHRyYWN0UGFydHNbMV0pO1xuXG4gICAgICAgIHJldHVybiBleHRyYWN0UGFydHMubGVuZ3RoID09IDFcbiAgICAgICAgICAgID8geyBwYXRoOiBleHRyYWN0b3IsIGhhbmRsZXI6IG51bGwgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgcGF0aDogXy50cmltKGV4dHJhY3RQYXJ0c1swXSksXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogdGhpcy5nZXRIYW5kbGVyKGhhbmRsZXJOYW1lKVxuICAgICAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBzdHlsZSBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSBvbnRvIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGRlc3RpbmF0aW9uIGNlbGwgdG8gYXBwbHkgc3R5bGluZyB0by5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIGNodW5rIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRvIGJlIHVzZWQgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7RGF0YUZpbGxlcn0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcblxuICAgICAgICBpZiAodGhpcy5fb3B0cy5jb3B5U3R5bGUpXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFN0eWxlKGNlbGwsIHBhaXIubmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgY29udGVudHMgb2YgdGhlIGNlbGwgaW50byBhIHZhbGlkIHRlbXBsYXRlIGluZm8uXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIGNvbnRhaW5pbmcgdGhlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBwYXJzZWQgdGVtcGxhdGUuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGJ1aWxkcyB0ZW1wbGF0ZSBpbmZvLCB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBzdXBwbGllZCBvcHRpb25zLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwpO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZU1hdGNoID0gdmFsdWUubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIGlmICghcmVNYXRjaCB8fCAhdGhpcy5fb3B0cy5mb2xsb3dGb3JtdWxhZSAmJiB0aGlzLl9hY2Nlc3MuY2VsbFR5cGUoY2VsbCkgPT09ICdmb3JtdWxhJykgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpLFxuICAgICAgICAgICAgZXh0cmFjdG9yID0gcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGxSZWYgPSB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICcke3JlTWF0Y2hbMF19J2ApO1xuICAgICAgICBpZiAoISFwYXJ0c1swXSAmJiAhY2VsbFJlZilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWZlcmVuY2UgcGFzc2VkOiAnJHtwYXJ0c1swXX0nYCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiB0aGlzLl9hY2Nlc3MuY2VsbFJlZihjZWxsKSxcbiAgICAgICAgICAgIHJlZmVyZW5jZTogY2VsbFJlZixcbiAgICAgICAgICAgIGl0ZXJhdG9yczogcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBleHRyYWN0b3I6IGV4dHJhY3RvcixcbiAgICAgICAgICAgIGZvcm11bGE6IGV4dHJhY3Rvci5zdGFydHNXaXRoKFwiPVwiKSxcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgc29ydFRlbXBsYXRlcyhsaXN0KSB7XG4gICAgICAgIGNvbnN0IHNvcnRlZCA9IFtdLFxuICAgICAgICAgICAgcmVsYXRlZCA9IHt9LFxuICAgICAgICAgICAgbWFwID0ge30sXG4gICAgICAgICAgICBmcmVlTGlzdCA9IFtdO1xuXG4gICAgICAgIC8vIEZpcnN0LCBtYWtlIHRoZSBkZXBlbmRlbmN5IG1hcCBhbmQgYWRkIHRoZSBsaXN0IG9mIG5vbi1yZWZlcmVuY2luZyB0ZW1wbGF0ZXNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gbGlzdFtpXTtcbiAgICAgICAgICAgIG1hcFt0LmlkXSA9IGk7XG5cbiAgICAgICAgICAgIGlmICghdC5yZWZlcmVuY2UpXG4gICAgICAgICAgICAgICAgZnJlZUxpc3QucHVzaCh0LmlkKTtcbiAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgKHJlbGF0ZWRbdC5yZWZlcmVuY2VdID0gcmVsYXRlZFt0LnJlZmVyZW5jZV0gfHwgW10pLnB1c2godC5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3csIG1ha2UgdGhlIGFjdHVhbCBzb3J0aW5nLlxuICAgICAgICB3aGlsZSAoZnJlZUxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaWQgPSBmcmVlTGlzdC5zaGlmdCgpLFxuICAgICAgICAgICAgICAgIHQgPSBsaXN0W21hcFtpZF1dO1xuXG4gICAgICAgICAgICBzb3J0ZWQucHVzaCh0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gV2UgdXNlIHRoZSBmYWN0IHRoYXQgdGhlcmUgaXMgYSBzaW5nbGUgcHJlZGVjZXNzb3IgaW4gb3VyIHNldHVwLlxuICAgICAgICAgICAgaWYgKHJlbGF0ZWRbdC5pZF0pXG4gICAgICAgICAgICAgICAgZnJlZUxpc3QucHVzaCguLi5yZWxhdGVkW3QuaWRdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzb3J0ZWQubGVuZ3RoIDwgbGlzdC5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEEgcmVmZXJlbmNlIGN5Y2xlIGZvdW5kLCBpbnZvbHZpbmcgXCIke18ubWFwKF8ueG9yKGxpc3QsIHNvcnRlZCksICdpZCcpLmpvaW4oJywnKX1cIiFgKTtcblxuICAgICAgICByZXR1cm4gc29ydGVkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgd2hvbGUgd29ya2Jvb2sgZm9yIHRlbXBsYXRlIHBhdHRlcm4gYW5kIGNvbnN0cnVjdHMgdGhlIHRlbXBsYXRlcyBmb3IgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBvbiBlYWNoIHRlbXBsYXRlZCwgYWZ0ZXIgdGhleSBhcmUgc29ydGVkLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZW1wbGF0ZXMgY29sbGVjdGVkIGFyZSBzb3J0ZWQsIGJhc2VkIG9uIHRoZSBpbnRyYS10ZW1wbGF0ZSByZWZlcmVuY2UgLSBpZiBvbmUgdGVtcGxhdGVcbiAgICAgKiBpcyByZWZlcnJpbmcgYW5vdGhlciBvbmUsIGl0J2xsIGFwcGVhciBfbGF0ZXJfIGluIHRoZSByZXR1cm5lZCBhcnJheSwgdGhhbiB0aGUgcmVmZXJyZWQgdGVtcGxhdGUuXG4gICAgICogVGhpcyBpcyB0aGUgb3JkZXIgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGludm9rZWQgb24uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5zb3J0VGVtcGxhdGVzKGFsbFRlbXBsYXRlcykuZm9yRWFjaChjYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgdGhlIHZhbHVlKHMpIGZyb20gdGhlIHByb3ZpZGVkIGRhdGEgYHJvb3RgIHRvIGJlIHNldCBpbiB0aGUgcHJvdmlkZWQgYGNlbGxgLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSBleHRyYWN0ZWQgdmFsdWVzIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgZXh0cmFjdGlvbiBzdHJpbmcgcHJvdmlkZWQgYnkgdGhlIHRlbXBsYXRlLiBVc3VhbGx5IGEgSlNPTiBwYXRoIHdpdGhpbiB0aGUgZGF0YSBgcm9vdGAuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgcmVmZXJlbmNlIGNlbGwsIGlmIHN1Y2ggZXhpc3RzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVtYmVyfERhdGV8QXJyYXl8QXJyYXkuPEFycmF5LjwqPj59IFRoZSB2YWx1ZSB0byBiZSB1c2VkLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBpcyB1c2VkIGV2ZW4gd2hlbiBhIHdob2xlIC0gcG9zc2libHkgcmVjdGFuZ3VsYXIgLSByYW5nZSBpcyBhYm91dCB0byBiZSBzZXQsIHNvIGl0IGNhblxuICAgICAqIHJldHVybiBhbiBhcnJheSBvZiBhcnJheXMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3RWYWx1ZXMocm9vdCwgZXh0cmFjdG9yLCBjZWxsKSB7XG4gICAgICAgIGNvbnN0IHsgcGF0aCwgaGFuZGxlciB9ID0gdGhpcy5wYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShyb290KSlcbiAgICAgICAgICAgIHJvb3QgPSBfLmdldChyb290LCBwYXRoLCByb290KTtcbiAgICAgICAgZWxzZSBpZiAocm9vdC5zaXplcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcm9vdCA9ICFleHRyYWN0b3IgPyByb290IDogXy5tYXAocm9vdCwgZW50cnkgPT4gdGhpcy5leHRyYWN0VmFsdWVzKGVudHJ5LCBleHRyYWN0b3IsIGNlbGwpKTtcbiAgICAgICAgZWxzZSBpZiAoIWhhbmRsZXIpXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5qb2luKHRoaXMuX29wdHMuam9pblRleHQgfHwgXCIsXCIpO1xuXG4gICAgICAgIHJldHVybiAhaGFuZGxlciA/IHJvb3QgOiBoYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgcm9vdCwgY2VsbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgYW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBkYXRhIGZvciB0aGUgZ2l2ZW4gZmlsbCwgYmFzZWQgb24gdGhlIGdpdmVuXG4gICAgICogcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgbWFpbiByZWZlcmVuY2Ugb2JqZWN0IHRvIGFwcGx5IGl0ZXJhdG9ycyB0by5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpdGVyYXRvcnMgTGlzdCBvZiBpdGVyYXRvcnMgLSBzdHJpbmcgSlNPTiBwYXRocyBpbnNpZGUgdGhlIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggVGhlIGluZGV4IGluIHRoZSBpdGVyYXRvcnMgYXJyYXkgdG8gd29yayBvbi5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8QXJyYXkuPEFycmF5Pn0gQW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBleHRyYWN0ZWQgZGF0YS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdERhdGEocm9vdCwgaXRlcmF0b3JzLCBpZHgpIHtcbiAgICAgICAgbGV0IGl0ZXIgPSBpdGVyYXRvcnNbaWR4XSxcbiAgICAgICAgICAgIHNpemVzID0gW10sXG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gZmFsc2UsXG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoaXRlciA9PSAnMScpIHtcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgaXRlciA9IGl0ZXJhdG9yc1srK2lkeF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWl0ZXIpIHJldHVybiByb290O1xuXG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBwYXJzZWRJdGVyID0gdGhpcy5wYXJzZUV4dHJhY3RvcihpdGVyKTtcblxuICAgICAgICBkYXRhID0gXy5nZXQocm9vdCwgcGFyc2VkSXRlci5wYXRoLCByb290KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcGFyc2VkSXRlci5oYW5kbGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgZGF0YSA9IHBhcnNlZEl0ZXIuaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIGRhdGEpO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgZWxzZSBpZiAoaWR4IDwgaXRlcmF0b3JzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBfLm1hcChkYXRhLCBpblJvb3QgPT4gdGhpcy5leHRyYWN0RGF0YShpblJvb3QsIGl0ZXJhdG9ycywgaWR4ICsgMSkpO1xuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhWzBdLnNpemVzIHx8IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKCFjZWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCByZWZlcmVuY2UgY2VsbCBpbiAncHV0VmFsdWVzKCknIVwiKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gZGF0YS5zaXplcyxcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHRlbXBsYXRlLmV4dHJhY3RvciwgY2VsbCk7XG5cbiAgICAgICAgLy8gaWYgd2UndmUgY29tZSB1cCB3aXRoIGEgcmF3IGRhdGFcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAhZW50cnlTaXplIHx8ICFlbnRyeVNpemUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFZhbHVlKGNlbGwsIHZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgZW50cnlTaXplID0gdGVtcGxhdGUuY2VsbFNpemU7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA8PSAyKSB7XG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgdGhlIHNpemUgYW5kIGRhdGEuXG4gICAgICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IFsxLCAtZW50cnlTaXplWzBdXTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gZW50cnlTaXplLmNvbmNhdChbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gXy5jaHVuayh2YWx1ZSwgMSk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IF8uY2h1bmsoZGF0YSwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSkuZm9yRWFjaCgoY2VsbCwgcmksIGNpKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZVtyaV1bY2ldKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGFbcmldW2NpXSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZXMgZXh0cmFjdGVkIHdpdGggJyR7dGVtcGxhdGUuZXh0cmFjdG9yfScgYXJlIG1vcmUgdGhhbiAyIGRpbWVuc2lvbiEnYCk7XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZmlsdGVyIG9udG8gdGhlIHNoZWV0IC0gZXh0cmFjdGluZyB0aGUgcHJvcGVyIGRhdGEsIGZvbGxvd2luZyBkZXBlbmRlbnQgZmlsbHMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RmlsbChhRmlsbCwgcm9vdCwgbWFpbkNlbGwpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHRoZURhdGEgPSB0aGlzLmV4dHJhY3REYXRhKHJvb3QsIHRlbXBsYXRlLml0ZXJhdG9ycywgMCk7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IFsxLCAxXTtcblxuICAgICAgICBpZiAoIWFGaWxsLmRlcGVuZGVudHMgfHwgIWFGaWxsLmRlcGVuZGVudHMubGVuZ3RoKVxuICAgICAgICAgICAgZW50cnlTaXplID0gdGhpcy5wdXRWYWx1ZXMobWFpbkNlbGwsIHRoZURhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV4dENlbGwgPSBtYWluQ2VsbDtcbiAgICAgICAgICAgIGNvbnN0IHNpemVNYXh4ZXIgPSAodmFsLCBpZHgpID0+IGVudHJ5U2l6ZVtpZHhdID0gTWF0aC5tYXgoZW50cnlTaXplW2lkeF0sIHZhbCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgdGhlRGF0YS5sZW5ndGg7ICsrZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluUm9vdCA9IHRoZURhdGFbZF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmID0gMDsgZiA8IGFGaWxsLmRlcGVuZGVudHMubGVuZ3RoOyArK2YpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5GaWxsID0gYUZpbGwuZGVwZW5kZW50c1tmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluQ2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCBpbkZpbGwub2Zmc2V0WzBdLCBpbkZpbGwub2Zmc2V0WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdLFxuICAgICAgICAgICAgICAgICAgICByb3dQYWRkaW5nID0gdGVtcGxhdGUucGFkZGluZ1swXSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBjb2xQYWRkaW5nID0gdGVtcGxhdGUucGFkZGluZ1sxXSB8fCAwO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUucGFkZGluZy5sZW5ndGggPCAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29sUGFkZGluZyA9IHJvd1BhZGRpbmc7XG4gICAgICAgICAgICAgICAgICAgIHJvd09mZnNldCA9IHJvd1BhZGRpbmcgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhlRGF0YS5zaXplcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGNvbFBhZGRpbmcgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMF0gPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyb3dPZmZzZXQgPiAxIHx8IGNvbE9mZnNldCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShuZXh0Q2VsbCwgTWF0aC5tYXgocm93T2Zmc2V0IC0gMSwgMCksIE1hdGgubWF4KGNvbE9mZnNldCAtIDEsIDApKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSB0cnVlIHx8IHRoaXMuX29wdHMubWVyZ2VDZWxsID09PSAnYm90aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IHJvd09mZnNldCA+IDEgJiYgdGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSAndmVydGljYWwnIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29sT2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09ICdob3Jpem9udGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5yYW5nZU1lcmdlZChybmcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLl9vcHRzLmR1cGxpY2F0ZUNlbGxzID09PSB0cnVlIHx8IHRoaXMuX29wdHMuZHVwbGljYXRlQ2VsbHMgPT09ICdib3RoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgcm93T2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLmR1cGxpY2F0ZUNlbGxzID09PSAndmVydGljYWwnIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29sT2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLmR1cGxpY2F0ZUNlbGxzID09PSAnaG9yaXpvbnRhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZHVwbGljYXRlQ2VsbChuZXh0Q2VsbCwgcm5nKTtcblxuICAgICAgICAgICAgICAgICAgICBybmcuZm9yRWFjaChjZWxsID0+IHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArIHJvd1BhZGRpbmcsIGNvbE9mZnNldCArIGNvbFBhZGRpbmcpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5mb3JFYWNoKGFGaWxsLmZvcm11bGFzLCBmID0+IHRoaXMuYXBwbHlGb3JtdWxhKGYsIGVudHJ5U2l6ZSwgbWFpbkNlbGwpKTtcblxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBmb3JtdWxhIGJlIHNoaWZ0aW5nIGFsbCB0aGUgZml4ZWQgb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNoaWZ0ZWQuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gb2Zmc2V0IFRoZSBvZmZzZXQgb2YgdGhlIHJlZmVyZW5jZWQgdGVtcGxhdGUgdG8gdGhlIGZvcm11bGEgb25lLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IHNpemUgVGhlIHNpemUgb2YgdGhlIHJhbmdlcyBhcyB0aGV5IHNob3VsZCBiZS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcHJvY2Vzc2VkIHRleHQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIHNpemUpIHtcbiAgICAgICAgbGV0IG5ld0Zvcm11bGEgPSAnJztcblxuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGZvcm11bGEubWF0Y2gocmVmUmVnRXhwKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIGJyZWFrO1xuXG4gICAgICAgICAgICBsZXQgZnJvbSA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsKG1hdGNoWzNdLCBtYXRjaFsyXSksXG4gICAgICAgICAgICAgICAgbmV3UmVmID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKG9mZnNldFswXSA+IDAgfHwgb2Zmc2V0WzFdID4gMClcbiAgICAgICAgICAgICAgICBmcm9tID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoZnJvbSwgb2Zmc2V0WzBdLCBvZmZzZXRbMV0pO1xuXG4gICAgICAgICAgICBuZXdSZWYgPSAhbWF0Y2hbNV1cbiAgICAgICAgICAgICAgICA/IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGZyb20sICEhbWF0Y2hbMl0pXG4gICAgICAgICAgICAgICAgOiB0aGlzLl9hY2Nlc3MucmFuZ2VSZWYodGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShmcm9tLCBzaXplWzBdLCBzaXplWzFdKSwgISFtYXRjaFsyXSk7XG5cbiAgICAgICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYS5zdWJzdHIoMCwgbWF0Y2guaW5kZXgpICsgbmV3UmVmO1xuICAgICAgICAgICAgZm9ybXVsYSA9IGZvcm11bGEuc3Vic3RyKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYTtcbiAgICAgICAgcmV0dXJuIG5ld0Zvcm11bGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZvcm11bGEgaW4gdGhlIHNoZWV0LCBpLmUuIGNoYW5naW5nIGl0IHRvIG1hdGNoIHRoZSBcbiAgICAgKiBzaXplcyBvZiB0aGUgcmVmZXJlbmNlcyB0ZW1wbGF0ZXMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyPn0gZW50cnlTaXplIFRoZSBmaWxsLXRvLXNpemUgbWFwLCBhcyBjb25zdHJ1Y3RlZCBzbyBmYXJcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gcHV0L3N0YXJ0IHRoaXMgZm9ybXVsYSBpbnRvXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlGb3JtdWxhKGFGaWxsLCBlbnRyeVNpemUsIGNlbGwpIHtcbiAgICAgICAgY2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKGNlbGwsIGFGaWxsLm9mZnNldFswXSwgYUZpbGwub2Zmc2V0WzFdKTtcblxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgaXRlciA9IF8udHJpbSh0ZW1wbGF0ZS5pdGVyYXRvcnNbMF0pLFxuICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZSh0ZW1wbGF0ZS5jZWxsLCBjZWxsKTtcbiAgICAgICAgICAgIFxuICAgICAgICBsZXQgZm9ybXVsYSA9IHRlbXBsYXRlLmV4dHJhY3RvciwgXG4gICAgICAgICAgICBybmc7XG4gICAgICAgICAgICBcbiAgICAgICAgYUZpbGwucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCBudWxsKTtcblxuICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMiAmJiBlbnRyeVNpemVbMV0gPCAyIHx8IGl0ZXIgPT09ICdib3RoJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ2NvbHMnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCAwLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAncm93cycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCBlbnRyeVNpemVbMV0gLSAxXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIDApO1xuICAgICAgICB9IGVsc2UgeyAvLyBpLmUuICdub25lJ1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxGb3JtdWxhKGNlbGwsIHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDFdKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0UmFuZ2VGb3JtdWxhKHJuZywgZm9ybXVsYSk7XG4gICAgfVxufVxuXG4vKipcbiAqIFRoZSBidWlsdC1pbiBhY2Nlc3NvciBiYXNlZCBvbiB4bHN4LXBvcHVsYXRlIG5wbSBtb2R1bGVcbiAqIEB0eXBlIHtYbHN4UG9wdWxhdGVBY2Nlc3N9XG4gKi9cblhsc3hEYXRhRmlsbC5YbHN4UG9wdWxhdGVBY2Nlc3MgPSByZXF1aXJlKCcuL1hsc3hQb3B1bGF0ZUFjY2VzcycpO1xuWGxzeERhdGFGaWxsLnZlcnNpb24gPSBcInt7VkVSU0lPTn19XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuLy8gY29uc3QgYWxsU3R5bGVzID0gW1xuLy8gICAgIFwiYm9sZFwiLCBcbi8vICAgICBcIml0YWxpY1wiLCBcbi8vICAgICBcInVuZGVybGluZVwiLCBcbi8vICAgICBcInN0cmlrZXRocm91Z2hcIiwgXG4vLyAgICAgXCJzdWJzY3JpcHRcIiwgXG4vLyAgICAgXCJzdXBlcnNjcmlwdFwiLCBcbi8vICAgICBcImZvbnRTaXplXCIsIFxuLy8gICAgIFwiZm9udEZhbWlseVwiLCBcbi8vICAgICBcImZvbnRHZW5lcmljRmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udFNjaGVtZVwiLCBcbi8vICAgICBcImZvbnRDb2xvclwiLCBcbi8vICAgICBcImhvcml6b250YWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJqdXN0aWZ5TGFzdExpbmVcIiwgXG4vLyAgICAgXCJpbmRlbnRcIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbEFsaWdubWVudFwiLCBcbi8vICAgICBcIndyYXBUZXh0XCIsIFxuLy8gICAgIFwic2hyaW5rVG9GaXRcIiwgXG4vLyAgICAgXCJ0ZXh0RGlyZWN0aW9uXCIsIFxuLy8gICAgIFwidGV4dFJvdGF0aW9uXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q291bnRlcmNsb2Nrd2lzZVwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENsb2Nrd2lzZVwiLCBcbi8vICAgICBcInJvdGF0ZVRleHRVcFwiLCBcbi8vICAgICBcInJvdGF0ZVRleHREb3duXCIsIFxuLy8gICAgIFwidmVydGljYWxUZXh0XCIsIFxuLy8gICAgIFwiZmlsbFwiLCBcbi8vICAgICBcImJvcmRlclwiLCBcbi8vICAgICBcImJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwiYm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyXCIsIFwicmlnaHRCb3JkZXJcIiwgXCJ0b3BCb3JkZXJcIiwgXCJib3R0b21Cb3JkZXJcIiwgXCJkaWFnb25hbEJvcmRlclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJDb2xvclwiLCBcInJpZ2h0Qm9yZGVyQ29sb3JcIiwgXCJ0b3BCb3JkZXJDb2xvclwiLCBcImJvdHRvbUJvcmRlckNvbG9yXCIsIFwiZGlhZ29uYWxCb3JkZXJDb2xvclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJTdHlsZVwiLCBcInJpZ2h0Qm9yZGVyU3R5bGVcIiwgXCJ0b3BCb3JkZXJTdHlsZVwiLCBcImJvdHRvbUJvcmRlclN0eWxlXCIsIFwiZGlhZ29uYWxCb3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImRpYWdvbmFsQm9yZGVyRGlyZWN0aW9uXCIsIFxuLy8gICAgIFwibnVtYmVyRm9ybWF0XCJcbi8vIF07XG5cbmxldCBfUmljaFRleHQgPSBudWxsO1xuXG4vKipcbiAqIGB4c2x4LXBvcHVsYXRlYCBsaWJyYXJ5IGJhc2VkIGFjY2Vzc29yIHRvIGEgZ2l2ZW4gRXhjZWwgd29ya2Jvb2suIEFsbCB0aGVzZSBtZXRob2RzIGFyZSBpbnRlcm5hbGx5IHVzZWQgYnkge0BsaW5rIFhsc3hEYXRhRmlsbH0sIFxuICogYnV0IGNhbiBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciBpbXBsZW1lbnRpbmcgY3VzdG9tIHNwcmVhZHNoZWV0IGFjY2Vzc29ycy5cbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIHRodXNcbiAgICAgKiBhdm9pZGluZyBtYWtpbmcgdGhlIGB4bHN4LWRhdGFmaWxsYCBwYWNrYWdlIGEgZGVwZW5kZW5jeS5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3b3JrYm9vaywgWGxzeFBvcHVsYXRlKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rID0gd29ya2Jvb2s7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgXG4gICAgICAgIF9SaWNoVGV4dCA9IFhsc3hQb3B1bGF0ZS5SaWNoVGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb25maWd1cmVkIHdvcmtib29rIGZvciBkaXJlY3QgWGxzeFBvcHVsYXRlIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7V29ya2Jvb2t9IFRoZSB3b3JrYm9vayBpbnZvbHZlZC5cbiAgICAgKi9cbiAgICB3b3JrYm9vaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtib29rOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGNlbGwncyBjb250ZW50cy5cbiAgICAgKi9cbiAgICBjZWxsVmFsdWUoY2VsbCkge1xuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0ID8gdGhlVmFsdWUudGV4dCgpIDogdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHJlcXVlc3RlZCB2YWx1ZSBmb3Igc2V0dGluZy5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBFaXRoZXIgdGhlIHJlcXVlc3RlZCB2YWx1ZSBvciBjaGFpbmFibGUgdGhpcy5cbiAgICAgKi9cbiAgICBzZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC52YWx1ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHR5cGUgb2YgdGhlIGNlbGwgLSAnZm9ybXVsYScsICdyaWNodGV4dCcsIFxuICAgICAqICd0ZXh0JywgJ251bWJlcicsICdkYXRlJywgJ2h5cGVybGluaycsIG9yICd1bmtub3duJztcbiAgICAgKi9cbiAgICBjZWxsVHlwZShjZWxsKSB7XG4gICAgICAgIGlmIChjZWxsLmZvcm11bGEoKSlcbiAgICAgICAgICAgIHJldHVybiAnZm9ybXVsYSc7XG4gICAgICAgIGVsc2UgaWYgKGNlbGwuaHlwZXJsaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2h5cGVybGluayc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0KVxuICAgICAgICAgICAgcmV0dXJuICdyaWNodGV4dCc7XG4gICAgICAgIGVsc2UgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcbiAgICAgICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGZvcm11bGEgaW4gdGhlIGNlbGxcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybXVsYSAtIHRoZSB0ZXh0IG9mIHRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0Q2VsbEZvcm11bGEoY2VsbCwgZm9ybXVsYSkge1xuICAgICAgICBjZWxsLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZWFzdXJlcyB0aGUgZGlzdGFuY2UsIGFzIGEgdmVjdG9yIGJldHdlZW4gdHdvIGdpdmVuIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZnJvbSBUaGUgZmlyc3QgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHRvIFRoZSBzZWNvbmQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBjZWxscy5cbiAgICAgKi9cbiAgICBjZWxsRGlzdGFuY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRvLnJvd051bWJlcigpIC0gZnJvbS5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIHRvLmNvbHVtbk51bWJlcigpIC0gZnJvbS5jb2x1bW5OdW1iZXIoKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgdGhlIHNpemUgb2YgY2VsbCwgdGFraW5nIGludG8gYWNjb3VudCBpZiBpdCBpcyBwYXJ0IG9mIGEgbWVyZ2VkIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBvY2N1cGllZCBzaXplLlxuICAgICAqL1xuICAgIGNlbGxTaXplKGNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbEFkZHIgPSBjZWxsLmFkZHJlc3MoKTtcbiAgICAgICAgbGV0IHRoZVNpemUgPSBbMSwgMV07XG4gICAgXG4gICAgICAgIF8uZm9yRWFjaChjZWxsLnNoZWV0KCkuX21lcmdlQ2VsbHMsIHJhbmdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQWRkciA9IHJhbmdlLmF0dHJpYnV0ZXMucmVmLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChyYW5nZUFkZHJbMF0gPT0gY2VsbEFkZHIpIHtcbiAgICAgICAgICAgICAgICB0aGVTaXplID0gdGhpcy5jZWxsRGlzdGFuY2UoY2VsbCwgY2VsbC5zaGVldCgpLmNlbGwocmFuZ2VBZGRyWzFdKSk7XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzBdO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhlU2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmFtZWQgc3R5bGUgb2YgYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgc3R5bGUgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIGZvciB0aGlzIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRDZWxsU3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2VsbC5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgcmVmZXJlbmNlIHN0cmluZyBmb3IgYSBjZWxsIGlkZW50aWZpZWQgYnkgQHBhcmFtIGFkciwgZnJvbSB0aGUgQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgY2VsbCB0aGF0IGlzIGEgYmFzZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZHIgVGhlIGFkZHJlc3Mgb2YgdGhlIHRhcmdldCBjZWxsLCBhcyBtZW50aW9uZWQgaW4gQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSByZWZlcmVuY2Ugc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0YXJnZXQgY2VsbCB1bmlxdWVseS5cbiAgICAgKi9cbiAgICBidWlsZFJlZihjZWxsLCBhZHIsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYSBnaXZlbiBjZWxsIGZyb20gYSBnaXZlbiBzaGVldCAob3IgYW4gYWN0aXZlIG9uZSkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBhZGRyZXNzIFRoZSBjZWxsIGFkcmVzcyB0byBiZSB1c2VkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8aWR4fSBzaGVldElkIFRoZSBpZC9uYW1lIG9mIHRoZSBzaGVldCB0byByZXRyaWV2ZSB0aGUgY2VsbCBmcm9tLiBEZWZhdWx0cyB0byBhbiBhY3RpdmUgb25lLlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBBIHJlZmVyZW5jZSB0byB0aGUgcmVxdWlyZWQgY2VsbC5cbiAgICAgKi9cbiAgICBnZXRDZWxsKGFkZHJlc3MsIHNoZWV0SWQpIHtcbiAgICAgICAgY29uc3QgdGhlU2hlZXQgPSBzaGVldElkID09IG51bGwgPyB0aGlzLl93b3JrYm9vay5hY3RpdmVTaGVldCgpIDogdGhpcy5fd29ya2Jvb2suc2hlZXQoc2hlZXRJZCk7XG4gICAgICAgIHJldHVybiB0aGVTaGVldC5jZWxsKGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIER1cGxpY2F0ZXMgYSBjZWxsIGFjcm9zcyBhIGdpdmVuIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBDZWxsLCB3aGljaCBuZWVkcyBkdXBsaWNhdGluZy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBkdXBsaWNhdGVDZWxsKGNlbGwsIHJhbmdlKSB7XG4gICAgICAgIHJhbmdlLnZhbHVlKGNlbGwudmFsdWUoKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYW5kIHJldHVybnMgdGhlIHJhbmdlIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIGNlbGwgYW5kIHNwYXduaW5nIGdpdmVuIHJvd3MgYW5kIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHJvd09mZnNldCBOdW1iZXIgb2Ygcm93cyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSByb3cuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvbE9mZnNldCBOdW1iZXIgb2YgY29sdW1ucyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSBjb2x1bW4uXG4gICAgICogQHJldHVybnMge1JhbmdlfSBUaGUgY29uc3RydWN0ZWQgcmFuZ2UuXG4gICAgICovXG4gICAgZ2V0Q2VsbFJhbmdlKGNlbGwsIHJvd09mZnNldCwgY29sT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJhbmdlVG8oY2VsbC5yZWxhdGl2ZUNlbGwocm93T2Zmc2V0LCBjb2xPZmZzZXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBjZWxsIGF0IGEgY2VydGFpbiBvZmZzZXQgZnJvbSBhIGdpdmVuIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHJlZmVyZW5jZSBjZWxsIHRvIG1ha2UgdGhlIG9mZnNldCBmcm9tLlxuICAgICAqIEBwYXJhbSB7aW50fSByb3dzIE51bWJlciBvZiByb3dzIHRvIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge2ludH0gY29scyBOdW1iZXIgb2YgY29sdW1ucyB0byBvZmZzZXQuXG4gICAgICogQHJldHVybnMge0NlbGx9IFRoZSByZXN1bHRpbmcgY2VsbC5cbiAgICAgKi9cbiAgICBvZmZzZXRDZWxsKGNlbGwsIHJvd3MsIGNvbHMpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmVsYXRpdmVDZWxsKHJvd3MsIGNvbHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lcmdlIG9yIHNwbGl0IHJhbmdlIG9mIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdHVzIFRoZSBtZXJnZWQgc3RhdHVzIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICByYW5nZU1lcmdlZChyYW5nZSwgc3RhdHVzKSB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5tZXJnZWQoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIGZvcm11bGEgZm9yIHRoZSB3aG9sZSByYW5nZS4gSWYgaXQgY29udGFpbnMgb25seSBvbmUgLSBpdCBpcyBzZXQgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHNldFJhbmdlRm9ybXVsYShyYW5nZSwgZm9ybXVsYSkge1xuICAgICAgICByYW5nZS5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBnaXZlbiByYW5nZS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2Ugd2hpY2ggYWRkcmVzcyB3ZSdyZSBpbnRlcmVzdGVkIGluLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSBzaGVldCBuYW1lIGluIHRoZSBhZGRyZXNzLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiByYW5nZS5cbiAgICAgKi9cbiAgICByYW5nZVJlZihyYW5nZSwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiByYW5nZS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGhlUmFuZ2UgPSBzaGVldC51c2VkUmFuZ2UoKTtcbiAgICAgICAgICAgIGlmICh0aGVSYW5nZSkgXG4gICAgICAgICAgICAgICAgdGhlUmFuZ2UuZm9yRWFjaChjYik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmICghc3JjIHx8ICFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCAnc3JjJyBvciAnZGVzdCcgZm9yIGNvcHlTdHlsZSgpIVwiKTtcbiAgICAgICAgaWYgKHNyYyA9PSBkZXN0KSByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG5cbiAgICAgICAgY29uc3QgZGVzdFNoZWV0SWQgPSBkZXN0LnNoZWV0KCkubmFtZSgpLFxuICAgICAgICAgICAgcm93SWQgPSBgJyR7ZGVzdFNoZWV0SWR9Jzoke2Rlc3Qucm93TnVtYmVyKCl9YCxcbiAgICAgICAgICAgIGNvbElkID0gYCcke2Rlc3RTaGVldElkfSc6JHtkZXN0LmNvbHVtbk51bWJlcigpfWA7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvd1NpemVzW3Jvd0lkXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93SWRdID0gc3JjLnJvdygpLmhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9jb2xTaXplc1tjb2xJZF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3QuY29sdW1uKCkud2lkdGgodGhpcy5fY29sU2l6ZXNbY29sSWRdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
