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
          } else if (!_2.startsWith(pair.name, "!")) {
            var val = _this2.extractValues(data, pair.extractor, cell);

            if (val) _this2._access.setCellStyle(cell, pair.name, JSON.parse(val));
          }
        });
      }

      return this;
    }
    /**
     * Extract the options-specific parameters from the styles field and merge them with the global ones.
     * @param {{}} template The template to extract options properties from.
     * @returns {{}} The full options, 
     * @ignore
     */

  }, {
    key: "getTemplateOpts",
    value: function getTemplateOpts(template) {
      if (!template.styles) return this._opts;

      var opts = _2.clone(this._opts);

      _2.each(template.styles, function (pair) {
        if (_2.startsWith(pair.name, "!")) opts[pair.name.substr(1)] = JSON.parse(pair.extractor);
      });

      return opts;
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
            var rng = _this7._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0)),
                _opts = _this7.getTemplateOpts(template);

            if (_opts.mergeCells === true || _opts.mergeCell === 'both' || rowOffset > 1 && _opts.mergeCells === 'vertical' || colOffset > 1 && _opts.mergeCells === 'horizontal') _this7._access.rangeMerged(rng, true);else if (_opts.duplicateCells === true || _opts.duplicateCells === 'both' || rowOffset > 1 && _opts.duplicateCells === 'vertical' || colOffset > 1 && _opts.duplicateCells === 'horizontal') _this7._access.duplicateCell(nextCell, rng);
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
XlsxDataFill.version = "1.0.3";
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxjQUFjLEVBQUUsS0FOQTtBQU9oQixFQUFBLFNBQVMsRUFBRSxJQVBLO0FBUWhCLEVBQUEsWUFBWSxFQUFFO0FBQ1YsUUFBSSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxDQUFKO0FBQUEsS0FERTtBQUVWLElBQUEsQ0FBQyxFQUFFLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULENBQUo7QUFBQTtBQUZHO0FBUkUsQ0FBcEI7QUFjQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLHdCQUFZLFFBQVosRUFBc0IsSUFBdEIsRUFBNEI7QUFBQTs7QUFDeEIsU0FBSyxLQUFMLEdBQWEsRUFBQyxDQUFDLFlBQUYsQ0FBZSxFQUFmLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLENBQWI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLE9BQUwsR0FBZSxRQUFmO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs0QkFNUSxPLEVBQVM7QUFDYixVQUFJLE9B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QyxLQUFMLEdBQWEsSUFBYixFQUFwQjtBQUFBLFVBQ0ksS0FBSyxjQUFPLFdBQVAsZUFBdUIsSUFBSSxDQUFDLFNBQUwsRUFBdkIsQ0FEVDtBQUFBLFVBRUksS0FBSyxjQUFPLFdBQVAsZUFBdUIsSUFBSSxDQUFDLFlBQUwsRUFBdkIsQ0FGVDtBQUlBLFVBQUksS0FBSyxTQUFMLENBQWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxHQUFMLEdBQVcsTUFBWCxDQUFrQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxHQUFKLEdBQVUsTUFBVixFQUExQztBQUVKLFVBQUksS0FBSyxTQUFMLENBQWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxNQUFMLEdBQWMsS0FBZCxDQUFvQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxNQUFKLEdBQWEsS0FBYixFQUE1QztBQUVKLGFBQU8sSUFBUDtBQUNIOzs7Ozs7QUFHTCxNQUFNLENBQUMsT0FBUCxHQUFpQixrQkFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICB0ZW1wbGF0ZVJlZ0V4cDogL1xce1xceyhbXn1dKilcXH1cXH0vLFxuICAgIGZpZWxkU3BsaXR0ZXI6IFwifFwiLFxuICAgIGpvaW5UZXh0OiBcIixcIixcbiAgICBtZXJnZUNlbGxzOiB0cnVlLFxuICAgIGR1cGxpY2F0ZUNlbGxzOiBmYWxzZSxcbiAgICBmb2xsb3dGb3JtdWxhZTogZmFsc2UsXG4gICAgY29weVN0eWxlOiB0cnVlLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICAnJzogZGF0YSA9PiBfLmtleXMoZGF0YSksXG4gICAgICAgICQ6IGRhdGEgPT4gXy52YWx1ZXMoZGF0YSlcbiAgICB9XG59O1xuXG5jb25zdCByZWZSZWdFeHAgPSAvKCc/KFteIV0qKT8nPyEpPyhbQS1aXStcXGQrKSg6KFtBLVpdK1xcZCspKT8vO1xuXG4vKipcbiAqIERhdGEgZmlsbCBlbmdpbmUsIHRha2luZyBhbiBpbnN0YW5jZSBvZiBFeGNlbCBzaGVldCBhY2Nlc3NvciBhbmQgYSBKU09OIG9iamVjdCBhcyBkYXRhLCBhbmQgZmlsbGluZyB0aGUgdmFsdWVzIGZyb20gdGhlIGxhdHRlciBpbnRvIHRoZSBmb3JtZXIuXG4gKi9cbmNsYXNzIFhsc3hEYXRhRmlsbCB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4RGF0YUZpbGwgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhY2Nlc3NvciBBbiBpbnN0YW5jZSBvZiBYTFNYIHNwcmVhZHNoZWV0IGFjY2Vzc2luZyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBvcHRzIE9wdGlvbnMgdG8gYmUgdXNlZCBkdXJpbmcgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gb3B0cy50ZW1wbGF0ZVJlZ0V4cCBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIGJlIHVzZWQgZm9yIHRlbXBsYXRlIHJlY29nbml6aW5nLiBcbiAgICAgKiBEZWZhdWx0IGlzIGAvXFx7XFx7KFtefV0qKVxcfVxcfS9gLCBpLmUuIE11c3RhY2hlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci4gRGVmYXVsdCBpcyBgfGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuam9pblRleHQgVGhlIHN0cmluZyB0byBiZSB1c2VkIHdoZW4gdGhlIGV4dHJhY3RlZCB2YWx1ZSBmb3IgYSBzaW5nbGUgY2VsbCBpcyBhbiBhcnJheSwgXG4gICAgICogYW5kIGl0IG5lZWRzIHRvIGJlIGpvaW5lZC4gRGVmYXVsdCBpcyBgLGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gb3B0cy5tZXJnZUNlbGxzIFdoZXRoZXIgdG8gbWVyZ2UgdGhlIGhpZ2hlciBkaW1lbnNpb24gY2VsbHMgaW4gdGhlIG91dHB1dC4gRGVmYXVsdCBpcyB0cnVlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGJvb2xlYW59IG9wdHMuZHVwbGljYXRlQ2VsbHMgV2hldGhlciB0byBkdXBsaWNhdGUgdGhlIGNvbnRlbnQgb2YgaGlnaGVyIGRpbWVuc2lvbiBjZWxscywgd2hlbiBub3QgbWVyZ2VkLiBEZWZhdWx0IGlzIGZhbHNlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5mb2xsb3dGb3JtdWxhZSBJZiBhIHRlbXBsYXRlIGlzIGxvY2F0ZWQgYXMgYSByZXN1bHQgb2YgYSBmb3JtdWxhLCB3aGV0aGVyIHRvIHN0aWxsIHByb2Nlc3MgaXQuXG4gICAgICogRGVmYXVsdCBpcyBmYWxzZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuY29weVN0eWxlIENvcHkgdGhlIHN0eWxlIG9mIHRoZSB0ZW1wbGF0ZSBjZWxsIHdoZW4gcG9wdWxhdGluZy4gRXZlbiB3aGVuIGBmYWxzZWAsIHRoZSB0ZW1wbGF0ZVxuICAgICAqIHN0eWxpbmcgX2lzXyBhcHBsaWVkLiBEZWZhdWx0IGlzIHRydWUuXG4gICAgICogQHBhcmFtIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBvcHRzLmNhbGxiYWNrc01hcCBBIG1hcCBvZiBoYW5kbGVycyB0byBiZSB1c2VkIGZvciBkYXRhIGFuZCB2YWx1ZSBleHRyYWN0aW9uLlxuICAgICAqIFRoZXJlIGlzIG9uZSBkZWZhdWx0IC0gdGhlIGVtcHR5IG9uZSwgZm9yIG9iamVjdCBrZXkgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ldyBvcHRpb25zIHRvIGJlIHVzZWQuIFxuICAgICAqIEBzZWUge0Bjb25zdHJ1Y3Rvcn0uXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbHx7fX0gVGhlIHJlcXVpcmVkIG9wdGlvbnMgKGluIGdldHRlciBtb2RlKSBvciBYbHN4RGF0YUZpbGwgKGluIHNldHRlciBtb2RlKSBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgICAgIGlmIChuZXdPcHRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMuX29wdHMsIG5ld09wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHdob2xlIGRhdGEgcG9wdWxhdGlvbiBtZWNoYW5pc20uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSB0byBiZSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGZpbGxEYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YUZpbGxzID0ge307XG5cdFxuICAgICAgICAvLyBCdWlsZCB0aGUgZGVwZW5kZW5jeSBjb25uZWN0aW9ucyBiZXR3ZWVuIHRlbXBsYXRlcy5cbiAgICAgICAgdGhpcy5jb2xsZWN0VGVtcGxhdGVzKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFGaWxsID0geyAgXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLCBcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzOiBbXSxcbiAgICAgICAgICAgICAgICBmb3JtdWxhczogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZkZpbGwgPSBkYXRhRmlsbHNbdGVtcGxhdGUucmVmZXJlbmNlXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXJlZkZpbGwpIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGEgcmVmZXJlbmNlICcke3RlbXBsYXRlLnJlZmVyZW5jZX0nIWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5mb3JtdWxhKSBcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5mb3JtdWxhcy5wdXNoKGFGaWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlZkZpbGwuZGVwZW5kZW50cy5wdXNoKGFGaWxsKTtcbiAgICBcbiAgICAgICAgICAgICAgICBhRmlsbC5vZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHJlZkZpbGwudGVtcGxhdGUuY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhRmlsbHNbdGVtcGxhdGUuaWRdID0gYUZpbGw7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBBcHBseSBlYWNoIGZpbGwgb250byB0aGUgc2hlZXQuXG4gICAgICAgIF8uZWFjaChkYXRhRmlsbHMsIGZpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKGZpbGwucHJvY2Vzc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGVsc2UgaWYgKGZpbGwudGVtcGxhdGUuZm9ybXVsYSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1yZWZlcmVuY2luZyBmb3JtdWxhIGZvdW5kICcke2ZpbGwuZXh0cmFjdG9yfScuIFVzZSBhIG5vbi10ZW1wbGF0ZWQgb25lIWApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWxsKGZpbGwsIGRhdGEsIGZpbGwudGVtcGxhdGUuY2VsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgcHJvdmlkZWQgaGFuZGxlciBmcm9tIHRoZSBtYXAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhhbmRsZXJOYW1lIFRoZSBuYW1lIG9mIHRoZSBoYW5kbGVyLlxuICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gaXRzZWxmLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyKGhhbmRsZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJGbiA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW2hhbmRsZXJOYW1lXTtcblxuICAgICAgICBpZiAoIWhhbmRsZXJGbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGNhbm5vdCBiZSBmb3VuZCFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGhhbmRsZXJGbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGlzIG5vdCBhIGZ1bmN0aW9uIWApO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJGbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHByb3ZpZGVkIGV4dHJhY3RvciAob3QgaXRlcmF0b3IpIHN0cmluZyB0byBmaW5kIGEgY2FsbGJhY2sgaWQgaW5zaWRlLCBpZiBwcmVzZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGl0ZXJhdG9yL2V4dHJhY3RvciBzdHJpbmcgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBBIHsgYHBhdGhgLCBgaGFuZGxlcmAgfSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBKU09OIHBhdGhcbiAgICAgKiByZWFkeSBmb3IgdXNlIGFuZCB0aGUgcHJvdmlkZWQgYGhhbmRsZXJgIF9mdW5jdGlvbl8gLSByZWFkeSBmb3IgaW52b2tpbmcsIGlmIHN1Y2ggaXMgcHJvdmlkZWQuXG4gICAgICogSWYgbm90IC0gdGhlIGBwYXRoYCBwcm9wZXJ0eSBjb250YWlucyB0aGUgcHJvdmlkZWQgYGV4dHJhY3RvcmAsIGFuZCB0aGUgYGhhbmRsZXJgIGlzIGBudWxsYC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKSB7XG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBleHRyYWN0UGFydHMgPSBleHRyYWN0b3Iuc3BsaXQoXCI6XCIpLFxuICAgICAgICAgICAgaGFuZGxlck5hbWUgPSBfLnRyaW0oZXh0cmFjdFBhcnRzWzFdKTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IF8udHJpbShleHRyYWN0UGFydHNbMF0pLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IHRoaXMuZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSlcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgc3R5bGUgcGFydCBvZiB0aGUgdGVtcGxhdGUgb250byBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBkZXN0aW5hdGlvbiBjZWxsIHRvIGFwcGx5IHN0eWxpbmcgdG8uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSBjaHVuayBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBiZSB1c2VkIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHJldHVybnMge0RhdGFGaWxsZXJ9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX29wdHMuY29weVN0eWxlKVxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzdHlsZXMgJiYgZGF0YSkge1xuICAgICAgICAgICAgXy5lYWNoKHN0eWxlcywgcGFpciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEhhbmRsZXIocGFpci5uYW1lLnN1YnN0cigxKSkuY2FsbCh0aGlzLl9vcHRzLCBkYXRhLCBjZWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIiFcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHBhaXIuZXh0cmFjdG9yLCBjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsU3R5bGUoY2VsbCwgcGFpci5uYW1lLCBKU09OLnBhcnNlKHZhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCB0aGUgb3B0aW9ucy1zcGVjaWZpYyBwYXJhbWV0ZXJzIGZyb20gdGhlIHN0eWxlcyBmaWVsZCBhbmQgbWVyZ2UgdGhlbSB3aXRoIHRoZSBnbG9iYWwgb25lcy5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gZXh0cmFjdCBvcHRpb25zIHByb3BlcnRpZXMgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBmdWxsIG9wdGlvbnMsIFxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBnZXRUZW1wbGF0ZU9wdHModGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZS5zdHlsZXMpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0cztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdHMgPSBfLmNsb25lKHRoaXMuX29wdHMpO1xuICAgICAgICBfLmVhY2godGVtcGxhdGUuc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIiFcIikpXG4gICAgICAgICAgICAgICAgb3B0c1twYWlyLm5hbWUuc3Vic3RyKDEpXSA9IEpTT04ucGFyc2UocGFpci5leHRyYWN0b3IpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VUZW1wbGF0ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fYWNjZXNzLmNlbGxWYWx1ZShjZWxsKTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVNYXRjaCA9IHZhbHVlLm1hdGNoKHRoaXMuX29wdHMudGVtcGxhdGVSZWdFeHApO1xuICAgICAgICBpZiAoIXJlTWF0Y2ggfHwgIXRoaXMuX29wdHMuZm9sbG93Rm9ybXVsYWUgJiYgdGhpcy5fYWNjZXNzLmNlbGxUeXBlKGNlbGwpID09PSAnZm9ybXVsYScpIFxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0gcmVNYXRjaFsxXS5zcGxpdCh0aGlzLl9vcHRzLmZpZWxkU3BsaXR0ZXIpLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgc3R5bGVzID0gIXBhcnRzWzRdID8gbnVsbCA6IHBhcnRzWzRdLnNwbGl0KFwiLFwiKSxcbiAgICAgICAgICAgIGV4dHJhY3RvciA9IHBhcnRzWzJdIHx8IFwiXCIsXG4gICAgICAgICAgICBjZWxsUmVmID0gdGhpcy5fYWNjZXNzLmJ1aWxkUmVmKGNlbGwsIHBhcnRzWzBdKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCBjb21wb25lbnRzIG9mIHRoZSB0ZW1wbGF0ZSAnJHtyZU1hdGNoWzBdfSdgKTtcbiAgICAgICAgaWYgKCEhcGFydHNbMF0gJiYgIWNlbGxSZWYpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcmVmZXJlbmNlIHBhc3NlZDogJyR7cGFydHNbMF19J2ApO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogdGhpcy5fYWNjZXNzLmNlbGxSZWYoY2VsbCksXG4gICAgICAgICAgICByZWZlcmVuY2U6IGNlbGxSZWYsXG4gICAgICAgICAgICBpdGVyYXRvcnM6IHBhcnRzWzFdLnNwbGl0KC94fFxcKi8pLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgZXh0cmFjdG9yOiBleHRyYWN0b3IsXG4gICAgICAgICAgICBmb3JtdWxhOiBleHRyYWN0b3Iuc3RhcnRzV2l0aChcIj1cIiksXG4gICAgICAgICAgICBjZWxsOiBjZWxsLFxuICAgICAgICAgICAgY2VsbFNpemU6IHRoaXMuX2FjY2Vzcy5jZWxsU2l6ZShjZWxsKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IChwYXJ0c1szXSB8fCBcIlwiKS5zcGxpdCgvOnwsfHh8XFwqLykubWFwKHYgPT4gcGFyc2VJbnQodikgfHwgMCksXG4gICAgICAgICAgICBzdHlsZXM6ICFzdHlsZXMgPyBudWxsIDogXy5tYXAoc3R5bGVzLCBzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWlyID0gXy50cmltKHMpLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBfLnRyaW0ocGFpclswXSksIGV4dHJhY3RvcjogXy50cmltKHBhaXJbMV0pIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHNvcnRUZW1wbGF0ZXMobGlzdCkge1xuICAgICAgICBjb25zdCBzb3J0ZWQgPSBbXSxcbiAgICAgICAgICAgIHJlbGF0ZWQgPSB7fSxcbiAgICAgICAgICAgIG1hcCA9IHt9LFxuICAgICAgICAgICAgZnJlZUxpc3QgPSBbXTtcblxuICAgICAgICAvLyBGaXJzdCwgbWFrZSB0aGUgZGVwZW5kZW5jeSBtYXAgYW5kIGFkZCB0aGUgbGlzdCBvZiBub24tcmVmZXJlbmNpbmcgdGVtcGxhdGVzXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgY29uc3QgdCA9IGxpc3RbaV07XG4gICAgICAgICAgICBtYXBbdC5pZF0gPSBpO1xuXG4gICAgICAgICAgICBpZiAoIXQucmVmZXJlbmNlKVxuICAgICAgICAgICAgICAgIGZyZWVMaXN0LnB1c2godC5pZCk7XG4gICAgICAgICAgICBlbHNlIFxuICAgICAgICAgICAgICAgIChyZWxhdGVkW3QucmVmZXJlbmNlXSA9IHJlbGF0ZWRbdC5yZWZlcmVuY2VdIHx8IFtdKS5wdXNoKHQuaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm93LCBtYWtlIHRoZSBhY3R1YWwgc29ydGluZy5cbiAgICAgICAgd2hpbGUgKGZyZWVMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gZnJlZUxpc3Quc2hpZnQoKSxcbiAgICAgICAgICAgICAgICB0ID0gbGlzdFttYXBbaWRdXTtcblxuICAgICAgICAgICAgc29ydGVkLnB1c2godCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdlIHVzZSB0aGUgZmFjdCB0aGF0IHRoZXJlIGlzIGEgc2luZ2xlIHByZWRlY2Vzc29yIGluIG91ciBzZXR1cC5cbiAgICAgICAgICAgIGlmIChyZWxhdGVkW3QuaWRdKVxuICAgICAgICAgICAgICAgIGZyZWVMaXN0LnB1c2goLi4ucmVsYXRlZFt0LmlkXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc29ydGVkLmxlbmd0aCA8IGxpc3QubGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBIHJlZmVyZW5jZSBjeWNsZSBmb3VuZCwgaW52b2x2aW5nIFwiJHtfLm1hcChfLnhvcihsaXN0LCBzb3J0ZWQpLCAnaWQnKS5qb2luKCcsJyl9XCIhYCk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuc29ydFRlbXBsYXRlcyhhbGxUZW1wbGF0ZXMpLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIHJlZmVyZW5jZSBjZWxsLCBpZiBzdWNoIGV4aXN0cy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bWJlcnxEYXRlfEFycmF5fEFycmF5LjxBcnJheS48Kj4+fSBUaGUgdmFsdWUgdG8gYmUgdXNlZC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgaXMgdXNlZCBldmVuIHdoZW4gYSB3aG9sZSAtIHBvc3NpYmx5IHJlY3Rhbmd1bGFyIC0gcmFuZ2UgaXMgYWJvdXQgdG8gYmUgc2V0LCBzbyBpdCBjYW5cbiAgICAgKiByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIHJvb3QsIGNlbGwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIGFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZGF0YSBmb3IgdGhlIGdpdmVuIGZpbGwsIGJhc2VkIG9uIHRoZSBnaXZlblxuICAgICAqIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIG1haW4gcmVmZXJlbmNlIG9iamVjdCB0byBhcHBseSBpdGVyYXRvcnMgdG8uXG4gICAgICogQHBhcmFtIHtBcnJheX0gaXRlcmF0b3JzIExpc3Qgb2YgaXRlcmF0b3JzIC0gc3RyaW5nIEpTT04gcGF0aHMgaW5zaWRlIHRoZSByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IFRoZSBpbmRleCBpbiB0aGUgaXRlcmF0b3JzIGFycmF5IHRvIHdvcmsgb24uXG4gICAgICogQHJldHVybnMge0FycmF5fEFycmF5LjxBcnJheT59IEFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZXh0cmFjdGVkIGRhdGEuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3REYXRhKHJvb3QsIGl0ZXJhdG9ycywgaWR4KSB7XG4gICAgICAgIGxldCBpdGVyID0gaXRlcmF0b3JzW2lkeF0sXG4gICAgICAgICAgICBzaXplcyA9IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IGZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGl0ZXIgPT0gJzEnKSB7XG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGl0ZXIgPSBpdGVyYXRvcnNbKytpZHhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpdGVyKSByZXR1cm4gcm9vdDtcblxuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgcGFyc2VkSXRlciA9IHRoaXMucGFyc2VFeHRyYWN0b3IoaXRlcik7XG5cbiAgICAgICAgZGF0YSA9IF8uZ2V0KHJvb3QsIHBhcnNlZEl0ZXIucGF0aCwgcm9vdCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlZEl0ZXIuaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIGRhdGEgPSBwYXJzZWRJdGVyLmhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCBkYXRhKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIGVsc2UgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcyB8fCBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZGF0YSA9IF8udmFsdWVzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNvbWUgZGF0YSBzYW5pdHkgY2hlY2tzLlxuICAgICAgICBpZiAoIWRhdGEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBpdGVyYXRvciAnJHtpdGVyfScgZXh0cmFjdGVkIG5vIGRhdGEhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGRhdGEgZXh0cmFjdGVkIGZyb20gaXRlcmF0b3IgJyR7aXRlcn0nIGlzIG5laXRoZXIgYW4gYXJyYXksIG5vciBvYmplY3QhYCk7XG5cbiAgICAgICAgc2l6ZXMudW5zaGlmdCh0cmFuc3Bvc2VkID8gLWRhdGEubGVuZ3RoIDogZGF0YS5sZW5ndGgpO1xuICAgICAgICBkYXRhLnNpemVzID0gc2l6ZXM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1dCB0aGUgZGF0YSB2YWx1ZXMgaW50byB0aGUgcHJvcGVyIGNlbGxzLCB3aXRoIGNvcnJlY3QgZXh0cmFjdGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciB0aGUgZGF0YSB0byBiZSBwdXQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSBUaGUgYWN0dWFsIGRhdGEgdG8gYmUgcHV0LiBUaGUgdmFsdWVzIHdpbGwgYmUgX2V4dHJhY3RlZF8gZnJvbSBoZXJlIGZpcnN0LlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0aGF0IGlzIGJlaW5nIGltcGxlbWVudGVkIHdpdGggdGhhdCBkYXRhIGZpbGwuXG4gICAgICogQHJldHVybnMge0FycmF5fSBNYXRyaXggc2l6ZSB0aGF0IHRoaXMgZGF0YSBoYXMgb2NjdXBpZWQgb24gdGhlIHNoZWV0IFtyb3dzLCBjb2xzXS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcHV0VmFsdWVzKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGlmICghY2VsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ3Jhc2ghIE51bGwgcmVmZXJlbmNlIGNlbGwgaW4gJ3B1dFZhbHVlcygpJyFcIik7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG4gICAgICAgIC8vIGlmIHdlJ3ZlIGNvbWUgdXAgd2l0aCBhIHJhdyBkYXRhXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBfLmNodW5rKGRhdGEsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWVbcmldW2NpXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhW3JpXVtjaV0sIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWVzIGV4dHJhY3RlZCB3aXRoICcke3RlbXBsYXRlLmV4dHJhY3Rvcn0nIGFyZSBtb3JlIHRoYW4gMiBkaW1lbnNpb24hJ2ApO1xuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSB1c2VkIGZvciBkYXRhIGV4dHJhY3Rpb24uXG4gICAgICogQHBhcmFtIHtDZWxsfSBtYWluQ2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgZGF0YSBwbGFjZW1lbnQgcHJvY2VkdXJlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHNpemUgb2YgdGhlIGRhdGEgcHV0IGluIFtyb3csIGNvbF0gZm9ybWF0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXSxcbiAgICAgICAgICAgICAgICAgICAgcm93UGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMF0gfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgY29sUGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMDtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnBhZGRpbmcubGVuZ3RoIDwgMilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbFBhZGRpbmcgPSByb3dQYWRkaW5nO1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSByb3dQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoZURhdGEuc2l6ZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSBjb2xQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzBdID0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocm93T2Zmc2V0ID4gMSB8fCBjb2xPZmZzZXQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UobmV4dENlbGwsIE1hdGgubWF4KHJvd09mZnNldCAtIDEsIDApLCBNYXRoLm1heChjb2xPZmZzZXQgLSAxLCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBfb3B0cyA9IHRoaXMuZ2V0VGVtcGxhdGVPcHRzKHRlbXBsYXRlKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoX29wdHMubWVyZ2VDZWxscyA9PT0gdHJ1ZSB8fCBfb3B0cy5tZXJnZUNlbGwgPT09ICdib3RoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgcm93T2Zmc2V0ID4gMSAmJiBfb3B0cy5tZXJnZUNlbGxzID09PSAndmVydGljYWwnIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29sT2Zmc2V0ID4gMSAmJiBfb3B0cy5tZXJnZUNlbGxzID09PSAnaG9yaXpvbnRhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MucmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoX29wdHMuZHVwbGljYXRlQ2VsbHMgPT09IHRydWUgfHwgX29wdHMuZHVwbGljYXRlQ2VsbHMgPT09ICdib3RoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgcm93T2Zmc2V0ID4gMSAmJiBfb3B0cy5kdXBsaWNhdGVDZWxscyA9PT0gJ3ZlcnRpY2FsJyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGNvbE9mZnNldCA+IDEgJiYgX29wdHMuZHVwbGljYXRlQ2VsbHMgPT09ICdob3Jpem9udGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5kdXBsaWNhdGVDZWxsKG5leHRDZWxsLCBybmcpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJuZy5mb3JFYWNoKGNlbGwgPT4gdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBpblJvb3QsIHRlbXBsYXRlKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRmluYWxseSwgY2FsY3VsYXRlIHRoZSBuZXh0IGNlbGwuXG4gICAgICAgICAgICAgICAgbmV4dENlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgcm93T2Zmc2V0ICsgcm93UGFkZGluZywgY29sT2Zmc2V0ICsgY29sUGFkZGluZyk7XHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHJlY2FsYyBjb21iaW5lZCBlbnRyeSBzaXplLlxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UobWFpbkNlbGwsIG5leHRDZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goYUZpbGwuZm9ybXVsYXMsIGYgPT4gdGhpcy5hcHBseUZvcm11bGEoZiwgZW50cnlTaXplLCBtYWluQ2VsbCkpO1xuXG4gICAgICAgIGFGaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBhIGZvcm11bGEgYmUgc2hpZnRpbmcgYWxsIHRoZSBmaXhlZCBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2hpZnRlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcixOdW1iZXI+fSBvZmZzZXQgVGhlIG9mZnNldCBvZiB0aGUgcmVmZXJlbmNlZCB0ZW1wbGF0ZSB0byB0aGUgZm9ybXVsYSBvbmUuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gc2l6ZSBUaGUgc2l6ZSBvZiB0aGUgcmFuZ2VzIGFzIHRoZXkgc2hvdWxkIGJlLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwcm9jZXNzZWQgdGV4dC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgc2l6ZSkge1xuICAgICAgICBsZXQgbmV3Rm9ybXVsYSA9ICcnO1xuXG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZm9ybXVsYS5tYXRjaChyZWZSZWdFeHApO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCkgYnJlYWs7XG5cbiAgICAgICAgICAgIGxldCBmcm9tID0gdGhpcy5fYWNjZXNzLmdldENlbGwobWF0Y2hbM10sIG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBuZXdSZWYgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob2Zmc2V0WzBdID4gMCB8fCBvZmZzZXRbMV0gPiAwKVxuICAgICAgICAgICAgICAgIGZyb20gPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChmcm9tLCBvZmZzZXRbMF0sIG9mZnNldFsxXSk7XG5cbiAgICAgICAgICAgIG5ld1JlZiA9ICFtYXRjaFs1XVxuICAgICAgICAgICAgICAgID8gdGhpcy5fYWNjZXNzLmNlbGxSZWYoZnJvbSwgISFtYXRjaFsyXSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuX2FjY2Vzcy5yYW5nZVJlZih0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGZyb20sIHNpemVbMF0sIHNpemVbMV0pLCAhIW1hdGNoWzJdKTtcblxuICAgICAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhLnN1YnN0cigwLCBtYXRjaC5pbmRleCkgKyBuZXdSZWY7XG4gICAgICAgICAgICBmb3JtdWxhID0gZm9ybXVsYS5zdWJzdHIobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhO1xuICAgICAgICByZXR1cm4gbmV3Rm9ybXVsYTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZm9ybXVsYSBpbiB0aGUgc2hlZXQsIGkuZS4gY2hhbmdpbmcgaXQgdG8gbWF0Y2ggdGhlIFxuICAgICAqIHNpemVzIG9mIHRoZSByZWZlcmVuY2VzIHRlbXBsYXRlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXI+fSBlbnRyeVNpemUgVGhlIGZpbGwtdG8tc2l6ZSBtYXAsIGFzIGNvbnN0cnVjdGVkIHNvIGZhclxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBwdXQvc3RhcnQgdGhpcyBmb3JtdWxhIGludG9cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZvcm11bGEoYUZpbGwsIGVudHJ5U2l6ZSwgY2VsbCkge1xuICAgICAgICBjZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoY2VsbCwgYUZpbGwub2Zmc2V0WzBdLCBhRmlsbC5vZmZzZXRbMV0pO1xuXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICBpdGVyID0gXy50cmltKHRlbXBsYXRlLml0ZXJhdG9yc1swXSksXG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHRlbXBsYXRlLmNlbGwsIGNlbGwpO1xuICAgICAgICAgICAgXG4gICAgICAgIGxldCBmb3JtdWxhID0gdGVtcGxhdGUuZXh0cmFjdG9yLCBcbiAgICAgICAgICAgIHJuZztcbiAgICAgICAgICAgIFxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFZhbHVlKGNlbGwsIG51bGwpO1xuXG4gICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAyICYmIGVudHJ5U2l6ZVsxXSA8IDIgfHwgaXRlciA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbMCwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAnY29scycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFtlbnRyeVNpemVbMF0gLSAxLCAwXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIDAsIGVudHJ5U2l6ZVsxXSAtIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZXIgPT09ICdyb3dzJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIGVudHJ5U2l6ZVsxXSAtIDFdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgMCk7XG4gICAgICAgIH0gZWxzZSB7IC8vIGkuZS4gJ25vbmUnXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbEZvcm11bGEoY2VsbCwgdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMV0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRSYW5nZUZvcm11bGEocm5nLCBmb3JtdWxhKTtcbiAgICB9XG59XG5cbi8qKlxuICogVGhlIGJ1aWx0LWluIGFjY2Vzc29yIGJhc2VkIG9uIHhsc3gtcG9wdWxhdGUgbnBtIG1vZHVsZVxuICogQHR5cGUge1hsc3hQb3B1bGF0ZUFjY2Vzc31cbiAqL1xuWGxzeERhdGFGaWxsLlhsc3hQb3B1bGF0ZUFjY2VzcyA9IHJlcXVpcmUoJy4vWGxzeFBvcHVsYXRlQWNjZXNzJyk7XG5YbHN4RGF0YUZpbGwudmVyc2lvbiA9IFwie3tWRVJTSU9OfX1cIjtcblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4RGF0YUZpbGw7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vLyBjb25zdCBhbGxTdHlsZXMgPSBbXG4vLyAgICAgXCJib2xkXCIsIFxuLy8gICAgIFwiaXRhbGljXCIsIFxuLy8gICAgIFwidW5kZXJsaW5lXCIsIFxuLy8gICAgIFwic3RyaWtldGhyb3VnaFwiLCBcbi8vICAgICBcInN1YnNjcmlwdFwiLCBcbi8vICAgICBcInN1cGVyc2NyaXB0XCIsIFxuLy8gICAgIFwiZm9udFNpemVcIiwgXG4vLyAgICAgXCJmb250RmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udEdlbmVyaWNGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250U2NoZW1lXCIsIFxuLy8gICAgIFwiZm9udENvbG9yXCIsIFxuLy8gICAgIFwiaG9yaXpvbnRhbEFsaWdubWVudFwiLCBcbi8vICAgICBcImp1c3RpZnlMYXN0TGluZVwiLCBcbi8vICAgICBcImluZGVudFwiLCBcbi8vICAgICBcInZlcnRpY2FsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwid3JhcFRleHRcIiwgXG4vLyAgICAgXCJzaHJpbmtUb0ZpdFwiLCBcbi8vICAgICBcInRleHREaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJ0ZXh0Um90YXRpb25cIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDb3VudGVyY2xvY2t3aXNlXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q2xvY2t3aXNlXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dFVwXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dERvd25cIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbFRleHRcIiwgXG4vLyAgICAgXCJmaWxsXCIsIFxuLy8gICAgIFwiYm9yZGVyXCIsIFxuLy8gICAgIFwiYm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJib3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJcIiwgXCJyaWdodEJvcmRlclwiLCBcInRvcEJvcmRlclwiLCBcImJvdHRvbUJvcmRlclwiLCBcImRpYWdvbmFsQm9yZGVyXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlckNvbG9yXCIsIFwicmlnaHRCb3JkZXJDb2xvclwiLCBcInRvcEJvcmRlckNvbG9yXCIsIFwiYm90dG9tQm9yZGVyQ29sb3JcIiwgXCJkaWFnb25hbEJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclN0eWxlXCIsIFwicmlnaHRCb3JkZXJTdHlsZVwiLCBcInRvcEJvcmRlclN0eWxlXCIsIFwiYm90dG9tQm9yZGVyU3R5bGVcIiwgXCJkaWFnb25hbEJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwiZGlhZ29uYWxCb3JkZXJEaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJudW1iZXJGb3JtYXRcIlxuLy8gXTtcblxubGV0IF9SaWNoVGV4dCA9IG51bGw7XG5cbi8qKlxuICogYHhzbHgtcG9wdWxhdGVgIGxpYnJhcnkgYmFzZWQgYWNjZXNzb3IgdG8gYSBnaXZlbiBFeGNlbCB3b3JrYm9vay4gQWxsIHRoZXNlIG1ldGhvZHMgYXJlIGludGVybmFsbHkgdXNlZCBieSB7QGxpbmsgWGxzeERhdGFGaWxsfSwgXG4gKiBidXQgY2FuIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIGltcGxlbWVudGluZyBjdXN0b20gc3ByZWFkc2hlZXQgYWNjZXNzb3JzLlxuICovXG5jbGFzcyBYbHN4UG9wdWxhdGVBY2Nlc3Mge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeFNtYXJ0VGVtcGxhdGUgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7V29ya2Jvb2t9IHdvcmtib29rIC0gVGhlIHdvcmtib29rIHRvIGJlIGFjY2Vzc2VkLlxuICAgICAqIEBwYXJhbSB7WGxzeFBvcHVsYXRlfSBYbHN4UG9wdWxhdGUgLSBUaGUgYWN0dWFsIHhsc3gtcG9wdWxhdGUgbGlicmFyeSBvYmplY3QuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBgWGxzeFBvcHVsYXRlYCBvYmplY3QgbmVlZCB0byBiZSBwYXNzZWQgaW4gb3JkZXIgdG8gZXh0cmFjdFxuICAgICAqIGNlcnRhaW4gaW5mb3JtYXRpb24gZnJvbSBpdCwgX3dpdGhvdXRfIHJlZmVycmluZyB0aGUgd2hvbGUgbGlicmFyeSwgdGh1c1xuICAgICAqIGF2b2lkaW5nIG1ha2luZyB0aGUgYHhsc3gtZGF0YWZpbGxgIHBhY2thZ2UgYSBkZXBlbmRlbmN5LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdvcmtib29rLCBYbHN4UG9wdWxhdGUpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2sgPSB3b3JrYm9vaztcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICBcbiAgICAgICAgX1JpY2hUZXh0ID0gWGxzeFBvcHVsYXRlLlJpY2hUZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvbmZpZ3VyZWQgd29ya2Jvb2sgZm9yIGRpcmVjdCBYbHN4UG9wdWxhdGUgbWFuaXB1bGF0aW9uLlxuICAgICAqIEByZXR1cm5zIHtXb3JrYm9va30gVGhlIHdvcmtib29rIGludm9sdmVkLlxuICAgICAqL1xuICAgIHdvcmtib29rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd29ya2Jvb2s7IFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgY2VsbCdzIGNvbnRlbnRzLlxuICAgICAqL1xuICAgIGNlbGxWYWx1ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IHRoZVZhbHVlID0gY2VsbC52YWx1ZSgpO1xuICAgICAgICByZXR1cm4gdGhlVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQgPyB0aGVWYWx1ZS50ZXh0KCkgOiB0aGVWYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgcmVxdWVzdGVkIHZhbHVlIGZvciBzZXR0aW5nLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEVpdGhlciB0aGUgcmVxdWVzdGVkIHZhbHVlIG9yIGNoYWluYWJsZSB0aGlzLlxuICAgICAqL1xuICAgIHNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdHlwZSBvZiB0aGUgY2VsbCAtICdmb3JtdWxhJywgJ3JpY2h0ZXh0JywgXG4gICAgICogJ3RleHQnLCAnbnVtYmVyJywgJ2RhdGUnLCAnaHlwZXJsaW5rJywgb3IgJ3Vua25vd24nO1xuICAgICAqL1xuICAgIGNlbGxUeXBlKGNlbGwpIHtcbiAgICAgICAgaWYgKGNlbGwuZm9ybXVsYSgpKVxuICAgICAgICAgICAgcmV0dXJuICdmb3JtdWxhJztcbiAgICAgICAgZWxzZSBpZiAoY2VsbC5oeXBlcmxpbmsoKSlcbiAgICAgICAgICAgIHJldHVybiAnaHlwZXJsaW5rJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRoZVZhbHVlID0gY2VsbC52YWx1ZSgpO1xuICAgICAgICBpZiAodGhlVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQpXG4gICAgICAgICAgICByZXR1cm4gJ3JpY2h0ZXh0JztcbiAgICAgICAgZWxzZSBpZiAodGhlVmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgICAgICAgICAgcmV0dXJuICdkYXRlJztcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgZm9ybXVsYSBpbiB0aGUgY2VsbFxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtdWxhIC0gdGhlIHRleHQgb2YgdGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRDZWxsRm9ybXVsYShjZWxsLCBmb3JtdWxhKSB7XG4gICAgICAgIGNlbGwuZm9ybXVsYShfLnRyaW1TdGFydChmb3JtdWxhLCAnID0nKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lYXN1cmVzIHRoZSBkaXN0YW5jZSwgYXMgYSB2ZWN0b3IgYmV0d2VlbiB0d28gZ2l2ZW4gY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBmcm9tIFRoZSBmaXJzdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gdG8gVGhlIHNlY29uZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIGNlbGxzLlxuICAgICAqL1xuICAgIGNlbGxEaXN0YW5jZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgdG8ucm93TnVtYmVyKCkgLSBmcm9tLnJvd051bWJlcigpLFxuICAgICAgICAgICAgdG8uY29sdW1uTnVtYmVyKCkgLSBmcm9tLmNvbHVtbk51bWJlcigpXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiBjZWxsLCB0YWtpbmcgaW50byBhY2NvdW50IGlmIGl0IGlzIHBhcnQgb2YgYSBtZXJnZWQgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIG9jY3VwaWVkIHNpemUuXG4gICAgICovXG4gICAgY2VsbFNpemUoY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsQWRkciA9IGNlbGwuYWRkcmVzcygpO1xuICAgICAgICBsZXQgdGhlU2l6ZSA9IFsxLCAxXTtcbiAgICBcbiAgICAgICAgXy5mb3JFYWNoKGNlbGwuc2hlZXQoKS5fbWVyZ2VDZWxscywgcmFuZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VBZGRyID0gcmFuZ2UuYXR0cmlidXRlcy5yZWYuc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKHJhbmdlQWRkclswXSA9PSBjZWxsQWRkcikge1xuICAgICAgICAgICAgICAgIHRoZVNpemUgPSB0aGlzLmNlbGxEaXN0YW5jZShjZWxsLCBjZWxsLnNoZWV0KCkuY2VsbChyYW5nZUFkZHJbMV0pKTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMF07XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGVTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBuYW1lZCBzdHlsZSBvZiBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIG9wZXJhdGVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBzdHlsZSBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB2YWx1ZSBUaGUgdmFsdWUgZm9yIHRoaXMgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHNldENlbGxTdHlsZShjZWxsLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnN0eWxlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlZmVyZW5jZSBJZCBmb3IgYSBnaXZlbiBjZWxsLCBiYXNlZCBvbiBpdHMgc2hlZXQgYW5kIGFkZHJlc3MuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGNyZWF0ZSBhIHJlZmVyZW5jZSBJZCB0by5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgdGhlIHNoZWV0IG5hbWUgaW4gdGhlIHJlZmVyZW5jZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgaWQgdG8gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgdGhpcyBjZWxsLlxuICAgICAqL1xuICAgIGNlbGxSZWYoY2VsbCwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiBjZWxsLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYSByZWZlcmVuY2Ugc3RyaW5nIGZvciBhIGNlbGwgaWRlbnRpZmllZCBieSBAcGFyYW0gYWRyLCBmcm9tIHRoZSBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSBjZWxsIHRoYXQgaXMgYSBiYXNlIG9mIHRoZSByZWZlcmVuY2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkciBUaGUgYWRkcmVzcyBvZiB0aGUgdGFyZ2V0IGNlbGwsIGFzIG1lbnRpb25lZCBpbiBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgdGhlIHNoZWV0IG5hbWUgaW4gdGhlIHJlZmVyZW5jZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIHJlZmVyZW5jZSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHRhcmdldCBjZWxsIHVuaXF1ZWx5LlxuICAgICAqL1xuICAgIGJ1aWxkUmVmKGNlbGwsIGFkciwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiBhZHIgPyBjZWxsLnNoZWV0KCkuY2VsbChhZHIpLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSkgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhIGdpdmVuIGNlbGwgZnJvbSBhIGdpdmVuIHNoZWV0IChvciBhbiBhY3RpdmUgb25lKS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IGFkZHJlc3MgVGhlIGNlbGwgYWRyZXNzIHRvIGJlIHVzZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xpZHh9IHNoZWV0SWQgVGhlIGlkL25hbWUgb2YgdGhlIHNoZWV0IHRvIHJldHJpZXZlIHRoZSBjZWxsIGZyb20uIERlZmF1bHRzIHRvIGFuIGFjdGl2ZSBvbmUuXG4gICAgICogQHJldHVybnMge0NlbGx9IEEgcmVmZXJlbmNlIHRvIHRoZSByZXF1aXJlZCBjZWxsLlxuICAgICAqL1xuICAgIGdldENlbGwoYWRkcmVzcywgc2hlZXRJZCkge1xuICAgICAgICBjb25zdCB0aGVTaGVldCA9IHNoZWV0SWQgPT0gbnVsbCA/IHRoaXMuX3dvcmtib29rLmFjdGl2ZVNoZWV0KCkgOiB0aGlzLl93b3JrYm9vay5zaGVldChzaGVldElkKTtcbiAgICAgICAgcmV0dXJuIHRoZVNoZWV0LmNlbGwoYWRkcmVzcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRHVwbGljYXRlcyBhIGNlbGwgYWNyb3NzIGEgZ2l2ZW4gcmFuZ2UuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIENlbGwsIHdoaWNoIG5lZWRzIGR1cGxpY2F0aW5nLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGR1cGxpY2F0ZUNlbGwoY2VsbCwgcmFuZ2UpIHtcbiAgICAgICAgcmFuZ2UudmFsdWUoY2VsbC52YWx1ZSgpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhbmQgcmV0dXJucyB0aGUgcmFuZ2Ugc3RhcnRpbmcgZnJvbSB0aGUgZ2l2ZW4gY2VsbCBhbmQgc3Bhd25pbmcgZ2l2ZW4gcm93cyBhbmQgY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIG9mIHRoZSByYW5nZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcm93T2Zmc2V0IE51bWJlciBvZiByb3dzIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIHJvdy5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gY29sT2Zmc2V0IE51bWJlciBvZiBjb2x1bW5zIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIGNvbHVtbi5cbiAgICAgKiBAcmV0dXJucyB7UmFuZ2V9IFRoZSBjb25zdHJ1Y3RlZCByYW5nZS5cbiAgICAgKi9cbiAgICBnZXRDZWxsUmFuZ2UoY2VsbCwgcm93T2Zmc2V0LCBjb2xPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmFuZ2VUbyhjZWxsLnJlbGF0aXZlQ2VsbChyb3dPZmZzZXQsIGNvbE9mZnNldCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGNlbGwgYXQgYSBjZXJ0YWluIG9mZnNldCBmcm9tIGEgZ2l2ZW4gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgcmVmZXJlbmNlIGNlbGwgdG8gbWFrZSB0aGUgb2Zmc2V0IGZyb20uXG4gICAgICogQHBhcmFtIHtpbnR9IHJvd3MgTnVtYmVyIG9mIHJvd3MgdG8gb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7aW50fSBjb2xzIE51bWJlciBvZiBjb2x1bW5zIHRvIG9mZnNldC5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gVGhlIHJlc3VsdGluZyBjZWxsLlxuICAgICAqL1xuICAgIG9mZnNldENlbGwoY2VsbCwgcm93cywgY29scykge1xuICAgICAgICByZXR1cm4gY2VsbC5yZWxhdGl2ZUNlbGwocm93cywgY29scyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVyZ2Ugb3Igc3BsaXQgcmFuZ2Ugb2YgY2VsbHMuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdGF0dXMgVGhlIG1lcmdlZCBzdGF0dXMgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHJhbmdlTWVyZ2VkKHJhbmdlLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHJhbmdlLm1lcmdlZCgpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJhbmdlLm1lcmdlZChzdGF0dXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgZm9ybXVsYSBmb3IgdGhlIHdob2xlIHJhbmdlLiBJZiBpdCBjb250YWlucyBvbmx5IG9uZSAtIGl0IGlzIHNldCBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZm9ybXVsYSBUaGUgZm9ybXVsYSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgc2V0UmFuZ2VGb3JtdWxhKHJhbmdlLCBmb3JtdWxhKSB7XG4gICAgICAgIHJhbmdlLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGdpdmVuIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSB3aGljaCBhZGRyZXNzIHdlJ3JlIGludGVyZXN0ZWQgaW4uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHNoZWV0IG5hbWUgaW4gdGhlIGFkZHJlc3MuXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nLCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIHJhbmdlLlxuICAgICAqL1xuICAgIHJhbmdlUmVmKHJhbmdlLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHJhbmdlLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFsbCB1c2VkIGNlbGxzIG9mIHRoZSBnaXZlbiB3b3JrYm9vay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGBjZWxsYCBhcmd1bWVudCBmb3IgZWFjaCB1c2VkIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgZm9yQWxsQ2VsbHMoY2IpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2suc2hlZXRzKCkuZm9yRWFjaChzaGVldCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aGVSYW5nZSA9IHNoZWV0LnVzZWRSYW5nZSgpO1xuICAgICAgICAgICAgaWYgKHRoZVJhbmdlKSBcbiAgICAgICAgICAgICAgICB0aGVSYW5nZS5mb3JFYWNoKGNiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgc3R5bGVzIGZyb20gYHNyY2AgY2VsbCB0byB0aGUgYGRlc3RgLWluYXRpb24gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBEZXN0aW5hdGlvbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gc3JjIFNvdXJjZSBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTdHlsZShkZXN0LCBzcmMpIHtcbiAgICAgICAgaWYgKCFzcmMgfHwgIWRlc3QpIHRocm93IG5ldyBFcnJvcihcIkNyYXNoISBOdWxsICdzcmMnIG9yICdkZXN0JyBmb3IgY29weVN0eWxlKCkhXCIpO1xuICAgICAgICBpZiAoc3JjID09IGRlc3QpIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChzcmMuX3N0eWxlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnN0eWxlKHNyYy5fc3R5bGUpO1xuICAgICAgICBlbHNlIGlmIChzcmMuX3N0eWxlSWQgPiAwKVxuICAgICAgICAgICAgZGVzdC5fc3R5bGVJZCA9IHNyYy5fc3R5bGVJZDtcblxuICAgICAgICBjb25zdCBkZXN0U2hlZXRJZCA9IGRlc3Quc2hlZXQoKS5uYW1lKCksXG4gICAgICAgICAgICByb3dJZCA9IGAnJHtkZXN0U2hlZXRJZH0nOiR7ZGVzdC5yb3dOdW1iZXIoKX1gLFxuICAgICAgICAgICAgY29sSWQgPSBgJyR7ZGVzdFNoZWV0SWR9Jzoke2Rlc3QuY29sdW1uTnVtYmVyKCl9YDtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93SWRdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnJvdygpLmhlaWdodCh0aGlzLl9yb3dTaXplc1tyb3dJZF0gPSBzcmMucm93KCkuaGVpZ2h0KCkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX2NvbFNpemVzW2NvbElkXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xJZF0gPSBzcmMuY29sdW1uKCkud2lkdGgoKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hQb3B1bGF0ZUFjY2VzcztcbiJdfQ==
