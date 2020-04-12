(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
    "": function _(data) {
      return _2.keys(data);
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

        dataFills[_this._access.cellRef(template.cell)] = aFill;
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
          handlerName = extractParts[1];
      return extractParts.length == 1 ? {
        path: extractor,
        handler: null
      } : {
        path: extractParts[0],
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

      return allTemplates.sort(function (a, b) {
        return b.reference == _this3._access.cellRef(a.cell) || !a.reference ? -1 : 1;
      }).forEach(cb);
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

      if (idx < iterators.length - 1) {
        data = _2.map(data, function (inRoot) {
          return _this5.extractData(inRoot, iterators, idx + 1);
        });
        sizes = data[0].sizes;
      } else if (!Array.isArray(data) && _typeof(data) === 'object') data = _2.values(data); // Some data sanity checks.


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

      if (!entrySize || !entrySize.length) {
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
      } else {
        // TODO: Deal with more than 3 dimensions case.
        throw new Error("Values extracted with '".concat(template.extractor, "' are more than 2 dimension!'"));
      }

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxTQUFTLEVBQUUsSUFOSztBQU9oQixFQUFBLFlBQVksRUFBRTtBQUNWLFFBQUksV0FBQSxJQUFJO0FBQUEsYUFBSSxFQUFDLENBQUMsSUFBRixDQUFPLElBQVAsQ0FBSjtBQUFBO0FBREU7QUFQRSxDQUFwQjtBQVlBLElBQU0sU0FBUyxHQUFHLDRDQUFsQjtBQUVBOzs7O0lBR00sWTtBQUNGOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCQSx3QkFBWSxRQUFaLEVBQXNCLElBQXRCLEVBQTRCO0FBQUE7O0FBQ3hCLFNBQUssS0FBTCxHQUFhLEVBQUMsQ0FBQyxZQUFGLENBQWUsRUFBZixFQUFtQixJQUFuQixFQUF5QixXQUF6QixDQUFiO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsUUFBZjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7NEJBTVEsTyxFQUFTO0FBQ2IsVUFBSSxPQUFPLEtBQUssSUFBaEIsRUFBc0I7QUFDbEIsUUFBQSxFQUFDLENBQUMsS0FBRixDQUFRLEtBQUssS0FBYixFQUFvQixPQUFwQjs7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BSUksT0FBTyxLQUFLLEtBQVo7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LENBQWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxHQUFMLEdBQVcsTUFBWCxDQUFrQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxHQUFKLEdBQVUsTUFBVixFQUExQztBQUVKLFVBQUksS0FBSyxTQUFMLENBQWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxNQUFMLEdBQWMsS0FBZCxDQUFvQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxNQUFKLEdBQWEsS0FBYixFQUE1QztBQUVKLGFBQU8sSUFBUDtBQUNIOzs7Ozs7QUFHTCxNQUFNLENBQUMsT0FBUCxHQUFpQixrQkFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICB0ZW1wbGF0ZVJlZ0V4cDogL1xce1xceyhbXn1dKilcXH1cXH0vLFxuICAgIGZpZWxkU3BsaXR0ZXI6IFwifFwiLFxuICAgIGpvaW5UZXh0OiBcIixcIixcbiAgICBtZXJnZUNlbGxzOiB0cnVlLFxuICAgIGZvbGxvd0Zvcm11bGFlOiBmYWxzZSxcbiAgICBjb3B5U3R5bGU6IHRydWUsXG4gICAgY2FsbGJhY2tzTWFwOiB7XG4gICAgICAgIFwiXCI6IGRhdGEgPT4gXy5rZXlzKGRhdGEpXG4gICAgfVxufTtcblxuY29uc3QgcmVmUmVnRXhwID0gLygnPyhbXiFdKik/Jz8hKT8oW0EtWl0rXFxkKykoOihbQS1aXStcXGQrKSk/LztcblxuLyoqXG4gKiBEYXRhIGZpbGwgZW5naW5lLCB0YWtpbmcgYW4gaW5zdGFuY2Ugb2YgRXhjZWwgc2hlZXQgYWNjZXNzb3IgYW5kIGEgSlNPTiBvYmplY3QgYXMgZGF0YSwgYW5kIGZpbGxpbmcgdGhlIHZhbHVlcyBmcm9tIHRoZSBsYXR0ZXIgaW50byB0aGUgZm9ybWVyLlxuICovXG5jbGFzcyBYbHN4RGF0YUZpbGwge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeERhdGFGaWxsIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYWNjZXNzb3IgQW4gaW5zdGFuY2Ugb2YgWExTWCBzcHJlYWRzaGVldCBhY2Nlc3NpbmcgY2xhc3MuXG4gICAgICogQHBhcmFtIHt7fX0gb3B0cyBPcHRpb25zIHRvIGJlIHVzZWQgZHVyaW5nIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IG9wdHMudGVtcGxhdGVSZWdFeHAgVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB1c2VkIGZvciB0ZW1wbGF0ZSByZWNvZ25pemluZy4gXG4gICAgICogRGVmYXVsdCBpcyBgL1xce1xceyhbXn1dKilcXH1cXH0vYCwgaS5lLiBNdXN0YWNoZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5maWVsZFNwbGl0dGVyIFRoZSBzdHJpbmcgdG8gYmUgZXhwZWN0ZWQgYXMgdGVtcGxhdGUgZmllbGQgc3BsaXR0ZXIuIERlZmF1bHQgaXMgYHxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmpvaW5UZXh0IFRoZSBzdHJpbmcgdG8gYmUgdXNlZCB3aGVuIHRoZSBleHRyYWN0ZWQgdmFsdWUgZm9yIGEgc2luZ2xlIGNlbGwgaXMgYW4gYXJyYXksIFxuICAgICAqIGFuZCBpdCBuZWVkcyB0byBiZSBqb2luZWQuIERlZmF1bHQgaXMgYCxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGJvb2xlYW59IG9wdHMubWVyZ2VDZWxscyBXaGV0aGVyIHRvIG1lcmdlIHRoZSBoaWdoZXIgZGltZW5zaW9uIGNlbGxzIGluIHRoZSBvdXRwdXQuIERlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuZm9sbG93Rm9ybXVsYWUgSWYgYSB0ZW1wbGF0ZSBpcyBsb2NhdGVkIGFzIGEgcmVzdWx0IG9mIGEgZm9ybXVsYSwgd2hldGhlciB0byBzdGlsbCBwcm9jZXNzIGl0LlxuICAgICAqIERlZmF1bHQgaXMgZmFsc2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRzLmNvcHlTdHlsZSBDb3B5IHRoZSBzdHlsZSBvZiB0aGUgdGVtcGxhdGUgY2VsbCB3aGVuIHBvcHVsYXRpbmcuIEV2ZW4gd2hlbiBgZmFsc2VgLCB0aGUgdGVtcGxhdGVcbiAgICAgKiBzdHlsaW5nIF9pc18gYXBwbGllZC4gRGVmYXVsdCBpcyB0cnVlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gb3B0cy5jYWxsYmFja3NNYXAgQSBtYXAgb2YgaGFuZGxlcnMgdG8gYmUgdXNlZCBmb3IgZGF0YSBhbmQgdmFsdWUgZXh0cmFjdGlvbi5cbiAgICAgKiBUaGVyZSBpcyBvbmUgZGVmYXVsdCAtIHRoZSBlbXB0eSBvbmUsIGZvciBvYmplY3Qga2V5IGV4dHJhY3Rpb24uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWNjZXNzb3IsIG9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0cyA9IF8uZGVmYXVsdHNEZWVwKHt9LCBvcHRzLCBkZWZhdWx0T3B0cyk7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgICAgIHRoaXMuX2FjY2VzcyA9IGFjY2Vzc29yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHRlci9nZXR0ZXIgZm9yIFhsc3hEYXRhRmlsbCdzIG9wdGlvbnMgYXMgc2V0IGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAgICogQHBhcmFtIHt7fXxudWxsfSBuZXdPcHRzIElmIHNldCAtIHRoZSBuZXcgb3B0aW9ucyB0byBiZSB1c2VkLiBcbiAgICAgKiBAc2VlIHtAY29uc3RydWN0b3J9LlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx8e319IFRoZSByZXF1aXJlZCBvcHRpb25zIChpbiBnZXR0ZXIgbW9kZSkgb3IgWGxzeERhdGFGaWxsIChpbiBzZXR0ZXIgbW9kZSkgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIG9wdGlvbnMobmV3T3B0cykge1xuICAgICAgICBpZiAobmV3T3B0cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXy5tZXJnZSh0aGlzLl9vcHRzLCBuZXdPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB3aG9sZSBkYXRhIHBvcHVsYXRpb24gbWVjaGFuaXNtLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgdG8gYmUgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBmaWxsRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGRhdGFGaWxscyA9IHt9O1xuXHRcbiAgICAgICAgLy8gQnVpbGQgdGhlIGRlcGVuZGVuY3kgY29ubmVjdGlvbnMgYmV0d2VlbiB0ZW1wbGF0ZXMuXG4gICAgICAgIHRoaXMuY29sbGVjdFRlbXBsYXRlcyh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhRmlsbCA9IHsgIFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSwgXG4gICAgICAgICAgICAgICAgZGVwZW5kZW50czogW10sXG4gICAgICAgICAgICAgICAgZm9ybXVsYXM6IFtdLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWZGaWxsID0gZGF0YUZpbGxzW3RlbXBsYXRlLnJlZmVyZW5jZV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFyZWZGaWxsKSBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBhIHJlZmVyZW5jZSAnJHt0ZW1wbGF0ZS5yZWZlcmVuY2V9JyFgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUuZm9ybXVsYSkgXG4gICAgICAgICAgICAgICAgICAgIHJlZkZpbGwuZm9ybXVsYXMucHVzaChhRmlsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmRlcGVuZGVudHMucHVzaChhRmlsbCk7XG4gICAgXG4gICAgICAgICAgICAgICAgYUZpbGwub2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZShyZWZGaWxsLnRlbXBsYXRlLmNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YUZpbGxzW3RoaXMuX2FjY2Vzcy5jZWxsUmVmKHRlbXBsYXRlLmNlbGwpXSA9IGFGaWxsO1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLy8gQXBwbHkgZWFjaCBmaWxsIG9udG8gdGhlIHNoZWV0LlxuICAgICAgICBfLmVhY2goZGF0YUZpbGxzLCBmaWxsID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxsLnByb2Nlc3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBlbHNlIGlmIChmaWxsLnRlbXBsYXRlLmZvcm11bGEpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tcmVmZXJlbmNpbmcgZm9ybXVsYSBmb3VuZCAnJHtmaWxsLmV4dHJhY3Rvcn0nLiBVc2UgYSBub24tdGVtcGxhdGVkIG9uZSFgKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsbChmaWxsLCBkYXRhLCBmaWxsLnRlbXBsYXRlLmNlbGwpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHByb3ZpZGVkIGhhbmRsZXIgZnJvbSB0aGUgbWFwLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kbGVyTmFtZSBUaGUgbmFtZSBvZiB0aGUgaGFuZGxlci5cbiAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IFRoZSBoYW5kbGVyIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSkge1xuICAgICAgICBjb25zdCBoYW5kbGVyRm4gPSB0aGlzLl9vcHRzLmNhbGxiYWNrc01hcFtoYW5kbGVyTmFtZV07XG5cbiAgICAgICAgaWYgKCFoYW5kbGVyRm4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBjYW5ub3QgYmUgZm91bmQhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyRm4gIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBpcyBub3QgYSBmdW5jdGlvbiFgKTtcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyRm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBwcm92aWRlZCBleHRyYWN0b3IgKG90IGl0ZXJhdG9yKSBzdHJpbmcgdG8gZmluZCBhIGNhbGxiYWNrIGlkIGluc2lkZSwgaWYgcHJlc2VudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBpdGVyYXRvci9leHRyYWN0b3Igc3RyaW5nIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gQSB7IGBwYXRoYCwgYGhhbmRsZXJgIH0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgSlNPTiBwYXRoXG4gICAgICogcmVhZHkgZm9yIHVzZSBhbmQgdGhlIHByb3ZpZGVkIGBoYW5kbGVyYCBfZnVuY3Rpb25fIC0gcmVhZHkgZm9yIGludm9raW5nLCBpZiBzdWNoIGlzIHByb3ZpZGVkLlxuICAgICAqIElmIG5vdCAtIHRoZSBgcGF0aGAgcHJvcGVydHkgY29udGFpbnMgdGhlIHByb3ZpZGVkIGBleHRyYWN0b3JgLCBhbmQgdGhlIGBoYW5kbGVyYCBpcyBgbnVsbGAuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcikge1xuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgZXh0cmFjdFBhcnRzID0gZXh0cmFjdG9yLnNwbGl0KFwiOlwiKSxcbiAgICAgICAgICAgIGhhbmRsZXJOYW1lID0gZXh0cmFjdFBhcnRzWzFdO1xuXG4gICAgICAgIHJldHVybiBleHRyYWN0UGFydHMubGVuZ3RoID09IDFcbiAgICAgICAgICAgID8geyBwYXRoOiBleHRyYWN0b3IsIGhhbmRsZXI6IG51bGwgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgcGF0aDogZXh0cmFjdFBhcnRzWzBdLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IHRoaXMuZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSlcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgc3R5bGUgcGFydCBvZiB0aGUgdGVtcGxhdGUgb250byBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBkZXN0aW5hdGlvbiBjZWxsIHRvIGFwcGx5IHN0eWxpbmcgdG8uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSBjaHVuayBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBiZSB1c2VkIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHJldHVybnMge0RhdGFGaWxsZXJ9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX29wdHMuY29weVN0eWxlKVxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzdHlsZXMgJiYgZGF0YSkge1xuICAgICAgICAgICAgXy5lYWNoKHN0eWxlcywgcGFpciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEhhbmRsZXIocGFpci5uYW1lLnN1YnN0cigxKSkuY2FsbCh0aGlzLl9vcHRzLCBkYXRhLCBjZWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgcGFpci5leHRyYWN0b3IsIGNlbGwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxTdHlsZShjZWxsLCBwYWlyLm5hbWUsIHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VUZW1wbGF0ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fYWNjZXNzLmNlbGxWYWx1ZShjZWxsKTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVNYXRjaCA9IHZhbHVlLm1hdGNoKHRoaXMuX29wdHMudGVtcGxhdGVSZWdFeHApO1xuICAgICAgICBpZiAoIXJlTWF0Y2ggfHwgIXRoaXMuX29wdHMuZm9sbG93Rm9ybXVsYWUgJiYgdGhpcy5fYWNjZXNzLmNlbGxUeXBlKGNlbGwpID09PSAnZm9ybXVsYScpIFxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0gcmVNYXRjaFsxXS5zcGxpdCh0aGlzLl9vcHRzLmZpZWxkU3BsaXR0ZXIpLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgc3R5bGVzID0gIXBhcnRzWzRdID8gbnVsbCA6IHBhcnRzWzRdLnNwbGl0KFwiLFwiKSxcbiAgICAgICAgICAgIGV4dHJhY3RvciA9IHBhcnRzWzJdIHx8IFwiXCIsXG4gICAgICAgICAgICBjZWxsUmVmID0gdGhpcy5fYWNjZXNzLmJ1aWxkUmVmKGNlbGwsIHBhcnRzWzBdKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCBjb21wb25lbnRzIG9mIHRoZSB0ZW1wbGF0ZSAnJHtyZU1hdGNoWzBdfSdgKTtcbiAgICAgICAgaWYgKCEhcGFydHNbMF0gJiYgIWNlbGxSZWYpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcmVmZXJlbmNlIHBhc3NlZDogJyR7cGFydHNbMF19J2ApO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZWZlcmVuY2U6IGNlbGxSZWYsXG4gICAgICAgICAgICBpdGVyYXRvcnM6IHBhcnRzWzFdLnNwbGl0KC94fFxcKi8pLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgZXh0cmFjdG9yOiBleHRyYWN0b3IsXG4gICAgICAgICAgICBmb3JtdWxhOiBleHRyYWN0b3Iuc3RhcnRzV2l0aChcIj1cIiksXG4gICAgICAgICAgICBjZWxsOiBjZWxsLFxuICAgICAgICAgICAgY2VsbFNpemU6IHRoaXMuX2FjY2Vzcy5jZWxsU2l6ZShjZWxsKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IChwYXJ0c1szXSB8fCBcIlwiKS5zcGxpdCgvOnwsfHh8XFwqLykubWFwKHYgPT4gcGFyc2VJbnQodikgfHwgMCksXG4gICAgICAgICAgICBzdHlsZXM6ICFzdHlsZXMgPyBudWxsIDogXy5tYXAoc3R5bGVzLCBzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWlyID0gXy50cmltKHMpLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBfLnRyaW0ocGFpclswXSksIGV4dHJhY3RvcjogXy50cmltKHBhaXJbMV0pIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlYXJjaGVzIHRoZSB3aG9sZSB3b3JrYm9vayBmb3IgdGVtcGxhdGUgcGF0dGVybiBhbmQgY29uc3RydWN0cyB0aGUgdGVtcGxhdGVzIGZvciBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIG9uIGVhY2ggdGVtcGxhdGVkLCBhZnRlciB0aGV5IGFyZSBzb3J0ZWQuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIHRlbXBsYXRlcyBjb2xsZWN0ZWQgYXJlIHNvcnRlZCwgYmFzZWQgb24gdGhlIGludHJhLXRlbXBsYXRlIHJlZmVyZW5jZSAtIGlmIG9uZSB0ZW1wbGF0ZVxuICAgICAqIGlzIHJlZmVycmluZyBhbm90aGVyIG9uZSwgaXQnbGwgYXBwZWFyIF9sYXRlcl8gaW4gdGhlIHJldHVybmVkIGFycmF5LCB0aGFuIHRoZSByZWZlcnJlZCB0ZW1wbGF0ZS5cbiAgICAgKiBUaGlzIGlzIHRoZSBvcmRlciB0aGUgY2FsbGJhY2sgaXMgYmVpbmcgaW52b2tlZCBvbi5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgY29sbGVjdFRlbXBsYXRlcyhjYikge1xuICAgICAgICBjb25zdCBhbGxUZW1wbGF0ZXMgPSBbXTtcbiAgICBcbiAgICAgICAgdGhpcy5fYWNjZXNzLmZvckFsbENlbGxzKGNlbGwgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLnBhcnNlVGVtcGxhdGUoY2VsbCk7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUpXG4gICAgICAgICAgICAgICAgYWxsVGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBhbGxUZW1wbGF0ZXNcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBiLnJlZmVyZW5jZSA9PSB0aGlzLl9hY2Nlc3MuY2VsbFJlZihhLmNlbGwpIHx8ICFhLnJlZmVyZW5jZSA/IC0xIDogMSlcbiAgICAgICAgICAgIC5mb3JFYWNoKGNiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyB0aGUgdmFsdWUocykgZnJvbSB0aGUgcHJvdmlkZWQgZGF0YSBgcm9vdGAgdG8gYmUgc2V0IGluIHRoZSBwcm92aWRlZCBgY2VsbGAuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIGV4dHJhY3RlZCB2YWx1ZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBleHRyYWN0aW9uIHN0cmluZyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuIFVzdWFsbHkgYSBKU09OIHBhdGggd2l0aGluIHRoZSBkYXRhIGByb290YC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSByZWZlcmVuY2UgY2VsbCwgaWYgc3VjaCBleGlzdHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudW1iZXJ8RGF0ZXxBcnJheXxBcnJheS48QXJyYXkuPCo+Pn0gVGhlIHZhbHVlIHRvIGJlIHVzZWQuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGlzIHVzZWQgZXZlbiB3aGVuIGEgd2hvbGUgLSBwb3NzaWJseSByZWN0YW5ndWxhciAtIHJhbmdlIGlzIGFib3V0IHRvIGJlIHNldCwgc28gaXQgY2FuXG4gICAgICogcmV0dXJuIGFuIGFycmF5IG9mIGFycmF5cy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdFZhbHVlcyhyb290LCBleHRyYWN0b3IsIGNlbGwpIHtcbiAgICAgICAgY29uc3QgeyBwYXRoLCBoYW5kbGVyIH0gPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcik7XG5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJvb3QpKVxuICAgICAgICAgICAgcm9vdCA9IF8uZ2V0KHJvb3QsIHBhdGgsIHJvb3QpO1xuICAgICAgICBlbHNlIGlmIChyb290LnNpemVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByb290ID0gIWV4dHJhY3RvciA/IHJvb3QgOiBfLm1hcChyb290LCBlbnRyeSA9PiB0aGlzLmV4dHJhY3RWYWx1ZXMoZW50cnksIGV4dHJhY3RvciwgY2VsbCkpO1xuICAgICAgICBlbHNlIGlmICghaGFuZGxlcilcbiAgICAgICAgICAgIHJldHVybiByb290LmpvaW4odGhpcy5fb3B0cy5qb2luVGV4dCB8fCBcIixcIik7XG5cbiAgICAgICAgcmV0dXJuICFoYW5kbGVyID8gcm9vdCA6IGhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCByb290LCBjZWxsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBhbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGRhdGEgZm9yIHRoZSBnaXZlbiBmaWxsLCBiYXNlZCBvbiB0aGUgZ2l2ZW5cbiAgICAgKiByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBtYWluIHJlZmVyZW5jZSBvYmplY3QgdG8gYXBwbHkgaXRlcmF0b3JzIHRvLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGl0ZXJhdG9ycyBMaXN0IG9mIGl0ZXJhdG9ycyAtIHN0cmluZyBKU09OIHBhdGhzIGluc2lkZSB0aGUgcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCBUaGUgaW5kZXggaW4gdGhlIGl0ZXJhdG9ycyBhcnJheSB0byB3b3JrIG9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxBcnJheS48QXJyYXk+fSBBbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGV4dHJhY3RlZCBkYXRhLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0RGF0YShyb290LCBpdGVyYXRvcnMsIGlkeCkge1xuICAgICAgICBsZXQgaXRlciA9IGl0ZXJhdG9yc1tpZHhdLFxuICAgICAgICAgICAgc2l6ZXMgPSBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSBmYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuXG4gICAgICAgIGlmIChpdGVyID09ICcxJykge1xuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBpdGVyID0gaXRlcmF0b3JzWysraWR4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXRlcikgcmV0dXJuIHJvb3Q7XG5cbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IHBhcnNlZEl0ZXIgPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGl0ZXIpO1xuXG4gICAgICAgIGRhdGEgPSBfLmdldChyb290LCBwYXJzZWRJdGVyLnBhdGgsIHJvb3QpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRJdGVyLmhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICBkYXRhID0gcGFyc2VkSXRlci5oYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgZGF0YSk7XG5cbiAgICAgICAgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcztcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgaWYgKCFjZWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCByZWZlcmVuY2UgY2VsbCBpbiAncHV0VmFsdWVzKCknIVwiKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gZGF0YS5zaXplcyxcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHRlbXBsYXRlLmV4dHJhY3RvciwgY2VsbCk7XG5cbiAgICAgICAgLy8gaWYgd2UndmUgY29tZSB1cCB3aXRoIGEgcmF3IGRhdGFcbiAgICAgICAgaWYgKCFlbnRyeVNpemUgfHwgIWVudHJ5U2l6ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWUpO1xuICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0ZW1wbGF0ZS5jZWxsU2l6ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgc2l6ZSBhbmQgZGF0YS5cbiAgICAgICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gWzEsIC1lbnRyeVNpemVbMF1dO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBlbnRyeVNpemUuY29uY2F0KFsxXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfLmNodW5rKHZhbHVlLCAxKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gXy5jaHVuayhkYXRhLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKS5mb3JFYWNoKChjZWxsLCByaSwgY2kpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFZhbHVlKGNlbGwsIHZhbHVlW3JpXVtjaV0pO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YVtyaV1bY2ldLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlYWwgd2l0aCBtb3JlIHRoYW4gMyBkaW1lbnNpb25zIGNhc2UuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlcyBleHRyYWN0ZWQgd2l0aCAnJHt0ZW1wbGF0ZS5leHRyYWN0b3J9JyBhcmUgbW9yZSB0aGFuIDIgZGltZW5zaW9uISdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSB1c2VkIGZvciBkYXRhIGV4dHJhY3Rpb24uXG4gICAgICogQHBhcmFtIHtDZWxsfSBtYWluQ2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgZGF0YSBwbGFjZW1lbnQgcHJvY2VkdXJlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHNpemUgb2YgdGhlIGRhdGEgcHV0IGluIFtyb3csIGNvbF0gZm9ybWF0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXSxcbiAgICAgICAgICAgICAgICAgICAgcm93UGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMF0gfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgY29sUGFkZGluZyA9IHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMDtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnBhZGRpbmcubGVuZ3RoIDwgMilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbFBhZGRpbmcgPSByb3dQYWRkaW5nO1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSByb3dQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoZURhdGEuc2l6ZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSBjb2xQYWRkaW5nID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzBdID0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocm93T2Zmc2V0ID4gMSB8fCBjb2xPZmZzZXQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UobmV4dENlbGwsIE1hdGgubWF4KHJvd09mZnNldCAtIDEsIDApLCBNYXRoLm1heChjb2xPZmZzZXQgLSAxLCAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gdHJ1ZSB8fCB0aGlzLl9vcHRzLm1lcmdlQ2VsbCA9PT0gJ2JvdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCByb3dPZmZzZXQgPiAxICYmIHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gJ3ZlcnRpY2FsJyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGNvbE9mZnNldCA+IDEgJiYgdGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSAnaG9yaXpvbnRhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MucmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICBybmcuZm9yRWFjaChjZWxsID0+IHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArIHJvd1BhZGRpbmcsIGNvbE9mZnNldCArIGNvbFBhZGRpbmcpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5mb3JFYWNoKGFGaWxsLmZvcm11bGFzLCBmID0+IHRoaXMuYXBwbHlGb3JtdWxhKGYsIGVudHJ5U2l6ZSwgbWFpbkNlbGwpKTtcblxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBmb3JtdWxhIGJlIHNoaWZ0aW5nIGFsbCB0aGUgZml4ZWQgb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNoaWZ0ZWQuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gb2Zmc2V0IFRoZSBvZmZzZXQgb2YgdGhlIHJlZmVyZW5jZWQgdGVtcGxhdGUgdG8gdGhlIGZvcm11bGEgb25lLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IHNpemUgVGhlIHNpemUgb2YgdGhlIHJhbmdlcyBhcyB0aGV5IHNob3VsZCBiZS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcHJvY2Vzc2VkIHRleHQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIHNpemUpIHtcbiAgICAgICAgbGV0IG5ld0Zvcm11bGEgPSAnJztcblxuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGZvcm11bGEubWF0Y2gocmVmUmVnRXhwKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpIGJyZWFrO1xuXG4gICAgICAgICAgICBsZXQgZnJvbSA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsKG1hdGNoWzNdLCBtYXRjaFsyXSksXG4gICAgICAgICAgICAgICAgbmV3UmVmID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKG9mZnNldFswXSA+IDAgfHwgb2Zmc2V0WzFdID4gMClcbiAgICAgICAgICAgICAgICBmcm9tID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoZnJvbSwgb2Zmc2V0WzBdLCBvZmZzZXRbMV0pO1xuXG4gICAgICAgICAgICBuZXdSZWYgPSAhbWF0Y2hbNV1cbiAgICAgICAgICAgICAgICA/IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGZyb20sICEhbWF0Y2hbMl0pXG4gICAgICAgICAgICAgICAgOiB0aGlzLl9hY2Nlc3MucmFuZ2VSZWYodGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShmcm9tLCBzaXplWzBdLCBzaXplWzFdKSwgISFtYXRjaFsyXSk7XG5cbiAgICAgICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYS5zdWJzdHIoMCwgbWF0Y2guaW5kZXgpICsgbmV3UmVmO1xuICAgICAgICAgICAgZm9ybXVsYSA9IGZvcm11bGEuc3Vic3RyKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0Zvcm11bGEgKz0gZm9ybXVsYTtcbiAgICAgICAgcmV0dXJuIG5ld0Zvcm11bGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZvcm11bGEgaW4gdGhlIHNoZWV0LCBpLmUuIGNoYW5naW5nIGl0IHRvIG1hdGNoIHRoZSBcbiAgICAgKiBzaXplcyBvZiB0aGUgcmVmZXJlbmNlcyB0ZW1wbGF0ZXMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyPn0gZW50cnlTaXplIFRoZSBmaWxsLXRvLXNpemUgbWFwLCBhcyBjb25zdHJ1Y3RlZCBzbyBmYXJcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gcHV0L3N0YXJ0IHRoaXMgZm9ybXVsYSBpbnRvXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlGb3JtdWxhKGFGaWxsLCBlbnRyeVNpemUsIGNlbGwpIHtcbiAgICAgICAgY2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKGNlbGwsIGFGaWxsLm9mZnNldFswXSwgYUZpbGwub2Zmc2V0WzFdKTtcblxuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgaXRlciA9IF8udHJpbSh0ZW1wbGF0ZS5pdGVyYXRvcnNbMF0pLFxuICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZSh0ZW1wbGF0ZS5jZWxsLCBjZWxsKTtcbiAgICAgICAgICAgIFxuICAgICAgICBsZXQgZm9ybXVsYSA9IHRlbXBsYXRlLmV4dHJhY3RvciwgXG4gICAgICAgICAgICBybmc7XG4gICAgICAgICAgICBcbiAgICAgICAgYUZpbGwucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCBudWxsKTtcblxuICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMiAmJiBlbnRyeVNpemVbMV0gPCAyIHx8IGl0ZXIgPT09ICdib3RoJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ2NvbHMnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCAwLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAncm93cycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCBlbnRyeVNpemVbMV0gLSAxXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIDApO1xuICAgICAgICB9IGVsc2UgeyAvLyBpLmUuICdub25lJ1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxGb3JtdWxhKGNlbGwsIHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDFdKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0UmFuZ2VGb3JtdWxhKHJuZywgZm9ybXVsYSk7XG4gICAgfVxufVxuXG4vKipcbiAqIFRoZSBidWlsdC1pbiBhY2Nlc3NvciBiYXNlZCBvbiB4bHN4LXBvcHVsYXRlIG5wbSBtb2R1bGVcbiAqIEB0eXBlIHtYbHN4UG9wdWxhdGVBY2Nlc3N9XG4gKi9cblhsc3hEYXRhRmlsbC5YbHN4UG9wdWxhdGVBY2Nlc3MgPSByZXF1aXJlKCcuL1hsc3hQb3B1bGF0ZUFjY2VzcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hEYXRhRmlsbDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8vIGNvbnN0IGFsbFN0eWxlcyA9IFtcbi8vICAgICBcImJvbGRcIiwgXG4vLyAgICAgXCJpdGFsaWNcIiwgXG4vLyAgICAgXCJ1bmRlcmxpbmVcIiwgXG4vLyAgICAgXCJzdHJpa2V0aHJvdWdoXCIsIFxuLy8gICAgIFwic3Vic2NyaXB0XCIsIFxuLy8gICAgIFwic3VwZXJzY3JpcHRcIiwgXG4vLyAgICAgXCJmb250U2l6ZVwiLCBcbi8vICAgICBcImZvbnRGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250R2VuZXJpY0ZhbWlseVwiLCBcbi8vICAgICBcImZvbnRTY2hlbWVcIiwgXG4vLyAgICAgXCJmb250Q29sb3JcIiwgXG4vLyAgICAgXCJob3Jpem9udGFsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwianVzdGlmeUxhc3RMaW5lXCIsIFxuLy8gICAgIFwiaW5kZW50XCIsIFxuLy8gICAgIFwidmVydGljYWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJ3cmFwVGV4dFwiLCBcbi8vICAgICBcInNocmlua1RvRml0XCIsIFxuLy8gICAgIFwidGV4dERpcmVjdGlvblwiLCBcbi8vICAgICBcInRleHRSb3RhdGlvblwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENvdW50ZXJjbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0VXBcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0RG93blwiLCBcbi8vICAgICBcInZlcnRpY2FsVGV4dFwiLCBcbi8vICAgICBcImZpbGxcIiwgXG4vLyAgICAgXCJib3JkZXJcIiwgXG4vLyAgICAgXCJib3JkZXJDb2xvclwiLCBcbi8vICAgICBcImJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclwiLCBcInJpZ2h0Qm9yZGVyXCIsIFwidG9wQm9yZGVyXCIsIFwiYm90dG9tQm9yZGVyXCIsIFwiZGlhZ29uYWxCb3JkZXJcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyQ29sb3JcIiwgXCJyaWdodEJvcmRlckNvbG9yXCIsIFwidG9wQm9yZGVyQ29sb3JcIiwgXCJib3R0b21Cb3JkZXJDb2xvclwiLCBcImRpYWdvbmFsQm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyU3R5bGVcIiwgXCJyaWdodEJvcmRlclN0eWxlXCIsIFwidG9wQm9yZGVyU3R5bGVcIiwgXCJib3R0b21Cb3JkZXJTdHlsZVwiLCBcImRpYWdvbmFsQm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJkaWFnb25hbEJvcmRlckRpcmVjdGlvblwiLCBcbi8vICAgICBcIm51bWJlckZvcm1hdFwiXG4vLyBdO1xuXG5sZXQgX1JpY2hUZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBgeHNseC1wb3B1bGF0ZWAgbGlicmFyeSBiYXNlZCBhY2Nlc3NvciB0byBhIGdpdmVuIEV4Y2VsIHdvcmtib29rLiBBbGwgdGhlc2UgbWV0aG9kcyBhcmUgaW50ZXJuYWxseSB1c2VkIGJ5IHtAbGluayBYbHN4RGF0YUZpbGx9LCBcbiAqIGJ1dCBjYW4gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgaW1wbGVtZW50aW5nIGN1c3RvbSBzcHJlYWRzaGVldCBhY2Nlc3NvcnMuXG4gKi9cbmNsYXNzIFhsc3hQb3B1bGF0ZUFjY2VzcyB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4U21hcnRUZW1wbGF0ZSB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtXb3JrYm9va30gd29ya2Jvb2sgLSBUaGUgd29ya2Jvb2sgdG8gYmUgYWNjZXNzZWQuXG4gICAgICogQHBhcmFtIHtYbHN4UG9wdWxhdGV9IFhsc3hQb3B1bGF0ZSAtIFRoZSBhY3R1YWwgeGxzeC1wb3B1bGF0ZSBsaWJyYXJ5IG9iamVjdC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGBYbHN4UG9wdWxhdGVgIG9iamVjdCBuZWVkIHRvIGJlIHBhc3NlZCBpbiBvcmRlciB0byBleHRyYWN0XG4gICAgICogY2VydGFpbiBpbmZvcm1hdGlvbiBmcm9tIGl0LCBfd2l0aG91dF8gcmVmZXJyaW5nIHRoZSB3aG9sZSBsaWJyYXJ5LCB0aHVzXG4gICAgICogYXZvaWRpbmcgbWFraW5nIHRoZSBgeGxzeC1kYXRhZmlsbGAgcGFja2FnZSBhIGRlcGVuZGVuY3kuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod29ya2Jvb2ssIFhsc3hQb3B1bGF0ZSkge1xuICAgICAgICB0aGlzLl93b3JrYm9vayA9IHdvcmtib29rO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgIFxuICAgICAgICBfUmljaFRleHQgPSBYbHN4UG9wdWxhdGUuUmljaFRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCB3b3JrYm9vayBmb3IgZGlyZWN0IFhsc3hQb3B1bGF0ZSBtYW5pcHVsYXRpb24uXG4gICAgICogQHJldHVybnMge1dvcmtib29rfSBUaGUgd29ya2Jvb2sgaW52b2x2ZWQuXG4gICAgICovXG4gICAgd29ya2Jvb2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3JrYm9vazsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiBjZWxsJ3MgY29udGVudHMuXG4gICAgICovXG4gICAgY2VsbFZhbHVlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIHJldHVybiB0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dCA/IHRoZVZhbHVlLnRleHQoKSA6IHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSByZXF1ZXN0ZWQgdmFsdWUgZm9yIHNldHRpbmcuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRWl0aGVyIHRoZSByZXF1ZXN0ZWQgdmFsdWUgb3IgY2hhaW5hYmxlIHRoaXMuXG4gICAgICovXG4gICAgc2V0Q2VsbFZhbHVlKGNlbGwsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwudmFsdWUodmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0eXBlIG9mIHRoZSBjZWxsIC0gJ2Zvcm11bGEnLCAncmljaHRleHQnLCBcbiAgICAgKiAndGV4dCcsICdudW1iZXInLCAnZGF0ZScsICdoeXBlcmxpbmsnLCBvciAndW5rbm93bic7XG4gICAgICovXG4gICAgY2VsbFR5cGUoY2VsbCkge1xuICAgICAgICBpZiAoY2VsbC5mb3JtdWxhKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2Zvcm11bGEnO1xuICAgICAgICBlbHNlIGlmIChjZWxsLmh5cGVybGluaygpKVxuICAgICAgICAgICAgcmV0dXJuICdoeXBlcmxpbmsnO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dClcbiAgICAgICAgICAgIHJldHVybiAncmljaHRleHQnO1xuICAgICAgICBlbHNlIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIERhdGUpXG4gICAgICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGVWYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBmb3JtdWxhIGluIHRoZSBjZWxsXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm11bGEgLSB0aGUgdGV4dCBvZiB0aGUgZm9ybXVsYSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHNldENlbGxGb3JtdWxhKGNlbGwsIGZvcm11bGEpIHtcbiAgICAgICAgY2VsbC5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVhc3VyZXMgdGhlIGRpc3RhbmNlLCBhcyBhIHZlY3RvciBiZXR3ZWVuIHR3byBnaXZlbiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGZyb20gVGhlIGZpcnN0IGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSB0byBUaGUgc2Vjb25kIGNlbGwuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gY2VsbHMuXG4gICAgICovXG4gICAgY2VsbERpc3RhbmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB0by5yb3dOdW1iZXIoKSAtIGZyb20ucm93TnVtYmVyKCksXG4gICAgICAgICAgICB0by5jb2x1bW5OdW1iZXIoKSAtIGZyb20uY29sdW1uTnVtYmVyKClcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIGNlbGwsIHRha2luZyBpbnRvIGFjY291bnQgaWYgaXQgaXMgcGFydCBvZiBhIG1lcmdlZCByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgb2NjdXBpZWQgc2l6ZS5cbiAgICAgKi9cbiAgICBjZWxsU2l6ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxBZGRyID0gY2VsbC5hZGRyZXNzKCk7XG4gICAgICAgIGxldCB0aGVTaXplID0gWzEsIDFdO1xuICAgIFxuICAgICAgICBfLmZvckVhY2goY2VsbC5zaGVldCgpLl9tZXJnZUNlbGxzLCByYW5nZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByYW5nZUFkZHIgPSByYW5nZS5hdHRyaWJ1dGVzLnJlZi5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAocmFuZ2VBZGRyWzBdID09IGNlbGxBZGRyKSB7XG4gICAgICAgICAgICAgICAgdGhlU2l6ZSA9IHRoaXMuY2VsbERpc3RhbmNlKGNlbGwsIGNlbGwuc2hlZXQoKS5jZWxsKHJhbmdlQWRkclsxXSkpO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVswXTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoZVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0Q2VsbFN0eWxlKGNlbGwsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwuc3R5bGUobmFtZSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVmZXJlbmNlIElkIGZvciBhIGdpdmVuIGNlbGwsIGJhc2VkIG9uIGl0cyBzaGVldCBhbmQgYWRkcmVzcy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gY3JlYXRlIGEgcmVmZXJlbmNlIElkIHRvLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBpZCB0byBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciB0aGlzIGNlbGwuXG4gICAgICovXG4gICAgY2VsbFJlZihjZWxsLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNlbGwuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhIHJlZmVyZW5jZSBzdHJpbmcgZm9yIGEgY2VsbCBpZGVudGlmaWVkIGJ5IEBwYXJhbSBhZHIsIGZyb20gdGhlIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIGNlbGwgdGhhdCBpcyBhIGJhc2Ugb2YgdGhlIHJlZmVyZW5jZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRyIFRoZSBhZGRyZXNzIG9mIHRoZSB0YXJnZXQgY2VsbCwgYXMgbWVudGlvbmVkIGluIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEgcmVmZXJlbmNlIHN0cmluZyBpZGVudGlmeWluZyB0aGUgdGFyZ2V0IGNlbGwgdW5pcXVlbHkuXG4gICAgICovXG4gICAgYnVpbGRSZWYoY2VsbCwgYWRyLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGFkciA/IGNlbGwuc2hlZXQoKS5jZWxsKGFkcikuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgY2VsbCBhdCBhIGNlcnRhaW4gb2Zmc2V0IGZyb20gYSBnaXZlbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSByZWZlcmVuY2UgY2VsbCB0byBtYWtlIHRoZSBvZmZzZXQgZnJvbS5cbiAgICAgKiBAcGFyYW0ge2ludH0gcm93cyBOdW1iZXIgb2Ygcm93cyB0byBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtpbnR9IGNvbHMgTnVtYmVyIG9mIGNvbHVtbnMgdG8gb2Zmc2V0LlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBUaGUgcmVzdWx0aW5nIGNlbGwuXG4gICAgICovXG4gICAgb2Zmc2V0Q2VsbChjZWxsLCByb3dzLCBjb2xzKSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJlbGF0aXZlQ2VsbChyb3dzLCBjb2xzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBvciBzcGxpdCByYW5nZSBvZiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXR1cyBUaGUgbWVyZ2VkIHN0YXR1cyB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgcmFuZ2VNZXJnZWQocmFuZ2UsIHN0YXR1cykge1xuICAgICAgICBpZiAoc3RhdHVzID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gcmFuZ2UubWVyZ2VkKCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmFuZ2UubWVyZ2VkKHN0YXR1cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBmb3JtdWxhIGZvciB0aGUgd2hvbGUgcmFuZ2UuIElmIGl0IGNvbnRhaW5zIG9ubHkgb25lIC0gaXQgaXMgc2V0IGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBzZXRSYW5nZUZvcm11bGEocmFuZ2UsIGZvcm11bGEpIHtcbiAgICAgICAgcmFuZ2UuZm9ybXVsYShfLnRyaW1TdGFydChmb3JtdWxhLCAnID0nKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZ2l2ZW4gcmFuZ2UuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlIHdoaWNoIGFkZHJlc3Mgd2UncmUgaW50ZXJlc3RlZCBpbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgc2hlZXQgbmFtZSBpbiB0aGUgYWRkcmVzcy5cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcsIHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gcmFuZ2UuXG4gICAgICovXG4gICAgcmFuZ2VSZWYocmFuZ2UsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcmFuZ2UuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJdGVyYXRlIG92ZXIgYWxsIHVzZWQgY2VsbHMgb2YgdGhlIGdpdmVuIHdvcmtib29rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggYGNlbGxgIGFyZ3VtZW50IGZvciBlYWNoIHVzZWQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBmb3JBbGxDZWxscyhjYikge1xuICAgICAgICB0aGlzLl93b3JrYm9vay5zaGVldHMoKS5mb3JFYWNoKHNoZWV0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRoZVJhbmdlID0gc2hlZXQudXNlZFJhbmdlKCk7XG4gICAgICAgICAgICBpZiAodGhlUmFuZ2UpIFxuICAgICAgICAgICAgICAgIHRoZVJhbmdlLmZvckVhY2goY2IpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSBzdHlsZXMgZnJvbSBgc3JjYCBjZWxsIHRvIHRoZSBgZGVzdGAtaW5hdGlvbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IERlc3RpbmF0aW9uIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgU291cmNlIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVN0eWxlKGRlc3QsIHNyYykge1xuICAgICAgICBpZiAoIXNyYyB8fCAhZGVzdCkgdGhyb3cgbmV3IEVycm9yKFwiQ3Jhc2ghIE51bGwgJ3NyYycgb3IgJ2Rlc3QnIGZvciBjb3B5U3R5bGUoKSFcIik7XG4gICAgICAgIGlmIChzcmMgPT0gZGVzdCkgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHNyYy5fc3R5bGUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Quc3R5bGUoc3JjLl9zdHlsZSk7XG4gICAgICAgIGVsc2UgaWYgKHNyYy5fc3R5bGVJZCA+IDApXG4gICAgICAgICAgICBkZXN0Ll9zdHlsZUlkID0gc3JjLl9zdHlsZUlkO1xuXG4gICAgICAgIGNvbnN0IGRlc3RTaGVldElkID0gZGVzdC5zaGVldCgpLm5hbWUoKSxcbiAgICAgICAgICAgIHJvd0lkID0gYCcke2Rlc3RTaGVldElkfSc6JHtkZXN0LnJvd051bWJlcigpfWAsXG4gICAgICAgICAgICBjb2xJZCA9IGAnJHtkZXN0U2hlZXRJZH0nOiR7ZGVzdC5jb2x1bW5OdW1iZXIoKX1gO1xuXG4gICAgICAgIGlmICh0aGlzLl9yb3dTaXplc1tyb3dJZF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Qucm93KCkuaGVpZ2h0KHRoaXMuX3Jvd1NpemVzW3Jvd0lkXSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sSWRdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LmNvbHVtbigpLndpZHRoKHRoaXMuX2NvbFNpemVzW2NvbElkXSA9IHNyYy5jb2x1bW4oKS53aWR0aCgpKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeFBvcHVsYXRlQWNjZXNzO1xuIl19
