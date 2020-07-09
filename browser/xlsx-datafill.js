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
   * @param {RegExp} opts.templateRegExp The regular expression to be used for template recognizing. Default is `/\{\{([^}]*)\}\}/`, i.e. Mustache.
   * @param {string|RegExo} opts.fieldSplitter The string or regular expression to be used as template fields splitter. Default is `|`.
   * @param {string} opts.joinText The string to be used when the extracted value for a single cell is an array, and it needs to be joined. Default is `,`.
   * @param {string|boolean} opts.mergeCells Whether to merge the higher dimension cells in the output. Default is true, but valid values are also `"both"`, `"vertical"` and `"horizontal"`.
   * @param {string|boolean} opts.duplicateCells Whether to duplicate the content of higher dimension cells, when not merged. Default is false. Same valud values as `mergeCells`.
   * @param {boolean} opts.followFormulae If a template is located as a result of a formula, whether to still process it. Default is false.
   * @param {boolean} opts.copyStyle Copy the style of the template cell when populating. Even when `false`, the template styling _is_ applied. Default is true.
   * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data and value extraction.
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
   * @param {{}|null} newOpts If set - the new options to be used. Check [up here]{@link #new-xlsxdatafillaccessor-opts}.
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxjQUFjLEVBQUUsS0FOQTtBQU9oQixFQUFBLFNBQVMsRUFBRSxJQVBLO0FBUWhCLEVBQUEsWUFBWSxFQUFFO0FBQ1YsUUFBSSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxDQUFKO0FBQUEsS0FERTtBQUVWLElBQUEsQ0FBQyxFQUFFLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLE1BQUYsQ0FBUyxJQUFULENBQUo7QUFBQTtBQUZHO0FBUkUsQ0FBcEI7QUFjQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7OztBQWFBLHdCQUFZLFFBQVosRUFBc0IsSUFBdEIsRUFBNEI7QUFBQTs7QUFDeEIsU0FBSyxLQUFMLEdBQWEsRUFBQyxDQUFDLFlBQUYsQ0FBZSxFQUFmLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLENBQWI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLE9BQUwsR0FBZSxRQUFmO0FBQ0g7QUFFRDs7Ozs7Ozs7OzRCQUtRLE8sRUFBUztBQUNiLFVBQUksT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFFBQUEsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFLLEtBQWIsRUFBb0IsT0FBcEI7O0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FIRCxNQUlJLE9BQU8sS0FBSyxLQUFaO0FBQ1A7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFNO0FBQUE7O0FBQ1gsVUFBTSxTQUFTLEdBQUcsRUFBbEIsQ0FEVyxDQUdYOztBQUNBLFdBQUssZ0JBQUwsQ0FBc0IsVUFBQSxRQUFRLEVBQUk7QUFDOUIsWUFBTSxLQUFLLEdBQUc7QUFDVixVQUFBLFFBQVEsRUFBRSxRQURBO0FBRVYsVUFBQSxVQUFVLEVBQUUsRUFGRjtBQUdWLFVBQUEsUUFBUSxFQUFFLEVBSEE7QUFJVixVQUFBLFNBQVMsRUFBRTtBQUpELFNBQWQ7O0FBT0EsWUFBSSxRQUFRLENBQUMsU0FBYixFQUF3QjtBQUNwQixjQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVYsQ0FBekI7QUFFQSxjQUFJLENBQUMsT0FBTCxFQUNJLE1BQU0sSUFBSSxLQUFKLHVDQUF5QyxRQUFRLENBQUMsU0FBbEQsUUFBTjtBQUVKLGNBQUksUUFBUSxDQUFDLE9BQWIsRUFDSSxPQUFPLENBQUMsUUFBUixDQUFpQixJQUFqQixDQUFzQixLQUF0QixFQURKLEtBR0ksT0FBTyxDQUFDLFVBQVIsQ0FBbUIsSUFBbkIsQ0FBd0IsS0FBeEI7QUFFSixVQUFBLEtBQUssQ0FBQyxNQUFOLEdBQWUsS0FBSSxDQUFDLE9BQUwsQ0FBYSxZQUFiLENBQTBCLE9BQU8sQ0FBQyxRQUFSLENBQWlCLElBQTNDLEVBQWlELFFBQVEsQ0FBQyxJQUExRCxDQUFmO0FBQ0g7O0FBQ0QsUUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQVYsQ0FBVCxHQUF5QixLQUF6QjtBQUNILE9BdEJELEVBSlcsQ0E0Qlg7O0FBQ0EsTUFBQSxFQUFDLENBQUMsSUFBRixDQUFPLFNBQVAsRUFBa0IsVUFBQSxJQUFJLEVBQUk7QUFDdEIsWUFBSSxJQUFJLENBQUMsU0FBVCxFQUNJLE9BREosS0FFSyxJQUFJLElBQUksQ0FBQyxRQUFMLENBQWMsT0FBbEIsRUFDRCxNQUFNLElBQUksS0FBSiwwQ0FBNEMsSUFBSSxDQUFDLFNBQWpELGlDQUFOLENBREMsS0FHRCxLQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsRUFBcUIsSUFBckIsRUFBMkIsSUFBSSxDQUFDLFFBQUwsQ0FBYyxJQUF6QztBQUNQLE9BUEQ7O0FBU0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OytCQU1XLFcsRUFBYTtBQUNwQixVQUFNLFNBQVMsR0FBRyxLQUFLLEtBQUwsQ0FBVyxZQUFYLENBQXdCLFdBQXhCLENBQWxCO0FBRUEsVUFBSSxDQUFDLFNBQUwsRUFDSSxNQUFNLElBQUksS0FBSixvQkFBc0IsV0FBdEIsd0JBQU4sQ0FESixLQUVLLElBQUksT0FBTyxTQUFQLEtBQXFCLFVBQXpCLEVBQ0QsTUFBTSxJQUFJLEtBQUosb0JBQXNCLFdBQXRCLDBCQUFOLENBREMsS0FHRCxPQUFPLFNBQVA7QUFDUDtBQUVEOzs7Ozs7Ozs7OzttQ0FRZSxTLEVBQVc7QUFDdEI7QUFDQSxVQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsS0FBVixDQUFnQixHQUFoQixDQUFyQjtBQUFBLFVBQ0ksV0FBVyxHQUFHLEVBQUMsQ0FBQyxJQUFGLENBQU8sWUFBWSxDQUFDLENBQUQsQ0FBbkIsQ0FEbEI7O0FBR0EsYUFBTyxZQUFZLENBQUMsTUFBYixJQUF1QixDQUF2QixHQUNEO0FBQUUsUUFBQSxJQUFJLEVBQUUsU0FBUjtBQUFtQixRQUFBLE9BQU8sRUFBRTtBQUE1QixPQURDLEdBRUQ7QUFDRSxRQUFBLElBQUksRUFBRSxFQUFDLENBQUMsSUFBRixDQUFPLFlBQVksQ0FBQyxDQUFELENBQW5CLENBRFI7QUFFRSxRQUFBLE9BQU8sRUFBRSxLQUFLLFVBQUwsQ0FBZ0IsV0FBaEI7QUFGWCxPQUZOO0FBTUg7QUFFRDs7Ozs7Ozs7Ozs7bUNBUWUsSSxFQUFNLEksRUFBTSxRLEVBQVU7QUFBQTs7QUFDakMsVUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQXhCO0FBRUEsVUFBSSxLQUFLLEtBQUwsQ0FBVyxTQUFmLEVBQ0ksS0FBSyxPQUFMLENBQWEsU0FBYixDQUF1QixJQUF2QixFQUE2QixRQUFRLENBQUMsSUFBdEM7O0FBRUosVUFBSSxNQUFNLElBQUksSUFBZCxFQUFvQjtBQUNoQixRQUFBLEVBQUMsQ0FBQyxJQUFGLENBQU8sTUFBUCxFQUFlLFVBQUEsSUFBSSxFQUFJO0FBQ25CLGNBQUksRUFBQyxDQUFDLFVBQUYsQ0FBYSxJQUFJLENBQUMsSUFBbEIsRUFBd0IsR0FBeEIsQ0FBSixFQUFrQztBQUM5QixZQUFBLE1BQUksQ0FBQyxVQUFMLENBQWdCLElBQUksQ0FBQyxJQUFMLENBQVUsTUFBVixDQUFpQixDQUFqQixDQUFoQixFQUFxQyxJQUFyQyxDQUEwQyxNQUFJLENBQUMsS0FBL0MsRUFBc0QsSUFBdEQsRUFBNEQsSUFBNUQ7QUFDSCxXQUZELE1BRU8sSUFBSSxDQUFDLEVBQUMsQ0FBQyxVQUFGLENBQWEsSUFBSSxDQUFDLElBQWxCLEVBQXdCLEdBQXhCLENBQUwsRUFBbUM7QUFDdEMsZ0JBQU0sR0FBRyxHQUFHLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLEVBQXlCLElBQUksQ0FBQyxTQUE5QixFQUF5QyxJQUF6QyxDQUFaOztBQUNBLGdCQUFJLEdBQUosRUFDSSxNQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsSUFBSSxDQUFDLElBQXJDLEVBQTJDLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBWCxDQUEzQztBQUNQO0FBQ0osU0FSRDtBQVNIOztBQUVELGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7OztvQ0FNZ0IsUSxFQUFVO0FBQ3RCLFVBQUksQ0FBQyxRQUFRLENBQUMsTUFBZCxFQUNJLE9BQU8sS0FBSyxLQUFaOztBQUVKLFVBQU0sSUFBSSxHQUFHLEVBQUMsQ0FBQyxLQUFGLENBQVEsS0FBSyxLQUFiLENBQWI7O0FBQ0EsTUFBQSxFQUFDLENBQUMsSUFBRixDQUFPLFFBQVEsQ0FBQyxNQUFoQixFQUF3QixVQUFBLElBQUksRUFBSTtBQUM1QixZQUFJLEVBQUMsQ0FBQyxVQUFGLENBQWEsSUFBSSxDQUFDLElBQWxCLEVBQXdCLEdBQXhCLENBQUosRUFDSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUwsQ0FBVSxNQUFWLENBQWlCLENBQWpCLENBQUQsQ0FBSixHQUE0QixJQUFJLENBQUMsS0FBTCxDQUFXLElBQUksQ0FBQyxTQUFoQixDQUE1QjtBQUNQLE9BSEQ7O0FBS0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OztrQ0FPYyxJLEVBQU07QUFDaEIsVUFBTSxLQUFLLEdBQUcsS0FBSyxPQUFMLENBQWEsU0FBYixDQUF1QixJQUF2QixDQUFkOztBQUNBLFVBQUksS0FBSyxJQUFJLElBQVQsSUFBaUIsT0FBTyxLQUFQLEtBQWlCLFFBQXRDLEVBQ0ksT0FBTyxJQUFQO0FBRUosVUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQU4sQ0FBWSxLQUFLLEtBQUwsQ0FBVyxjQUF2QixDQUFoQjtBQUNBLFVBQUksQ0FBQyxPQUFELElBQVksQ0FBQyxLQUFLLEtBQUwsQ0FBVyxjQUFaLElBQThCLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsTUFBZ0MsU0FBOUUsRUFDSSxPQUFPLElBQVA7O0FBRUosVUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUQsQ0FBUCxDQUFXLEtBQVgsQ0FBaUIsS0FBSyxLQUFMLENBQVcsYUFBNUIsRUFBMkMsR0FBM0MsQ0FBK0MsRUFBQyxDQUFDLElBQWpELENBQWQ7QUFBQSxVQUNJLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFELENBQU4sR0FBWSxJQUFaLEdBQW1CLEtBQUssQ0FBQyxDQUFELENBQUwsQ0FBUyxLQUFULENBQWUsR0FBZixDQURoQztBQUFBLFVBRUksU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFELENBQUwsSUFBWSxFQUY1QjtBQUFBLFVBR0ksT0FBTyxHQUFHLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsRUFBNEIsS0FBSyxDQUFDLENBQUQsQ0FBakMsQ0FIZDs7QUFLQSxVQUFJLEtBQUssQ0FBQyxNQUFOLEdBQWUsQ0FBbkIsRUFDSSxNQUFNLElBQUksS0FBSixrREFBb0QsT0FBTyxDQUFDLENBQUQsQ0FBM0QsT0FBTjtBQUNKLFVBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFELENBQVAsSUFBYyxDQUFDLE9BQW5CLEVBQ0ksTUFBTSxJQUFJLEtBQUosc0NBQXdDLEtBQUssQ0FBQyxDQUFELENBQTdDLE9BQU47QUFFSixhQUFPO0FBQ0gsUUFBQSxFQUFFLEVBQUUsS0FBSyxPQUFMLENBQWEsT0FBYixDQUFxQixJQUFyQixDQUREO0FBRUgsUUFBQSxTQUFTLEVBQUUsT0FGUjtBQUdILFFBQUEsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFELENBQUwsQ0FBUyxLQUFULENBQWUsTUFBZixFQUF1QixHQUF2QixDQUEyQixFQUFDLENBQUMsSUFBN0IsQ0FIUjtBQUlILFFBQUEsU0FBUyxFQUFFLFNBSlI7QUFLSCxRQUFBLE9BQU8sRUFBRSxTQUFTLENBQUMsVUFBVixDQUFxQixHQUFyQixDQUxOO0FBTUgsUUFBQSxJQUFJLEVBQUUsSUFOSDtBQU9ILFFBQUEsUUFBUSxFQUFFLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsQ0FQUDtBQVFILFFBQUEsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUQsQ0FBTCxJQUFZLEVBQWIsRUFBaUIsS0FBakIsQ0FBdUIsVUFBdkIsRUFBbUMsR0FBbkMsQ0FBdUMsVUFBQSxDQUFDO0FBQUEsaUJBQUksUUFBUSxDQUFDLENBQUQsQ0FBUixJQUFlLENBQW5CO0FBQUEsU0FBeEMsQ0FSTjtBQVNILFFBQUEsTUFBTSxFQUFFLENBQUMsTUFBRCxHQUFVLElBQVYsR0FBaUIsRUFBQyxDQUFDLEdBQUYsQ0FBTSxNQUFOLEVBQWMsVUFBQSxDQUFDLEVBQUk7QUFDeEMsY0FBTSxJQUFJLEdBQUcsRUFBQyxDQUFDLElBQUYsQ0FBTyxDQUFQLEVBQVUsS0FBVixDQUFnQixHQUFoQixDQUFiOztBQUNBLGlCQUFPO0FBQUUsWUFBQSxJQUFJLEVBQUUsRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsQ0FBRCxDQUFYLENBQVI7QUFBeUIsWUFBQSxTQUFTLEVBQUUsRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsQ0FBRCxDQUFYO0FBQXBDLFdBQVA7QUFDSCxTQUh3QjtBQVR0QixPQUFQO0FBY0g7OztrQ0FFYSxJLEVBQU07QUFDaEIsVUFBTSxNQUFNLEdBQUcsRUFBZjtBQUFBLFVBQ0ksT0FBTyxHQUFHLEVBRGQ7QUFBQSxVQUVJLEdBQUcsR0FBRyxFQUZWO0FBQUEsVUFHSSxRQUFRLEdBQUcsRUFIZixDQURnQixDQU1oQjs7QUFDQSxXQUFLLElBQUksQ0FBQyxHQUFHLENBQWIsRUFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUF6QixFQUFpQyxFQUFFLENBQW5DLEVBQXNDO0FBQ2xDLFlBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFELENBQWQ7QUFDQSxRQUFBLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBSCxDQUFILEdBQVksQ0FBWjtBQUVBLFlBQUksQ0FBQyxDQUFDLENBQUMsU0FBUCxFQUNJLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxDQUFDLEVBQWhCLEVBREosS0FHSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBSCxDQUFQLEdBQXVCLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBSCxDQUFQLElBQXdCLEVBQWhELEVBQW9ELElBQXBELENBQXlELENBQUMsQ0FBQyxFQUEzRDtBQUNQLE9BZmUsQ0FpQmhCOzs7QUFDQSxhQUFPLFFBQVEsQ0FBQyxNQUFULEdBQWtCLENBQXpCLEVBQTRCO0FBQ3hCLFlBQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFULEVBQVg7QUFBQSxZQUNJLEVBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUQsQ0FBSixDQURaO0FBR0EsUUFBQSxNQUFNLENBQUMsSUFBUCxDQUFZLEVBQVosRUFKd0IsQ0FNeEI7O0FBQ0EsWUFBSSxPQUFPLENBQUMsRUFBQyxDQUFDLEVBQUgsQ0FBWCxFQUNJLFFBQVEsQ0FBQyxJQUFULE9BQUEsUUFBUSxxQkFBUyxPQUFPLENBQUMsRUFBQyxDQUFDLEVBQUgsQ0FBaEIsRUFBUjtBQUNQOztBQUVELFVBQUksTUFBTSxDQUFDLE1BQVAsR0FBZ0IsSUFBSSxDQUFDLE1BQXpCLEVBQ0ksTUFBTSxJQUFJLEtBQUosZ0RBQWlELEVBQUMsQ0FBQyxHQUFGLENBQU0sRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksTUFBWixDQUFOLEVBQTJCLElBQTNCLEVBQWlDLElBQWpDLENBQXNDLEdBQXRDLENBQWpELFNBQU47QUFFSixhQUFPLE1BQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7Ozs7cUNBU2lCLEUsRUFBSTtBQUFBOztBQUNqQixVQUFNLFlBQVksR0FBRyxFQUFyQjs7QUFFQSxXQUFLLE9BQUwsQ0FBYSxXQUFiLENBQXlCLFVBQUEsSUFBSSxFQUFJO0FBQzdCLFlBQU0sUUFBUSxHQUFHLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLENBQWpCOztBQUNBLFlBQUksUUFBSixFQUNJLFlBQVksQ0FBQyxJQUFiLENBQWtCLFFBQWxCO0FBQ1AsT0FKRDs7QUFNQSxhQUFPLEtBQUssYUFBTCxDQUFtQixZQUFuQixFQUFpQyxPQUFqQyxDQUF5QyxFQUF6QyxDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs7OztrQ0FVYyxJLEVBQU0sUyxFQUFXLEksRUFBTTtBQUFBOztBQUFBLGlDQUNQLEtBQUssY0FBTCxDQUFvQixTQUFwQixDQURPO0FBQUEsVUFDekIsSUFEeUIsd0JBQ3pCLElBRHlCO0FBQUEsVUFDbkIsT0FEbUIsd0JBQ25CLE9BRG1COztBQUdqQyxVQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxJQUFkLENBQUwsRUFDSSxJQUFJLEdBQUcsRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksSUFBWixFQUFrQixJQUFsQixDQUFQLENBREosS0FFSyxJQUFJLElBQUksQ0FBQyxLQUFMLEtBQWUsU0FBbkIsRUFDRCxJQUFJLEdBQUcsQ0FBQyxTQUFELEdBQWEsSUFBYixHQUFvQixFQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBWSxVQUFBLEtBQUs7QUFBQSxlQUFJLE1BQUksQ0FBQyxhQUFMLENBQW1CLEtBQW5CLEVBQTBCLFNBQTFCLEVBQXFDLElBQXJDLENBQUo7QUFBQSxPQUFqQixDQUEzQixDQURDLEtBRUEsSUFBSSxDQUFDLE9BQUwsRUFDRCxPQUFPLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxLQUFMLENBQVcsUUFBWCxJQUF1QixHQUFqQyxDQUFQO0FBRUosYUFBTyxDQUFDLE9BQUQsR0FBVyxJQUFYLEdBQWtCLE9BQU8sQ0FBQyxJQUFSLENBQWEsS0FBSyxLQUFsQixFQUF5QixJQUF6QixFQUErQixJQUEvQixDQUF6QjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7OztnQ0FTWSxJLEVBQU0sUyxFQUFXLEcsRUFBSztBQUFBOztBQUM5QixVQUFJLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRCxDQUFwQjtBQUFBLFVBQ0ksS0FBSyxHQUFHLEVBRFo7QUFBQSxVQUVJLFVBQVUsR0FBRyxLQUZqQjtBQUFBLFVBR0ksSUFBSSxHQUFHLElBSFg7O0FBS0EsVUFBSSxJQUFJLElBQUksR0FBWixFQUFpQjtBQUNiLFFBQUEsVUFBVSxHQUFHLElBQWI7QUFDQSxRQUFBLElBQUksR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFILENBQWhCO0FBQ0g7O0FBRUQsVUFBSSxDQUFDLElBQUwsRUFBVyxPQUFPLElBQVAsQ0FYbUIsQ0FhOUI7O0FBQ0EsVUFBTSxVQUFVLEdBQUcsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQW5CO0FBRUEsTUFBQSxJQUFJLEdBQUcsRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksVUFBVSxDQUFDLElBQXZCLEVBQTZCLElBQTdCLENBQVA7QUFFQSxVQUFJLE9BQU8sVUFBVSxDQUFDLE9BQWxCLEtBQThCLFVBQWxDLEVBQ0ksSUFBSSxHQUFHLFVBQVUsQ0FBQyxPQUFYLENBQW1CLElBQW5CLENBQXdCLEtBQUssS0FBN0IsRUFBb0MsSUFBcEMsQ0FBUDtBQUVKLFVBQUksQ0FBQyxLQUFLLENBQUMsT0FBTixDQUFjLElBQWQsQ0FBRCxJQUF3QixRQUFPLElBQVAsTUFBZ0IsUUFBNUMsRUFDSSxPQUFPLElBQVAsQ0FESixLQUVLLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQTdCLEVBQWdDO0FBQ2pDLFFBQUEsSUFBSSxHQUFHLEVBQUMsQ0FBQyxHQUFGLENBQU0sSUFBTixFQUFZLFVBQUEsTUFBTTtBQUFBLGlCQUFJLE1BQUksQ0FBQyxXQUFMLENBQWlCLE1BQWpCLEVBQXlCLFNBQXpCLEVBQW9DLEdBQUcsR0FBRyxDQUExQyxDQUFKO0FBQUEsU0FBbEIsQ0FBUDtBQUNBLFFBQUEsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxLQUFSLElBQWlCLEVBQXpCO0FBQ0gsT0ExQjZCLENBNEI5QjtBQUVBOztBQUNBLFVBQUksQ0FBQyxJQUFMLEVBQ0ksTUFBTSxJQUFJLEtBQUoseUJBQTJCLElBQTNCLDBCQUFOLENBREosS0FFSyxJQUFJLFFBQU8sSUFBUCxNQUFnQixRQUFwQixFQUNELE1BQU0sSUFBSSxLQUFKLDZDQUErQyxJQUEvQyx3Q0FBTjtBQUVKLE1BQUEsS0FBSyxDQUFDLE9BQU4sQ0FBYyxVQUFVLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBVCxHQUFrQixJQUFJLENBQUMsTUFBL0M7QUFDQSxNQUFBLElBQUksQ0FBQyxLQUFMLEdBQWEsS0FBYjtBQUNBLGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7OzhCQVFVLEksRUFBTSxJLEVBQU0sUSxFQUFVO0FBQUE7O0FBQzVCLFVBQUksQ0FBQyxJQUFMLEVBQVcsTUFBTSxJQUFJLEtBQUosQ0FBVSw4Q0FBVixDQUFOO0FBRVgsVUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQXJCO0FBQUEsVUFDSSxLQUFLLEdBQUcsS0FBSyxhQUFMLENBQW1CLElBQW5CLEVBQXlCLFFBQVEsQ0FBQyxTQUFsQyxFQUE2QyxJQUE3QyxDQURaLENBSDRCLENBTTVCOztBQUNBLFVBQUksQ0FBQyxLQUFLLENBQUMsT0FBTixDQUFjLEtBQWQsQ0FBRCxJQUF5QixDQUFDLFNBQTFCLElBQXVDLENBQUMsU0FBUyxDQUFDLE1BQXRELEVBQThEO0FBQzFELGFBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsS0FBaEM7O0FBQ0EsYUFBSyxjQUFMLENBQW9CLElBQXBCLEVBQTBCLElBQTFCLEVBQWdDLFFBQWhDO0FBQ0EsUUFBQSxTQUFTLEdBQUcsUUFBUSxDQUFDLFFBQXJCO0FBQ0gsT0FKRCxNQUlPLElBQUksU0FBUyxDQUFDLE1BQVYsSUFBb0IsQ0FBeEIsRUFBMkI7QUFDOUI7QUFDQSxZQUFJLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFuQixFQUFzQjtBQUNsQixVQUFBLFNBQVMsR0FBRyxDQUFDLENBQUQsRUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFELENBQWQsQ0FBWjtBQUNBLFVBQUEsS0FBSyxHQUFHLENBQUMsS0FBRCxDQUFSO0FBQ0EsVUFBQSxJQUFJLEdBQUcsQ0FBQyxJQUFELENBQVA7QUFDSCxTQUpELE1BSU8sSUFBSSxTQUFTLENBQUMsTUFBVixJQUFvQixDQUF4QixFQUEyQjtBQUM5QixVQUFBLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBVixDQUFpQixDQUFDLENBQUQsQ0FBakIsQ0FBWjtBQUNBLFVBQUEsS0FBSyxHQUFHLEVBQUMsQ0FBQyxLQUFGLENBQVEsS0FBUixFQUFlLENBQWYsQ0FBUjtBQUNBLFVBQUEsSUFBSSxHQUFHLEVBQUMsQ0FBQyxLQUFGLENBQVEsSUFBUixFQUFjLENBQWQsQ0FBUDtBQUNIOztBQUVELGFBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQS9DLEVBQWtELFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFqRSxFQUFvRSxPQUFwRSxDQUE0RSxVQUFDLElBQUQsRUFBTyxFQUFQLEVBQVcsRUFBWCxFQUFrQjtBQUMxRixVQUFBLE1BQUksQ0FBQyxPQUFMLENBQWEsWUFBYixDQUEwQixJQUExQixFQUFnQyxLQUFLLENBQUMsRUFBRCxDQUFMLENBQVUsRUFBVixDQUFoQzs7QUFDQSxVQUFBLE1BQUksQ0FBQyxjQUFMLENBQW9CLElBQXBCLEVBQTBCLElBQUksQ0FBQyxFQUFELENBQUosQ0FBUyxFQUFULENBQTFCLEVBQXdDLFFBQXhDO0FBQ0gsU0FIRDtBQUlILE9BaEJNLE1BaUJILE1BQU0sSUFBSSxLQUFKLGtDQUFvQyxRQUFRLENBQUMsU0FBN0MsbUNBQU47O0FBRUosYUFBTyxTQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs7OEJBUVUsSyxFQUFPLEksRUFBTSxRLEVBQVU7QUFBQTs7QUFDN0IsVUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQXZCO0FBQUEsVUFDSSxPQUFPLEdBQUcsS0FBSyxXQUFMLENBQWlCLElBQWpCLEVBQXVCLFFBQVEsQ0FBQyxTQUFoQyxFQUEyQyxDQUEzQyxDQURkO0FBR0EsVUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFoQjtBQUVBLFVBQUksQ0FBQyxLQUFLLENBQUMsVUFBUCxJQUFxQixDQUFDLEtBQUssQ0FBQyxVQUFOLENBQWlCLE1BQTNDLEVBQ0ksU0FBUyxHQUFHLEtBQUssU0FBTCxDQUFlLFFBQWYsRUFBeUIsT0FBekIsRUFBa0MsUUFBbEMsQ0FBWixDQURKLEtBRUs7QUFDRCxZQUFJLFFBQVEsR0FBRyxRQUFmOztBQUNBLFlBQU0sVUFBVSxHQUFHLFNBQWIsVUFBYSxDQUFDLEdBQUQsRUFBTSxHQUFOO0FBQUEsaUJBQWMsU0FBUyxDQUFDLEdBQUQsQ0FBVCxHQUFpQixJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVMsQ0FBQyxHQUFELENBQWxCLEVBQXlCLEdBQXpCLENBQS9CO0FBQUEsU0FBbkI7O0FBRkMsbUNBSVEsQ0FKUjtBQUtHLGNBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFELENBQXRCOztBQUVBLGVBQUssSUFBSSxDQUFDLEdBQUcsQ0FBYixFQUFnQixDQUFDLEdBQUcsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsTUFBckMsRUFBNkMsRUFBRSxDQUEvQyxFQUFrRDtBQUM5QyxnQkFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsQ0FBakIsQ0FBZjtBQUFBLGdCQUNJLE1BQU0sR0FBRyxNQUFJLENBQUMsT0FBTCxDQUFhLFVBQWIsQ0FBd0IsUUFBeEIsRUFBa0MsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLENBQWxDLEVBQW9ELE1BQU0sQ0FBQyxNQUFQLENBQWMsQ0FBZCxDQUFwRCxDQURiOztBQUdBLFlBQUEsRUFBQyxDQUFDLE9BQUYsQ0FBVSxNQUFJLENBQUMsU0FBTCxDQUFlLE1BQWYsRUFBdUIsTUFBdkIsRUFBK0IsTUFBL0IsQ0FBVixFQUFrRCxVQUFsRDtBQUNILFdBWkosQ0FjRzs7O0FBQ0EsVUFBQSxFQUFDLENBQUMsT0FBRixDQUFVLE1BQUksQ0FBQyxTQUFMLENBQWUsUUFBZixFQUF5QixNQUF6QixFQUFpQyxRQUFqQyxDQUFWLEVBQXNELFVBQXREOztBQUVBLGNBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFELENBQXpCO0FBQUEsY0FDSSxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUQsQ0FEekI7QUFBQSxjQUVJLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBVCxDQUFpQixDQUFqQixLQUF1QixDQUZ4QztBQUFBLGNBR0ksVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFULENBQWlCLENBQWpCLEtBQXVCLENBSHhDLENBakJILENBc0JHOztBQUNBLGNBQUksT0FBTyxDQUFDLEtBQVIsQ0FBYyxDQUFkLElBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLGdCQUFJLFFBQVEsQ0FBQyxPQUFULENBQWlCLE1BQWpCLEdBQTBCLENBQTlCLEVBQ0ksVUFBVSxHQUFHLFVBQWI7QUFDSixZQUFBLFNBQVMsR0FBRyxVQUFVLEdBQUcsQ0FBekI7QUFDQSxZQUFBLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFmO0FBQ0gsV0FMRCxNQUtPLElBQUksT0FBTyxDQUFDLEtBQVIsQ0FBYyxNQUFkLEdBQXVCLENBQTNCLEVBQThCO0FBQ2pDLFlBQUEsU0FBUyxHQUFHLFVBQVUsR0FBRyxDQUF6QjtBQUNBLFlBQUEsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWY7QUFDSDs7QUFFRCxjQUFJLFNBQVMsR0FBRyxDQUFaLElBQWlCLFNBQVMsR0FBRyxDQUFqQyxFQUFvQztBQUNoQyxnQkFBTSxHQUFHLEdBQUcsTUFBSSxDQUFDLE9BQUwsQ0FBYSxZQUFiLENBQTBCLFFBQTFCLEVBQW9DLElBQUksQ0FBQyxHQUFMLENBQVMsU0FBUyxHQUFHLENBQXJCLEVBQXdCLENBQXhCLENBQXBDLEVBQWdFLElBQUksQ0FBQyxHQUFMLENBQVMsU0FBUyxHQUFHLENBQXJCLEVBQXdCLENBQXhCLENBQWhFLENBQVo7QUFBQSxnQkFDSSxLQUFLLEdBQUcsTUFBSSxDQUFDLGVBQUwsQ0FBcUIsUUFBckIsQ0FEWjs7QUFHQSxnQkFBSSxLQUFLLENBQUMsVUFBTixLQUFxQixJQUFyQixJQUE2QixLQUFLLENBQUMsU0FBTixLQUFvQixNQUFqRCxJQUNHLFNBQVMsR0FBRyxDQUFaLElBQWlCLEtBQUssQ0FBQyxVQUFOLEtBQXFCLFVBRHpDLElBRUcsU0FBUyxHQUFHLENBQVosSUFBaUIsS0FBSyxDQUFDLFVBQU4sS0FBcUIsWUFGN0MsRUFHSSxNQUFJLENBQUMsT0FBTCxDQUFhLFdBQWIsQ0FBeUIsR0FBekIsRUFBOEIsSUFBOUIsRUFISixLQUlLLElBQUksS0FBSyxDQUFDLGNBQU4sS0FBeUIsSUFBekIsSUFBaUMsS0FBSyxDQUFDLGNBQU4sS0FBeUIsTUFBMUQsSUFDRixTQUFTLEdBQUcsQ0FBWixJQUFpQixLQUFLLENBQUMsY0FBTixLQUF5QixVQUR4QyxJQUVGLFNBQVMsR0FBRyxDQUFaLElBQWlCLEtBQUssQ0FBQyxjQUFOLEtBQXlCLFlBRjVDLEVBR0QsTUFBSSxDQUFDLE9BQUwsQ0FBYSxhQUFiLENBQTJCLFFBQTNCLEVBQXFDLEdBQXJDO0FBRUosWUFBQSxHQUFHLENBQUMsT0FBSixDQUFZLFVBQUEsSUFBSTtBQUFBLHFCQUFJLE1BQUksQ0FBQyxjQUFMLENBQW9CLElBQXBCLEVBQTBCLE1BQTFCLEVBQWtDLFFBQWxDLENBQUo7QUFBQSxhQUFoQjtBQUNILFdBL0NKLENBaURHOzs7QUFDQSxVQUFBLFFBQVEsR0FBRyxNQUFJLENBQUMsT0FBTCxDQUFhLFVBQWIsQ0FBd0IsUUFBeEIsRUFBa0MsU0FBUyxHQUFHLFVBQTlDLEVBQTBELFNBQVMsR0FBRyxVQUF0RSxDQUFYO0FBbERIOztBQUlELGFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBYixFQUFnQixDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQTVCLEVBQW9DLEVBQUUsQ0FBdEMsRUFBeUM7QUFBQSxnQkFBaEMsQ0FBZ0M7QUErQ3hDLFNBbkRBLENBcUREOzs7QUFDQSxRQUFBLEVBQUMsQ0FBQyxPQUFGLENBQVUsS0FBSyxPQUFMLENBQWEsWUFBYixDQUEwQixRQUExQixFQUFvQyxRQUFwQyxDQUFWLEVBQXlELFVBQXpEO0FBQ0g7O0FBRUQsTUFBQSxFQUFDLENBQUMsT0FBRixDQUFVLEtBQUssQ0FBQyxRQUFoQixFQUEwQixVQUFBLENBQUM7QUFBQSxlQUFJLE1BQUksQ0FBQyxZQUFMLENBQWtCLENBQWxCLEVBQXFCLFNBQXJCLEVBQWdDLFFBQWhDLENBQUo7QUFBQSxPQUEzQjs7QUFFQSxNQUFBLEtBQUssQ0FBQyxTQUFOLEdBQWtCLElBQWxCO0FBQ0EsYUFBTyxTQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs7aUNBUWEsTyxFQUFTLE0sRUFBUSxJLEVBQU07QUFDaEMsVUFBSSxVQUFVLEdBQUcsRUFBakI7O0FBRUEsZUFBUztBQUNMLFlBQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFSLENBQWMsU0FBZCxDQUFkO0FBQ0EsWUFBSSxDQUFDLEtBQUwsRUFBWTs7QUFFWixZQUFJLElBQUksR0FBRyxLQUFLLE9BQUwsQ0FBYSxPQUFiLENBQXFCLEtBQUssQ0FBQyxDQUFELENBQTFCLEVBQStCLEtBQUssQ0FBQyxDQUFELENBQXBDLENBQVg7QUFBQSxZQUNJLE1BQU0sR0FBRyxJQURiOztBQUdBLFlBQUksTUFBTSxDQUFDLENBQUQsQ0FBTixHQUFZLENBQVosSUFBaUIsTUFBTSxDQUFDLENBQUQsQ0FBTixHQUFZLENBQWpDLEVBQ0ksSUFBSSxHQUFHLEtBQUssT0FBTCxDQUFhLFVBQWIsQ0FBd0IsSUFBeEIsRUFBOEIsTUFBTSxDQUFDLENBQUQsQ0FBcEMsRUFBeUMsTUFBTSxDQUFDLENBQUQsQ0FBL0MsQ0FBUDtBQUVKLFFBQUEsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUQsQ0FBTixHQUNILEtBQUssT0FBTCxDQUFhLE9BQWIsQ0FBcUIsSUFBckIsRUFBMkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFELENBQWxDLENBREcsR0FFSCxLQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXNCLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsSUFBSSxDQUFDLENBQUQsQ0FBcEMsRUFBeUMsSUFBSSxDQUFDLENBQUQsQ0FBN0MsQ0FBdEIsRUFBeUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFELENBQWhGLENBRk47QUFJQSxRQUFBLFVBQVUsSUFBSSxPQUFPLENBQUMsTUFBUixDQUFlLENBQWYsRUFBa0IsS0FBSyxDQUFDLEtBQXhCLElBQWlDLE1BQS9DO0FBQ0EsUUFBQSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQVIsQ0FBZSxLQUFLLENBQUMsS0FBTixHQUFjLEtBQUssQ0FBQyxDQUFELENBQUwsQ0FBUyxNQUF0QyxDQUFWO0FBQ0g7O0FBRUQsTUFBQSxVQUFVLElBQUksT0FBZDtBQUNBLGFBQU8sVUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7OztpQ0FTYSxLLEVBQU8sUyxFQUFXLEksRUFBTTtBQUNqQyxNQUFBLElBQUksR0FBRyxLQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLElBQXhCLEVBQThCLEtBQUssQ0FBQyxNQUFOLENBQWEsQ0FBYixDQUE5QixFQUErQyxLQUFLLENBQUMsTUFBTixDQUFhLENBQWIsQ0FBL0MsQ0FBUDs7QUFFQSxVQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBdkI7QUFBQSxVQUNJLElBQUksR0FBRyxFQUFDLENBQUMsSUFBRixDQUFPLFFBQVEsQ0FBQyxTQUFULENBQW1CLENBQW5CLENBQVAsQ0FEWDtBQUFBLFVBRUksTUFBTSxHQUFHLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsUUFBUSxDQUFDLElBQW5DLEVBQXlDLElBQXpDLENBRmI7O0FBSUEsVUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLFNBQXZCO0FBQUEsVUFDSSxHQURKO0FBR0EsTUFBQSxLQUFLLENBQUMsU0FBTixHQUFrQixJQUFsQjs7QUFDQSxXQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLElBQTFCLEVBQWdDLElBQWhDOztBQUVBLFVBQUksU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWYsSUFBb0IsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQW5DLElBQXdDLElBQUksS0FBSyxNQUFyRCxFQUE2RDtBQUN6RCxRQUFBLE9BQU8sR0FBRyxLQUFLLFlBQUwsQ0FBa0IsT0FBbEIsRUFBMkIsTUFBM0IsRUFBbUMsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFuQyxDQUFWO0FBQ0EsUUFBQSxHQUFHLEdBQUcsS0FBSyxPQUFMLENBQWEsWUFBYixDQUEwQixJQUExQixFQUFnQyxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBL0MsRUFBa0QsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWpFLENBQU47QUFDSCxPQUhELE1BR08sSUFBSSxJQUFJLEtBQUssTUFBYixFQUFxQjtBQUN4QixRQUFBLE9BQU8sR0FBRyxLQUFLLFlBQUwsQ0FBa0IsT0FBbEIsRUFBMkIsTUFBM0IsRUFBbUMsQ0FBQyxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBaEIsRUFBbUIsQ0FBbkIsQ0FBbkMsQ0FBVjtBQUNBLFFBQUEsR0FBRyxHQUFHLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsQ0FBaEMsRUFBbUMsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWxELENBQU47QUFDSCxPQUhNLE1BR0EsSUFBSSxJQUFJLEtBQUssTUFBYixFQUFxQjtBQUN4QixRQUFBLE9BQU8sR0FBRyxLQUFLLFlBQUwsQ0FBa0IsT0FBbEIsRUFBMkIsTUFBM0IsRUFBbUMsQ0FBQyxDQUFELEVBQUksU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQW5CLENBQW5DLENBQVY7QUFDQSxRQUFBLEdBQUcsR0FBRyxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLElBQTFCLEVBQWdDLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUEvQyxFQUFrRCxDQUFsRCxDQUFOO0FBQ0gsT0FITSxNQUdBO0FBQUU7QUFDTCxhQUFLLE9BQUwsQ0FBYSxjQUFiLENBQTRCLElBQTVCLEVBQWtDLEtBQUssWUFBTCxDQUFrQixPQUFsQixFQUEyQixNQUEzQixFQUFtQyxDQUFDLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFoQixFQUFtQixTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBbEMsQ0FBbkMsQ0FBbEM7O0FBQ0E7QUFDSDs7QUFFRCxXQUFLLE9BQUwsQ0FBYSxlQUFiLENBQTZCLEdBQTdCLEVBQWtDLE9BQWxDO0FBQ0g7Ozs7O0FBR0w7Ozs7OztBQUlBLFlBQVksQ0FBQyxrQkFBYixHQUFrQyxPQUFPLENBQUMsc0JBQUQsQ0FBekM7QUFDQSxZQUFZLENBQUMsT0FBYixHQUF1QixhQUF2QjtBQUVBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFlBQWpCOzs7Ozs7QUNoakJBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakIsQyxDQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUVBLElBQUksU0FBUyxHQUFHLElBQWhCO0FBRUE7Ozs7O0lBSU0sa0I7QUFDRjs7Ozs7Ozs7QUFRQSw4QkFBWSxRQUFaLEVBQXNCLFlBQXRCLEVBQW9DO0FBQUE7O0FBQ2hDLFNBQUssU0FBTCxHQUFpQixRQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUVBLElBQUEsU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUF6QjtBQUNIO0FBRUQ7Ozs7Ozs7OytCQUlXO0FBQ1AsYUFBTyxLQUFLLFNBQVo7QUFDSDtBQUVEOzs7Ozs7Ozs4QkFLVSxJLEVBQU07QUFDWixVQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBTCxFQUFqQjtBQUNBLGFBQU8sUUFBUSxZQUFZLFNBQXBCLEdBQWdDLFFBQVEsQ0FBQyxJQUFULEVBQWhDLEdBQWtELFFBQXpEO0FBQ0g7QUFFRDs7Ozs7Ozs7O2lDQU1hLEksRUFBTSxLLEVBQU87QUFDdEIsTUFBQSxJQUFJLENBQUMsS0FBTCxDQUFXLEtBQVg7QUFDQSxhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7NkJBTVMsSSxFQUFNO0FBQ1gsVUFBSSxJQUFJLENBQUMsT0FBTCxFQUFKLEVBQ0ksT0FBTyxTQUFQLENBREosS0FFSyxJQUFJLElBQUksQ0FBQyxTQUFMLEVBQUosRUFDRCxPQUFPLFdBQVA7QUFFSixVQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBTCxFQUFqQjtBQUNBLFVBQUksUUFBUSxZQUFZLFNBQXhCLEVBQ0ksT0FBTyxVQUFQLENBREosS0FFSyxJQUFJLFFBQVEsWUFBWSxJQUF4QixFQUNELE9BQU8sTUFBUCxDQURDLEtBR0QsZUFBYyxRQUFkO0FBQ1A7QUFFRDs7Ozs7Ozs7O21DQU1lLEksRUFBTSxPLEVBQVM7QUFDMUIsTUFBQSxJQUFJLENBQUMsT0FBTCxDQUFhLENBQUMsQ0FBQyxTQUFGLENBQVksT0FBWixFQUFxQixJQUFyQixDQUFiO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7O2lDQU1hLEksRUFBTSxFLEVBQUk7QUFDbkIsYUFBTyxDQUNILEVBQUUsQ0FBQyxTQUFILEtBQWlCLElBQUksQ0FBQyxTQUFMLEVBRGQsRUFFSCxFQUFFLENBQUMsWUFBSCxLQUFvQixJQUFJLENBQUMsWUFBTCxFQUZqQixDQUFQO0FBSUg7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFNO0FBQUE7O0FBQ1gsVUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQUwsRUFBakI7QUFDQSxVQUFJLE9BQU8sR0FBRyxDQUFDLENBQUQsRUFBSSxDQUFKLENBQWQ7O0FBRUEsTUFBQSxDQUFDLENBQUMsT0FBRixDQUFVLElBQUksQ0FBQyxLQUFMLEdBQWEsV0FBdkIsRUFBb0MsVUFBQSxLQUFLLEVBQUk7QUFDekMsWUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsR0FBakIsQ0FBcUIsS0FBckIsQ0FBMkIsR0FBM0IsQ0FBbEI7O0FBQ0EsWUFBSSxTQUFTLENBQUMsQ0FBRCxDQUFULElBQWdCLFFBQXBCLEVBQThCO0FBQzFCLFVBQUEsT0FBTyxHQUFHLEtBQUksQ0FBQyxZQUFMLENBQWtCLElBQWxCLEVBQXdCLElBQUksQ0FBQyxLQUFMLEdBQWEsSUFBYixDQUFrQixTQUFTLENBQUMsQ0FBRCxDQUEzQixDQUF4QixDQUFWO0FBQ0EsWUFBRSxPQUFPLENBQUMsQ0FBRCxDQUFUO0FBQ0EsWUFBRSxPQUFPLENBQUMsQ0FBRCxDQUFUO0FBQ0EsaUJBQU8sS0FBUDtBQUNIO0FBQ0osT0FSRDs7QUFVQSxhQUFPLE9BQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7O2lDQU9hLEksRUFBTSxJLEVBQU0sSyxFQUFPO0FBQzVCLE1BQUEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFYLEVBQWlCLEtBQWpCO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzRCQU1RLEksRUFBTSxTLEVBQVc7QUFDckIsVUFBSSxTQUFTLElBQUksSUFBakIsRUFDSSxTQUFTLEdBQUcsSUFBWjtBQUNKLGFBQU8sSUFBSSxDQUFDLE9BQUwsQ0FBYTtBQUFFLFFBQUEsZ0JBQWdCLEVBQUU7QUFBcEIsT0FBYixDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs2QkFPUyxJLEVBQU0sRyxFQUFLLFMsRUFBVztBQUMzQixVQUFJLFNBQVMsSUFBSSxJQUFqQixFQUNJLFNBQVMsR0FBRyxJQUFaO0FBQ0osYUFBTyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUwsR0FBYSxJQUFiLENBQWtCLEdBQWxCLEVBQXVCLE9BQXZCLENBQStCO0FBQUUsUUFBQSxnQkFBZ0IsRUFBRTtBQUFwQixPQUEvQixDQUFILEdBQXFFLElBQS9FO0FBQ0g7QUFFRDs7Ozs7Ozs7OzRCQU1RLE8sRUFBUyxPLEVBQVM7QUFDdEIsVUFBTSxRQUFRLEdBQUcsT0FBTyxJQUFJLElBQVgsR0FBa0IsS0FBSyxTQUFMLENBQWUsV0FBZixFQUFsQixHQUFpRCxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLE9BQXJCLENBQWxFO0FBQ0EsYUFBTyxRQUFRLENBQUMsSUFBVCxDQUFjLE9BQWQsQ0FBUDtBQUNIO0FBRUQ7Ozs7Ozs7OztrQ0FNYyxJLEVBQU0sSyxFQUFPO0FBQ3ZCLE1BQUEsS0FBSyxDQUFDLEtBQU4sQ0FBWSxJQUFJLENBQUMsS0FBTCxFQUFaO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OztpQ0FPYSxJLEVBQU0sUyxFQUFXLFMsRUFBVztBQUNyQyxhQUFPLElBQUksQ0FBQyxPQUFMLENBQWEsSUFBSSxDQUFDLFlBQUwsQ0FBa0IsU0FBbEIsRUFBNkIsU0FBN0IsQ0FBYixDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzsrQkFPVyxJLEVBQU0sSSxFQUFNLEksRUFBTTtBQUN6QixhQUFPLElBQUksQ0FBQyxZQUFMLENBQWtCLElBQWxCLEVBQXdCLElBQXhCLENBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7Z0NBTVksSyxFQUFPLE0sRUFBUTtBQUN2QixVQUFJLE1BQU0sS0FBSyxTQUFmLEVBQ0ksT0FBTyxLQUFLLENBQUMsTUFBTixFQUFQLENBREosS0FFSztBQUNELFFBQUEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxNQUFiO0FBQ0EsZUFBTyxJQUFQO0FBQ0g7QUFDSjtBQUVEOzs7Ozs7Ozs7b0NBTWdCLEssRUFBTyxPLEVBQVM7QUFDNUIsTUFBQSxLQUFLLENBQUMsT0FBTixDQUFjLENBQUMsQ0FBQyxTQUFGLENBQVksT0FBWixFQUFxQixJQUFyQixDQUFkO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzZCQU1TLEssRUFBTyxTLEVBQVc7QUFDdkIsVUFBSSxTQUFTLElBQUksSUFBakIsRUFDSSxTQUFTLEdBQUcsSUFBWjtBQUNKLGFBQU8sS0FBSyxDQUFDLE9BQU4sQ0FBYztBQUFFLFFBQUEsZ0JBQWdCLEVBQUU7QUFBcEIsT0FBZCxDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Z0NBS1ksRSxFQUFJO0FBQ1osV0FBSyxTQUFMLENBQWUsTUFBZixHQUF3QixPQUF4QixDQUFnQyxVQUFBLEtBQUssRUFBSTtBQUNyQyxZQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsU0FBTixFQUFqQjtBQUNBLFlBQUksUUFBSixFQUNJLFFBQVEsQ0FBQyxPQUFULENBQWlCLEVBQWpCO0FBQ1AsT0FKRDs7QUFLQSxhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7OEJBTVUsSSxFQUFNLEcsRUFBSztBQUNqQixVQUFJLENBQUMsR0FBRCxJQUFRLENBQUMsSUFBYixFQUFtQixNQUFNLElBQUksS0FBSixDQUFVLDhDQUFWLENBQU47QUFDbkIsVUFBSSxHQUFHLElBQUksSUFBWCxFQUFpQixPQUFPLElBQVA7QUFFakIsVUFBSSxHQUFHLENBQUMsTUFBSixLQUFlLFNBQW5CLEVBQ0ksSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFHLENBQUMsTUFBZixFQURKLEtBRUssSUFBSSxHQUFHLENBQUMsUUFBSixHQUFlLENBQW5CLEVBQ0QsSUFBSSxDQUFDLFFBQUwsR0FBZ0IsR0FBRyxDQUFDLFFBQXBCO0FBRUosVUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUwsR0FBYSxJQUFiLEVBQXBCO0FBQUEsVUFDSSxLQUFLLGNBQU8sV0FBUCxlQUF1QixJQUFJLENBQUMsU0FBTCxFQUF2QixDQURUO0FBQUEsVUFFSSxLQUFLLGNBQU8sV0FBUCxlQUF1QixJQUFJLENBQUMsWUFBTCxFQUF2QixDQUZUO0FBSUEsVUFBSSxLQUFLLFNBQUwsQ0FBZSxLQUFmLE1BQTBCLFNBQTlCLEVBQ0ksSUFBSSxDQUFDLEdBQUwsR0FBVyxNQUFYLENBQWtCLEtBQUssU0FBTCxDQUFlLEtBQWYsSUFBd0IsR0FBRyxDQUFDLEdBQUosR0FBVSxNQUFWLEVBQTFDO0FBRUosVUFBSSxLQUFLLFNBQUwsQ0FBZSxLQUFmLE1BQTBCLFNBQTlCLEVBQ0ksSUFBSSxDQUFDLE1BQUwsR0FBYyxLQUFkLENBQW9CLEtBQUssU0FBTCxDQUFlLEtBQWYsSUFBd0IsR0FBRyxDQUFDLE1BQUosR0FBYSxLQUFiLEVBQTVDO0FBRUosYUFBTyxJQUFQO0FBQ0g7Ozs7OztBQUdMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiAvXFx7XFx7KFtefV0qKVxcfVxcfS8sXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIG1lcmdlQ2VsbHM6IHRydWUsXG4gICAgZHVwbGljYXRlQ2VsbHM6IGZhbHNlLFxuICAgIGZvbGxvd0Zvcm11bGFlOiBmYWxzZSxcbiAgICBjb3B5U3R5bGU6IHRydWUsXG4gICAgY2FsbGJhY2tzTWFwOiB7XG4gICAgICAgICcnOiBkYXRhID0+IF8ua2V5cyhkYXRhKSxcbiAgICAgICAgJDogZGF0YSA9PiBfLnZhbHVlcyhkYXRhKVxuICAgIH1cbn07XG5cbmNvbnN0IHJlZlJlZ0V4cCA9IC8oJz8oW14hXSopPyc/ISk/KFtBLVpdK1xcZCspKDooW0EtWl0rXFxkKykpPy87XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZSwgdGFraW5nIGFuIGluc3RhbmNlIG9mIEV4Y2VsIHNoZWV0IGFjY2Vzc29yIGFuZCBhIEpTT04gb2JqZWN0IGFzIGRhdGEsIGFuZCBmaWxsaW5nIHRoZSB2YWx1ZXMgZnJvbSB0aGUgbGF0dGVyIGludG8gdGhlIGZvcm1lci5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggc3ByZWFkc2hlZXQgYWNjZXNzaW5nIGNsYXNzLlxuICAgICAqIEBwYXJhbSB7e319IG9wdHMgT3B0aW9ucyB0byBiZSB1c2VkIGR1cmluZyBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBvcHRzLnRlbXBsYXRlUmVnRXhwIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCBmb3IgdGVtcGxhdGUgcmVjb2duaXppbmcuIERlZmF1bHQgaXMgYC9cXHtcXHsoW159XSopXFx9XFx9L2AsIGkuZS4gTXVzdGFjaGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8UmVnRXhvfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyBvciByZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCBhcyB0ZW1wbGF0ZSBmaWVsZHMgc3BsaXR0ZXIuIERlZmF1bHQgaXMgYHxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmpvaW5UZXh0IFRoZSBzdHJpbmcgdG8gYmUgdXNlZCB3aGVuIHRoZSBleHRyYWN0ZWQgdmFsdWUgZm9yIGEgc2luZ2xlIGNlbGwgaXMgYW4gYXJyYXksIGFuZCBpdCBuZWVkcyB0byBiZSBqb2luZWQuIERlZmF1bHQgaXMgYCxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGJvb2xlYW59IG9wdHMubWVyZ2VDZWxscyBXaGV0aGVyIHRvIG1lcmdlIHRoZSBoaWdoZXIgZGltZW5zaW9uIGNlbGxzIGluIHRoZSBvdXRwdXQuIERlZmF1bHQgaXMgdHJ1ZSwgYnV0IHZhbGlkIHZhbHVlcyBhcmUgYWxzbyBgXCJib3RoXCJgLCBgXCJ2ZXJ0aWNhbFwiYCBhbmQgYFwiaG9yaXpvbnRhbFwiYC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xib29sZWFufSBvcHRzLmR1cGxpY2F0ZUNlbGxzIFdoZXRoZXIgdG8gZHVwbGljYXRlIHRoZSBjb250ZW50IG9mIGhpZ2hlciBkaW1lbnNpb24gY2VsbHMsIHdoZW4gbm90IG1lcmdlZC4gRGVmYXVsdCBpcyBmYWxzZS4gU2FtZSB2YWx1ZCB2YWx1ZXMgYXMgYG1lcmdlQ2VsbHNgLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5mb2xsb3dGb3JtdWxhZSBJZiBhIHRlbXBsYXRlIGlzIGxvY2F0ZWQgYXMgYSByZXN1bHQgb2YgYSBmb3JtdWxhLCB3aGV0aGVyIHRvIHN0aWxsIHByb2Nlc3MgaXQuIERlZmF1bHQgaXMgZmFsc2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRzLmNvcHlTdHlsZSBDb3B5IHRoZSBzdHlsZSBvZiB0aGUgdGVtcGxhdGUgY2VsbCB3aGVuIHBvcHVsYXRpbmcuIEV2ZW4gd2hlbiBgZmFsc2VgLCB0aGUgdGVtcGxhdGUgc3R5bGluZyBfaXNfIGFwcGxpZWQuIERlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgYW5kIHZhbHVlIGV4dHJhY3Rpb24uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWNjZXNzb3IsIG9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0cyA9IF8uZGVmYXVsdHNEZWVwKHt9LCBvcHRzLCBkZWZhdWx0T3B0cyk7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgICAgIHRoaXMuX2FjY2VzcyA9IGFjY2Vzc29yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHRlci9nZXR0ZXIgZm9yIFhsc3hEYXRhRmlsbCdzIG9wdGlvbnMgYXMgc2V0IGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAgICogQHBhcmFtIHt7fXxudWxsfSBuZXdPcHRzIElmIHNldCAtIHRoZSBuZXcgb3B0aW9ucyB0byBiZSB1c2VkLiBDaGVjayBbdXAgaGVyZV17QGxpbmsgI25ldy14bHN4ZGF0YWZpbGxhY2Nlc3Nvci1vcHRzfS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfHt9fSBUaGUgcmVxdWlyZWQgb3B0aW9ucyAoaW4gZ2V0dGVyIG1vZGUpIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0dGVyIG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3Igd2hvbGUgZGF0YSBwb3B1bGF0aW9uIG1lY2hhbmlzbS5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIHRvIGJlIGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbH0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgZmlsbERhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBkYXRhRmlsbHMgPSB7fTtcblx0XG4gICAgICAgIC8vIEJ1aWxkIHRoZSBkZXBlbmRlbmN5IGNvbm5lY3Rpb25zIGJldHdlZW4gdGVtcGxhdGVzLlxuICAgICAgICB0aGlzLmNvbGxlY3RUZW1wbGF0ZXModGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYUZpbGwgPSB7ICBcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsIFxuICAgICAgICAgICAgICAgIGRlcGVuZGVudHM6IFtdLFxuICAgICAgICAgICAgICAgIGZvcm11bGFzOiBbXSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmRmlsbCA9IGRhdGFGaWxsc1t0ZW1wbGF0ZS5yZWZlcmVuY2VdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcmVmRmlsbCkgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSByZWZlcmVuY2UgJyR7dGVtcGxhdGUucmVmZXJlbmNlfSchYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLmZvcm11bGEpIFxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmZvcm11bGFzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgIFxuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFGaWxsc1t0ZW1wbGF0ZS5pZF0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsbC5wcm9jZXNzZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZWxzZSBpZiAoZmlsbC50ZW1wbGF0ZS5mb3JtdWxhKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXJlZmVyZW5jaW5nIGZvcm11bGEgZm91bmQgJyR7ZmlsbC5leHRyYWN0b3J9Jy4gVXNlIGEgbm9uLXRlbXBsYXRlZCBvbmUhYCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbGwoZmlsbCwgZGF0YSwgZmlsbC50ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBwcm92aWRlZCBoYW5kbGVyIGZyb20gdGhlIG1hcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGFuZGxlck5hbWUgVGhlIG5hbWUgb2YgdGhlIGhhbmRsZXIuXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgaGFuZGxlciBmdW5jdGlvbiBpdHNlbGYuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldEhhbmRsZXIoaGFuZGxlck5hbWUpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlckZuID0gdGhpcy5fb3B0cy5jYWxsYmFja3NNYXBbaGFuZGxlck5hbWVdO1xuXG4gICAgICAgIGlmICghaGFuZGxlckZuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgY2Fubm90IGJlIGZvdW5kIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaGFuZGxlckZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgaXMgbm90IGEgZnVuY3Rpb24hYCk7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlckZuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpIHtcbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RQYXJ0cyA9IGV4dHJhY3Rvci5zcGxpdChcIjpcIiksXG4gICAgICAgICAgICBoYW5kbGVyTmFtZSA9IF8udHJpbShleHRyYWN0UGFydHNbMV0pO1xuXG4gICAgICAgIHJldHVybiBleHRyYWN0UGFydHMubGVuZ3RoID09IDFcbiAgICAgICAgICAgID8geyBwYXRoOiBleHRyYWN0b3IsIGhhbmRsZXI6IG51bGwgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgcGF0aDogXy50cmltKGV4dHJhY3RQYXJ0c1swXSksXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogdGhpcy5nZXRIYW5kbGVyKGhhbmRsZXJOYW1lKVxuICAgICAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBzdHlsZSBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSBvbnRvIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGRlc3RpbmF0aW9uIGNlbGwgdG8gYXBwbHkgc3R5bGluZyB0by5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIGNodW5rIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRvIGJlIHVzZWQgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7RGF0YUZpbGxlcn0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcblxuICAgICAgICBpZiAodGhpcy5fb3B0cy5jb3B5U3R5bGUpXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiIVwiKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgcGFpci5leHRyYWN0b3IsIGNlbGwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxTdHlsZShjZWxsLCBwYWlyLm5hbWUsIEpTT04ucGFyc2UodmFsKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IHRoZSBvcHRpb25zLXNwZWNpZmljIHBhcmFtZXRlcnMgZnJvbSB0aGUgc3R5bGVzIGZpZWxkIGFuZCBtZXJnZSB0aGVtIHdpdGggdGhlIGdsb2JhbCBvbmVzLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBleHRyYWN0IG9wdGlvbnMgcHJvcGVydGllcyBmcm9tLlxuICAgICAqIEByZXR1cm5zIHt7fX0gVGhlIGZ1bGwgb3B0aW9ucywgXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldFRlbXBsYXRlT3B0cyh0ZW1wbGF0ZSkge1xuICAgICAgICBpZiAoIXRlbXBsYXRlLnN0eWxlcylcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0cyA9IF8uY2xvbmUodGhpcy5fb3B0cyk7XG4gICAgICAgIF8uZWFjaCh0ZW1wbGF0ZS5zdHlsZXMsIHBhaXIgPT4ge1xuICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiIVwiKSlcbiAgICAgICAgICAgICAgICBvcHRzW3BhaXIubmFtZS5zdWJzdHIoMSldID0gSlNPTi5wYXJzZShwYWlyLmV4dHJhY3Rvcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBvcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgY29udGVudHMgb2YgdGhlIGNlbGwgaW50byBhIHZhbGlkIHRlbXBsYXRlIGluZm8uXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIGNvbnRhaW5pbmcgdGhlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBwYXJzZWQgdGVtcGxhdGUuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGJ1aWxkcyB0ZW1wbGF0ZSBpbmZvLCB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBzdXBwbGllZCBvcHRpb25zLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwpO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZU1hdGNoID0gdmFsdWUubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIGlmICghcmVNYXRjaCB8fCAhdGhpcy5fb3B0cy5mb2xsb3dGb3JtdWxhZSAmJiB0aGlzLl9hY2Nlc3MuY2VsbFR5cGUoY2VsbCkgPT09ICdmb3JtdWxhJykgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpLFxuICAgICAgICAgICAgZXh0cmFjdG9yID0gcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGxSZWYgPSB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICcke3JlTWF0Y2hbMF19J2ApO1xuICAgICAgICBpZiAoISFwYXJ0c1swXSAmJiAhY2VsbFJlZilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWZlcmVuY2UgcGFzc2VkOiAnJHtwYXJ0c1swXX0nYCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiB0aGlzLl9hY2Nlc3MuY2VsbFJlZihjZWxsKSxcbiAgICAgICAgICAgIHJlZmVyZW5jZTogY2VsbFJlZixcbiAgICAgICAgICAgIGl0ZXJhdG9yczogcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBleHRyYWN0b3I6IGV4dHJhY3RvcixcbiAgICAgICAgICAgIGZvcm11bGE6IGV4dHJhY3Rvci5zdGFydHNXaXRoKFwiPVwiKSxcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgc29ydFRlbXBsYXRlcyhsaXN0KSB7XG4gICAgICAgIGNvbnN0IHNvcnRlZCA9IFtdLFxuICAgICAgICAgICAgcmVsYXRlZCA9IHt9LFxuICAgICAgICAgICAgbWFwID0ge30sXG4gICAgICAgICAgICBmcmVlTGlzdCA9IFtdO1xuXG4gICAgICAgIC8vIEZpcnN0LCBtYWtlIHRoZSBkZXBlbmRlbmN5IG1hcCBhbmQgYWRkIHRoZSBsaXN0IG9mIG5vbi1yZWZlcmVuY2luZyB0ZW1wbGF0ZXNcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBjb25zdCB0ID0gbGlzdFtpXTtcbiAgICAgICAgICAgIG1hcFt0LmlkXSA9IGk7XG5cbiAgICAgICAgICAgIGlmICghdC5yZWZlcmVuY2UpXG4gICAgICAgICAgICAgICAgZnJlZUxpc3QucHVzaCh0LmlkKTtcbiAgICAgICAgICAgIGVsc2UgXG4gICAgICAgICAgICAgICAgKHJlbGF0ZWRbdC5yZWZlcmVuY2VdID0gcmVsYXRlZFt0LnJlZmVyZW5jZV0gfHwgW10pLnB1c2godC5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3csIG1ha2UgdGhlIGFjdHVhbCBzb3J0aW5nLlxuICAgICAgICB3aGlsZSAoZnJlZUxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaWQgPSBmcmVlTGlzdC5zaGlmdCgpLFxuICAgICAgICAgICAgICAgIHQgPSBsaXN0W21hcFtpZF1dO1xuXG4gICAgICAgICAgICBzb3J0ZWQucHVzaCh0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gV2UgdXNlIHRoZSBmYWN0IHRoYXQgdGhlcmUgaXMgYSBzaW5nbGUgcHJlZGVjZXNzb3IgaW4gb3VyIHNldHVwLlxuICAgICAgICAgICAgaWYgKHJlbGF0ZWRbdC5pZF0pXG4gICAgICAgICAgICAgICAgZnJlZUxpc3QucHVzaCguLi5yZWxhdGVkW3QuaWRdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzb3J0ZWQubGVuZ3RoIDwgbGlzdC5sZW5ndGgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEEgcmVmZXJlbmNlIGN5Y2xlIGZvdW5kLCBpbnZvbHZpbmcgXCIke18ubWFwKF8ueG9yKGxpc3QsIHNvcnRlZCksICdpZCcpLmpvaW4oJywnKX1cIiFgKTtcblxuICAgICAgICByZXR1cm4gc29ydGVkO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgd2hvbGUgd29ya2Jvb2sgZm9yIHRlbXBsYXRlIHBhdHRlcm4gYW5kIGNvbnN0cnVjdHMgdGhlIHRlbXBsYXRlcyBmb3IgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBvbiBlYWNoIHRlbXBsYXRlZCwgYWZ0ZXIgdGhleSBhcmUgc29ydGVkLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZW1wbGF0ZXMgY29sbGVjdGVkIGFyZSBzb3J0ZWQsIGJhc2VkIG9uIHRoZSBpbnRyYS10ZW1wbGF0ZSByZWZlcmVuY2UgLSBpZiBvbmUgdGVtcGxhdGVcbiAgICAgKiBpcyByZWZlcnJpbmcgYW5vdGhlciBvbmUsIGl0J2xsIGFwcGVhciBfbGF0ZXJfIGluIHRoZSByZXR1cm5lZCBhcnJheSwgdGhhbiB0aGUgcmVmZXJyZWQgdGVtcGxhdGUuXG4gICAgICogVGhpcyBpcyB0aGUgb3JkZXIgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGludm9rZWQgb24uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5zb3J0VGVtcGxhdGVzKGFsbFRlbXBsYXRlcykuZm9yRWFjaChjYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgdGhlIHZhbHVlKHMpIGZyb20gdGhlIHByb3ZpZGVkIGRhdGEgYHJvb3RgIHRvIGJlIHNldCBpbiB0aGUgcHJvdmlkZWQgYGNlbGxgLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSBleHRyYWN0ZWQgdmFsdWVzIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgZXh0cmFjdGlvbiBzdHJpbmcgcHJvdmlkZWQgYnkgdGhlIHRlbXBsYXRlLiBVc3VhbGx5IGEgSlNPTiBwYXRoIHdpdGhpbiB0aGUgZGF0YSBgcm9vdGAuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgcmVmZXJlbmNlIGNlbGwsIGlmIHN1Y2ggZXhpc3RzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVtYmVyfERhdGV8QXJyYXl8QXJyYXkuPEFycmF5LjwqPj59IFRoZSB2YWx1ZSB0byBiZSB1c2VkLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBpcyB1c2VkIGV2ZW4gd2hlbiBhIHdob2xlIC0gcG9zc2libHkgcmVjdGFuZ3VsYXIgLSByYW5nZSBpcyBhYm91dCB0byBiZSBzZXQsIHNvIGl0IGNhblxuICAgICAqIHJldHVybiBhbiBhcnJheSBvZiBhcnJheXMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3RWYWx1ZXMocm9vdCwgZXh0cmFjdG9yLCBjZWxsKSB7XG4gICAgICAgIGNvbnN0IHsgcGF0aCwgaGFuZGxlciB9ID0gdGhpcy5wYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShyb290KSlcbiAgICAgICAgICAgIHJvb3QgPSBfLmdldChyb290LCBwYXRoLCByb290KTtcbiAgICAgICAgZWxzZSBpZiAocm9vdC5zaXplcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcm9vdCA9ICFleHRyYWN0b3IgPyByb290IDogXy5tYXAocm9vdCwgZW50cnkgPT4gdGhpcy5leHRyYWN0VmFsdWVzKGVudHJ5LCBleHRyYWN0b3IsIGNlbGwpKTtcbiAgICAgICAgZWxzZSBpZiAoIWhhbmRsZXIpXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5qb2luKHRoaXMuX29wdHMuam9pblRleHQgfHwgXCIsXCIpO1xuXG4gICAgICAgIHJldHVybiAhaGFuZGxlciA/IHJvb3QgOiBoYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgcm9vdCwgY2VsbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgYW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBkYXRhIGZvciB0aGUgZ2l2ZW4gZmlsbCwgYmFzZWQgb24gdGhlIGdpdmVuXG4gICAgICogcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgbWFpbiByZWZlcmVuY2Ugb2JqZWN0IHRvIGFwcGx5IGl0ZXJhdG9ycyB0by5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpdGVyYXRvcnMgTGlzdCBvZiBpdGVyYXRvcnMgLSBzdHJpbmcgSlNPTiBwYXRocyBpbnNpZGUgdGhlIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggVGhlIGluZGV4IGluIHRoZSBpdGVyYXRvcnMgYXJyYXkgdG8gd29yayBvbi5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8QXJyYXkuPEFycmF5Pn0gQW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBleHRyYWN0ZWQgZGF0YS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdERhdGEocm9vdCwgaXRlcmF0b3JzLCBpZHgpIHtcbiAgICAgICAgbGV0IGl0ZXIgPSBpdGVyYXRvcnNbaWR4XSxcbiAgICAgICAgICAgIHNpemVzID0gW10sXG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gZmFsc2UsXG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoaXRlciA9PSAnMScpIHtcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgaXRlciA9IGl0ZXJhdG9yc1srK2lkeF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWl0ZXIpIHJldHVybiByb290O1xuXG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBwYXJzZWRJdGVyID0gdGhpcy5wYXJzZUV4dHJhY3RvcihpdGVyKTtcblxuICAgICAgICBkYXRhID0gXy5nZXQocm9vdCwgcGFyc2VkSXRlci5wYXRoLCByb290KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcGFyc2VkSXRlci5oYW5kbGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgZGF0YSA9IHBhcnNlZEl0ZXIuaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIGRhdGEpO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgZWxzZSBpZiAoaWR4IDwgaXRlcmF0b3JzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBfLm1hcChkYXRhLCBpblJvb3QgPT4gdGhpcy5leHRyYWN0RGF0YShpblJvb3QsIGl0ZXJhdG9ycywgaWR4ICsgMSkpO1xuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhWzBdLnNpemVzIHx8IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKCFjZWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCByZWZlcmVuY2UgY2VsbCBpbiAncHV0VmFsdWVzKCknIVwiKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gZGF0YS5zaXplcyxcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHRlbXBsYXRlLmV4dHJhY3RvciwgY2VsbCk7XG5cbiAgICAgICAgLy8gaWYgd2UndmUgY29tZSB1cCB3aXRoIGEgcmF3IGRhdGFcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAhZW50cnlTaXplIHx8ICFlbnRyeVNpemUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFZhbHVlKGNlbGwsIHZhbHVlKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgZW50cnlTaXplID0gdGVtcGxhdGUuY2VsbFNpemU7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA8PSAyKSB7XG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgdGhlIHNpemUgYW5kIGRhdGEuXG4gICAgICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IFsxLCAtZW50cnlTaXplWzBdXTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gZW50cnlTaXplLmNvbmNhdChbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gXy5jaHVuayh2YWx1ZSwgMSk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IF8uY2h1bmsoZGF0YSwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSkuZm9yRWFjaCgoY2VsbCwgcmksIGNpKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZVtyaV1bY2ldKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGFbcmldW2NpXSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZXMgZXh0cmFjdGVkIHdpdGggJyR7dGVtcGxhdGUuZXh0cmFjdG9yfScgYXJlIG1vcmUgdGhhbiAyIGRpbWVuc2lvbiEnYCk7XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZmlsdGVyIG9udG8gdGhlIHNoZWV0IC0gZXh0cmFjdGluZyB0aGUgcHJvcGVyIGRhdGEsIGZvbGxvd2luZyBkZXBlbmRlbnQgZmlsbHMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RmlsbChhRmlsbCwgcm9vdCwgbWFpbkNlbGwpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHRoZURhdGEgPSB0aGlzLmV4dHJhY3REYXRhKHJvb3QsIHRlbXBsYXRlLml0ZXJhdG9ycywgMCk7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IFsxLCAxXTtcblxuICAgICAgICBpZiAoIWFGaWxsLmRlcGVuZGVudHMgfHwgIWFGaWxsLmRlcGVuZGVudHMubGVuZ3RoKVxuICAgICAgICAgICAgZW50cnlTaXplID0gdGhpcy5wdXRWYWx1ZXMobWFpbkNlbGwsIHRoZURhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV4dENlbGwgPSBtYWluQ2VsbDtcbiAgICAgICAgICAgIGNvbnN0IHNpemVNYXh4ZXIgPSAodmFsLCBpZHgpID0+IGVudHJ5U2l6ZVtpZHhdID0gTWF0aC5tYXgoZW50cnlTaXplW2lkeF0sIHZhbCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgdGhlRGF0YS5sZW5ndGg7ICsrZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluUm9vdCA9IHRoZURhdGFbZF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmID0gMDsgZiA8IGFGaWxsLmRlcGVuZGVudHMubGVuZ3RoOyArK2YpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5GaWxsID0gYUZpbGwuZGVwZW5kZW50c1tmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluQ2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCBpbkZpbGwub2Zmc2V0WzBdLCBpbkZpbGwub2Zmc2V0WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdLFxuICAgICAgICAgICAgICAgICAgICByb3dQYWRkaW5nID0gdGVtcGxhdGUucGFkZGluZ1swXSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBjb2xQYWRkaW5nID0gdGVtcGxhdGUucGFkZGluZ1sxXSB8fCAwO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUucGFkZGluZy5sZW5ndGggPCAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29sUGFkZGluZyA9IHJvd1BhZGRpbmc7XG4gICAgICAgICAgICAgICAgICAgIHJvd09mZnNldCA9IHJvd1BhZGRpbmcgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhlRGF0YS5zaXplcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGNvbFBhZGRpbmcgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMF0gPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyb3dPZmZzZXQgPiAxIHx8IGNvbE9mZnNldCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShuZXh0Q2VsbCwgTWF0aC5tYXgocm93T2Zmc2V0IC0gMSwgMCksIE1hdGgubWF4KGNvbE9mZnNldCAtIDEsIDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9vcHRzID0gdGhpcy5nZXRUZW1wbGF0ZU9wdHModGVtcGxhdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChfb3B0cy5tZXJnZUNlbGxzID09PSB0cnVlIHx8IF9vcHRzLm1lcmdlQ2VsbCA9PT0gJ2JvdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCByb3dPZmZzZXQgPiAxICYmIF9vcHRzLm1lcmdlQ2VsbHMgPT09ICd2ZXJ0aWNhbCcgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBjb2xPZmZzZXQgPiAxICYmIF9vcHRzLm1lcmdlQ2VsbHMgPT09ICdob3Jpem9udGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5yYW5nZU1lcmdlZChybmcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChfb3B0cy5kdXBsaWNhdGVDZWxscyA9PT0gdHJ1ZSB8fCBfb3B0cy5kdXBsaWNhdGVDZWxscyA9PT0gJ2JvdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCByb3dPZmZzZXQgPiAxICYmIF9vcHRzLmR1cGxpY2F0ZUNlbGxzID09PSAndmVydGljYWwnIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29sT2Zmc2V0ID4gMSAmJiBfb3B0cy5kdXBsaWNhdGVDZWxscyA9PT0gJ2hvcml6b250YWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmR1cGxpY2F0ZUNlbGwobmV4dENlbGwsIHJuZyk7XG5cbiAgICAgICAgICAgICAgICAgICAgcm5nLmZvckVhY2goY2VsbCA9PiB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGluUm9vdCwgdGVtcGxhdGUpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGaW5hbGx5LCBjYWxjdWxhdGUgdGhlIG5leHQgY2VsbC5cbiAgICAgICAgICAgICAgICBuZXh0Q2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCByb3dPZmZzZXQgKyByb3dQYWRkaW5nLCBjb2xPZmZzZXQgKyBjb2xQYWRkaW5nKTtcdFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOb3cgcmVjYWxjIGNvbWJpbmVkIGVudHJ5IHNpemUuXG4gICAgICAgICAgICBfLmZvckVhY2godGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZShtYWluQ2VsbCwgbmV4dENlbGwpLCBzaXplTWF4eGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF8uZm9yRWFjaChhRmlsbC5mb3JtdWxhcywgZiA9PiB0aGlzLmFwcGx5Rm9ybXVsYShmLCBlbnRyeVNpemUsIG1haW5DZWxsKSk7XG5cbiAgICAgICAgYUZpbGwucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGEgZm9ybXVsYSBiZSBzaGlmdGluZyBhbGwgdGhlIGZpeGVkIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZm9ybXVsYSBUaGUgZm9ybXVsYSB0byBiZSBzaGlmdGVkLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IG9mZnNldCBUaGUgb2Zmc2V0IG9mIHRoZSByZWZlcmVuY2VkIHRlbXBsYXRlIHRvIHRoZSBmb3JtdWxhIG9uZS5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcixOdW1iZXI+fSBzaXplIFRoZSBzaXplIG9mIHRoZSByYW5nZXMgYXMgdGhleSBzaG91bGQgYmUuXG4gICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHByb2Nlc3NlZCB0ZXh0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBzaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBzaXplKSB7XG4gICAgICAgIGxldCBuZXdGb3JtdWxhID0gJyc7XG5cbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmb3JtdWxhLm1hdGNoKHJlZlJlZ0V4cCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKSBicmVhaztcblxuICAgICAgICAgICAgbGV0IGZyb20gPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbChtYXRjaFszXSwgbWF0Y2hbMl0pLFxuICAgICAgICAgICAgICAgIG5ld1JlZiA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChvZmZzZXRbMF0gPiAwIHx8IG9mZnNldFsxXSA+IDApXG4gICAgICAgICAgICAgICAgZnJvbSA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKGZyb20sIG9mZnNldFswXSwgb2Zmc2V0WzFdKTtcblxuICAgICAgICAgICAgbmV3UmVmID0gIW1hdGNoWzVdXG4gICAgICAgICAgICAgICAgPyB0aGlzLl9hY2Nlc3MuY2VsbFJlZihmcm9tLCAhIW1hdGNoWzJdKVxuICAgICAgICAgICAgICAgIDogdGhpcy5fYWNjZXNzLnJhbmdlUmVmKHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoZnJvbSwgc2l6ZVswXSwgc2l6ZVsxXSksICEhbWF0Y2hbMl0pO1xuXG4gICAgICAgICAgICBuZXdGb3JtdWxhICs9IGZvcm11bGEuc3Vic3RyKDAsIG1hdGNoLmluZGV4KSArIG5ld1JlZjtcbiAgICAgICAgICAgIGZvcm11bGEgPSBmb3JtdWxhLnN1YnN0cihtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdGb3JtdWxhICs9IGZvcm11bGE7XG4gICAgICAgIHJldHVybiBuZXdGb3JtdWxhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHRoZSBnaXZlbiBmb3JtdWxhIGluIHRoZSBzaGVldCwgaS5lLiBjaGFuZ2luZyBpdCB0byBtYXRjaCB0aGUgXG4gICAgICogc2l6ZXMgb2YgdGhlIHJlZmVyZW5jZXMgdGVtcGxhdGVzLlxuICAgICAqIEBwYXJhbSB7e319IGFGaWxsIFRoZSBmaWxsIHRvIGJlIGFwcGxpZWQsIGFzIGNvbnN0cnVjdGVkIGluIHRoZSB7QGxpbmsgZmlsbERhdGF9IG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcj59IGVudHJ5U2l6ZSBUaGUgZmlsbC10by1zaXplIG1hcCwgYXMgY29uc3RydWN0ZWQgc28gZmFyXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIHB1dC9zdGFydCB0aGlzIGZvcm11bGEgaW50b1xuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5Rm9ybXVsYShhRmlsbCwgZW50cnlTaXplLCBjZWxsKSB7XG4gICAgICAgIGNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChjZWxsLCBhRmlsbC5vZmZzZXRbMF0sIGFGaWxsLm9mZnNldFsxXSk7XG5cbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIGl0ZXIgPSBfLnRyaW0odGVtcGxhdGUuaXRlcmF0b3JzWzBdKSxcbiAgICAgICAgICAgIG9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UodGVtcGxhdGUuY2VsbCwgY2VsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgbGV0IGZvcm11bGEgPSB0ZW1wbGF0ZS5leHRyYWN0b3IsIFxuICAgICAgICAgICAgcm5nO1xuICAgICAgICAgICAgXG4gICAgICAgIGFGaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsVmFsdWUoY2VsbCwgbnVsbCk7XG5cbiAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDIgJiYgZW50cnlTaXplWzFdIDwgMiB8fCBpdGVyID09PSAnYm90aCcpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCAwXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZXIgPT09ICdjb2xzJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgMCwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ3Jvd3MnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbMCwgZW50cnlTaXplWzFdIC0gMV0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCAwKTtcbiAgICAgICAgfSBlbHNlIHsgLy8gaS5lLiAnbm9uZSdcbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsRm9ybXVsYShjZWxsLCB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFtlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxXSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWNjZXNzLnNldFJhbmdlRm9ybXVsYShybmcsIGZvcm11bGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaGUgYnVpbHQtaW4gYWNjZXNzb3IgYmFzZWQgb24geGxzeC1wb3B1bGF0ZSBucG0gbW9kdWxlXG4gKiBAdHlwZSB7WGxzeFBvcHVsYXRlQWNjZXNzfVxuICovXG5YbHN4RGF0YUZpbGwuWGxzeFBvcHVsYXRlQWNjZXNzID0gcmVxdWlyZSgnLi9YbHN4UG9wdWxhdGVBY2Nlc3MnKTtcblhsc3hEYXRhRmlsbC52ZXJzaW9uID0gXCJ7e1ZFUlNJT059fVwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hEYXRhRmlsbDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8vIGNvbnN0IGFsbFN0eWxlcyA9IFtcbi8vICAgICBcImJvbGRcIiwgXG4vLyAgICAgXCJpdGFsaWNcIiwgXG4vLyAgICAgXCJ1bmRlcmxpbmVcIiwgXG4vLyAgICAgXCJzdHJpa2V0aHJvdWdoXCIsIFxuLy8gICAgIFwic3Vic2NyaXB0XCIsIFxuLy8gICAgIFwic3VwZXJzY3JpcHRcIiwgXG4vLyAgICAgXCJmb250U2l6ZVwiLCBcbi8vICAgICBcImZvbnRGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250R2VuZXJpY0ZhbWlseVwiLCBcbi8vICAgICBcImZvbnRTY2hlbWVcIiwgXG4vLyAgICAgXCJmb250Q29sb3JcIiwgXG4vLyAgICAgXCJob3Jpem9udGFsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwianVzdGlmeUxhc3RMaW5lXCIsIFxuLy8gICAgIFwiaW5kZW50XCIsIFxuLy8gICAgIFwidmVydGljYWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJ3cmFwVGV4dFwiLCBcbi8vICAgICBcInNocmlua1RvRml0XCIsIFxuLy8gICAgIFwidGV4dERpcmVjdGlvblwiLCBcbi8vICAgICBcInRleHRSb3RhdGlvblwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENvdW50ZXJjbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0VXBcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0RG93blwiLCBcbi8vICAgICBcInZlcnRpY2FsVGV4dFwiLCBcbi8vICAgICBcImZpbGxcIiwgXG4vLyAgICAgXCJib3JkZXJcIiwgXG4vLyAgICAgXCJib3JkZXJDb2xvclwiLCBcbi8vICAgICBcImJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclwiLCBcInJpZ2h0Qm9yZGVyXCIsIFwidG9wQm9yZGVyXCIsIFwiYm90dG9tQm9yZGVyXCIsIFwiZGlhZ29uYWxCb3JkZXJcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyQ29sb3JcIiwgXCJyaWdodEJvcmRlckNvbG9yXCIsIFwidG9wQm9yZGVyQ29sb3JcIiwgXCJib3R0b21Cb3JkZXJDb2xvclwiLCBcImRpYWdvbmFsQm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyU3R5bGVcIiwgXCJyaWdodEJvcmRlclN0eWxlXCIsIFwidG9wQm9yZGVyU3R5bGVcIiwgXCJib3R0b21Cb3JkZXJTdHlsZVwiLCBcImRpYWdvbmFsQm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJkaWFnb25hbEJvcmRlckRpcmVjdGlvblwiLCBcbi8vICAgICBcIm51bWJlckZvcm1hdFwiXG4vLyBdO1xuXG5sZXQgX1JpY2hUZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBgeHNseC1wb3B1bGF0ZWAgbGlicmFyeSBiYXNlZCBhY2Nlc3NvciB0byBhIGdpdmVuIEV4Y2VsIHdvcmtib29rLiBBbGwgdGhlc2UgbWV0aG9kcyBhcmUgaW50ZXJuYWxseSB1c2VkIGJ5IHtAbGluayBYbHN4RGF0YUZpbGx9LCBcbiAqIGJ1dCBjYW4gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgaW1wbGVtZW50aW5nIGN1c3RvbSBzcHJlYWRzaGVldCBhY2Nlc3NvcnMuXG4gKi9cbmNsYXNzIFhsc3hQb3B1bGF0ZUFjY2VzcyB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4U21hcnRUZW1wbGF0ZSB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtXb3JrYm9va30gd29ya2Jvb2sgLSBUaGUgd29ya2Jvb2sgdG8gYmUgYWNjZXNzZWQuXG4gICAgICogQHBhcmFtIHtYbHN4UG9wdWxhdGV9IFhsc3hQb3B1bGF0ZSAtIFRoZSBhY3R1YWwgeGxzeC1wb3B1bGF0ZSBsaWJyYXJ5IG9iamVjdC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGBYbHN4UG9wdWxhdGVgIG9iamVjdCBuZWVkIHRvIGJlIHBhc3NlZCBpbiBvcmRlciB0byBleHRyYWN0XG4gICAgICogY2VydGFpbiBpbmZvcm1hdGlvbiBmcm9tIGl0LCBfd2l0aG91dF8gcmVmZXJyaW5nIHRoZSB3aG9sZSBsaWJyYXJ5LCB0aHVzXG4gICAgICogYXZvaWRpbmcgbWFraW5nIHRoZSBgeGxzeC1kYXRhZmlsbGAgcGFja2FnZSBhIGRlcGVuZGVuY3kuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod29ya2Jvb2ssIFhsc3hQb3B1bGF0ZSkge1xuICAgICAgICB0aGlzLl93b3JrYm9vayA9IHdvcmtib29rO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgIFxuICAgICAgICBfUmljaFRleHQgPSBYbHN4UG9wdWxhdGUuUmljaFRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCB3b3JrYm9vayBmb3IgZGlyZWN0IFhsc3hQb3B1bGF0ZSBtYW5pcHVsYXRpb24uXG4gICAgICogQHJldHVybnMge1dvcmtib29rfSBUaGUgd29ya2Jvb2sgaW52b2x2ZWQuXG4gICAgICovXG4gICAgd29ya2Jvb2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3JrYm9vazsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiBjZWxsJ3MgY29udGVudHMuXG4gICAgICovXG4gICAgY2VsbFZhbHVlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIHJldHVybiB0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dCA/IHRoZVZhbHVlLnRleHQoKSA6IHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSByZXF1ZXN0ZWQgdmFsdWUgZm9yIHNldHRpbmcuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRWl0aGVyIHRoZSByZXF1ZXN0ZWQgdmFsdWUgb3IgY2hhaW5hYmxlIHRoaXMuXG4gICAgICovXG4gICAgc2V0Q2VsbFZhbHVlKGNlbGwsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwudmFsdWUodmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0eXBlIG9mIHRoZSBjZWxsIC0gJ2Zvcm11bGEnLCAncmljaHRleHQnLCBcbiAgICAgKiAndGV4dCcsICdudW1iZXInLCAnZGF0ZScsICdoeXBlcmxpbmsnLCBvciAndW5rbm93bic7XG4gICAgICovXG4gICAgY2VsbFR5cGUoY2VsbCkge1xuICAgICAgICBpZiAoY2VsbC5mb3JtdWxhKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2Zvcm11bGEnO1xuICAgICAgICBlbHNlIGlmIChjZWxsLmh5cGVybGluaygpKVxuICAgICAgICAgICAgcmV0dXJuICdoeXBlcmxpbmsnO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dClcbiAgICAgICAgICAgIHJldHVybiAncmljaHRleHQnO1xuICAgICAgICBlbHNlIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIERhdGUpXG4gICAgICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGVWYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBmb3JtdWxhIGluIHRoZSBjZWxsXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm11bGEgLSB0aGUgdGV4dCBvZiB0aGUgZm9ybXVsYSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHNldENlbGxGb3JtdWxhKGNlbGwsIGZvcm11bGEpIHtcbiAgICAgICAgY2VsbC5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVhc3VyZXMgdGhlIGRpc3RhbmNlLCBhcyBhIHZlY3RvciBiZXR3ZWVuIHR3byBnaXZlbiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGZyb20gVGhlIGZpcnN0IGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSB0byBUaGUgc2Vjb25kIGNlbGwuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gY2VsbHMuXG4gICAgICovXG4gICAgY2VsbERpc3RhbmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB0by5yb3dOdW1iZXIoKSAtIGZyb20ucm93TnVtYmVyKCksXG4gICAgICAgICAgICB0by5jb2x1bW5OdW1iZXIoKSAtIGZyb20uY29sdW1uTnVtYmVyKClcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIGNlbGwsIHRha2luZyBpbnRvIGFjY291bnQgaWYgaXQgaXMgcGFydCBvZiBhIG1lcmdlZCByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgb2NjdXBpZWQgc2l6ZS5cbiAgICAgKi9cbiAgICBjZWxsU2l6ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxBZGRyID0gY2VsbC5hZGRyZXNzKCk7XG4gICAgICAgIGxldCB0aGVTaXplID0gWzEsIDFdO1xuICAgIFxuICAgICAgICBfLmZvckVhY2goY2VsbC5zaGVldCgpLl9tZXJnZUNlbGxzLCByYW5nZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByYW5nZUFkZHIgPSByYW5nZS5hdHRyaWJ1dGVzLnJlZi5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAocmFuZ2VBZGRyWzBdID09IGNlbGxBZGRyKSB7XG4gICAgICAgICAgICAgICAgdGhlU2l6ZSA9IHRoaXMuY2VsbERpc3RhbmNlKGNlbGwsIGNlbGwuc2hlZXQoKS5jZWxsKHJhbmdlQWRkclsxXSkpO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVswXTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoZVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0Q2VsbFN0eWxlKGNlbGwsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwuc3R5bGUobmFtZSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVmZXJlbmNlIElkIGZvciBhIGdpdmVuIGNlbGwsIGJhc2VkIG9uIGl0cyBzaGVldCBhbmQgYWRkcmVzcy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gY3JlYXRlIGEgcmVmZXJlbmNlIElkIHRvLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBpZCB0byBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciB0aGlzIGNlbGwuXG4gICAgICovXG4gICAgY2VsbFJlZihjZWxsLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNlbGwuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhIHJlZmVyZW5jZSBzdHJpbmcgZm9yIGEgY2VsbCBpZGVudGlmaWVkIGJ5IEBwYXJhbSBhZHIsIGZyb20gdGhlIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIGNlbGwgdGhhdCBpcyBhIGJhc2Ugb2YgdGhlIHJlZmVyZW5jZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRyIFRoZSBhZGRyZXNzIG9mIHRoZSB0YXJnZXQgY2VsbCwgYXMgbWVudGlvbmVkIGluIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEgcmVmZXJlbmNlIHN0cmluZyBpZGVudGlmeWluZyB0aGUgdGFyZ2V0IGNlbGwgdW5pcXVlbHkuXG4gICAgICovXG4gICAgYnVpbGRSZWYoY2VsbCwgYWRyLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGFkciA/IGNlbGwuc2hlZXQoKS5jZWxsKGFkcikuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEdXBsaWNhdGVzIGEgY2VsbCBhY3Jvc3MgYSBnaXZlbiByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQ2VsbCwgd2hpY2ggbmVlZHMgZHVwbGljYXRpbmcuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgZHVwbGljYXRlQ2VsbChjZWxsLCByYW5nZSkge1xuICAgICAgICByYW5nZS52YWx1ZShjZWxsLnZhbHVlKCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgY2VsbCBhdCBhIGNlcnRhaW4gb2Zmc2V0IGZyb20gYSBnaXZlbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSByZWZlcmVuY2UgY2VsbCB0byBtYWtlIHRoZSBvZmZzZXQgZnJvbS5cbiAgICAgKiBAcGFyYW0ge2ludH0gcm93cyBOdW1iZXIgb2Ygcm93cyB0byBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtpbnR9IGNvbHMgTnVtYmVyIG9mIGNvbHVtbnMgdG8gb2Zmc2V0LlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBUaGUgcmVzdWx0aW5nIGNlbGwuXG4gICAgICovXG4gICAgb2Zmc2V0Q2VsbChjZWxsLCByb3dzLCBjb2xzKSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJlbGF0aXZlQ2VsbChyb3dzLCBjb2xzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBvciBzcGxpdCByYW5nZSBvZiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXR1cyBUaGUgbWVyZ2VkIHN0YXR1cyB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgcmFuZ2VNZXJnZWQocmFuZ2UsIHN0YXR1cykge1xuICAgICAgICBpZiAoc3RhdHVzID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gcmFuZ2UubWVyZ2VkKCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmFuZ2UubWVyZ2VkKHN0YXR1cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBmb3JtdWxhIGZvciB0aGUgd2hvbGUgcmFuZ2UuIElmIGl0IGNvbnRhaW5zIG9ubHkgb25lIC0gaXQgaXMgc2V0IGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBzZXRSYW5nZUZvcm11bGEocmFuZ2UsIGZvcm11bGEpIHtcbiAgICAgICAgcmFuZ2UuZm9ybXVsYShfLnRyaW1TdGFydChmb3JtdWxhLCAnID0nKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZ2l2ZW4gcmFuZ2UuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlIHdoaWNoIGFkZHJlc3Mgd2UncmUgaW50ZXJlc3RlZCBpbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgc2hlZXQgbmFtZSBpbiB0aGUgYWRkcmVzcy5cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcsIHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gcmFuZ2UuXG4gICAgICovXG4gICAgcmFuZ2VSZWYocmFuZ2UsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcmFuZ2UuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJdGVyYXRlIG92ZXIgYWxsIHVzZWQgY2VsbHMgb2YgdGhlIGdpdmVuIHdvcmtib29rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggYGNlbGxgIGFyZ3VtZW50IGZvciBlYWNoIHVzZWQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBmb3JBbGxDZWxscyhjYikge1xuICAgICAgICB0aGlzLl93b3JrYm9vay5zaGVldHMoKS5mb3JFYWNoKHNoZWV0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRoZVJhbmdlID0gc2hlZXQudXNlZFJhbmdlKCk7XG4gICAgICAgICAgICBpZiAodGhlUmFuZ2UpIFxuICAgICAgICAgICAgICAgIHRoZVJhbmdlLmZvckVhY2goY2IpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSBzdHlsZXMgZnJvbSBgc3JjYCBjZWxsIHRvIHRoZSBgZGVzdGAtaW5hdGlvbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IERlc3RpbmF0aW9uIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgU291cmNlIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVN0eWxlKGRlc3QsIHNyYykge1xuICAgICAgICBpZiAoIXNyYyB8fCAhZGVzdCkgdGhyb3cgbmV3IEVycm9yKFwiQ3Jhc2ghIE51bGwgJ3NyYycgb3IgJ2Rlc3QnIGZvciBjb3B5U3R5bGUoKSFcIik7XG4gICAgICAgIGlmIChzcmMgPT0gZGVzdCkgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHNyYy5fc3R5bGUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Quc3R5bGUoc3JjLl9zdHlsZSk7XG4gICAgICAgIGVsc2UgaWYgKHNyYy5fc3R5bGVJZCA+IDApXG4gICAgICAgICAgICBkZXN0Ll9zdHlsZUlkID0gc3JjLl9zdHlsZUlkO1xuXG4gICAgICAgIGNvbnN0IGRlc3RTaGVldElkID0gZGVzdC5zaGVldCgpLm5hbWUoKSxcbiAgICAgICAgICAgIHJvd0lkID0gYCcke2Rlc3RTaGVldElkfSc6JHtkZXN0LnJvd051bWJlcigpfWAsXG4gICAgICAgICAgICBjb2xJZCA9IGAnJHtkZXN0U2hlZXRJZH0nOiR7ZGVzdC5jb2x1bW5OdW1iZXIoKX1gO1xuXG4gICAgICAgIGlmICh0aGlzLl9yb3dTaXplc1tyb3dJZF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Qucm93KCkuaGVpZ2h0KHRoaXMuX3Jvd1NpemVzW3Jvd0lkXSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sSWRdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LmNvbHVtbigpLndpZHRoKHRoaXMuX2NvbFNpemVzW2NvbElkXSA9IHNyYy5jb2x1bW4oKS53aWR0aCgpKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeFBvcHVsYXRlQWNjZXNzO1xuIl19
