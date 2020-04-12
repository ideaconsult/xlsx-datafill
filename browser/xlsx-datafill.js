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
          value = this.extractValues(data, template.extractor, cell); // make sure, the 

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
        throw new Error("Values extracted with '".concat(template.extractor, " are more than 2 dimension!'"));
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
              colOffset = entrySize[1]; // Make sure we grow only on one dimension.

          if (theData.sizes[0] < 0) {
            rowOffset = 0;
            entrySize[1] = 1;
          } else {
            colOffset = 0;
            entrySize[0] = 1;
          }

          if (rowOffset > 1 || colOffset > 1) {
            var rng = _this7._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0));

            if (_this7._opts.mergeCells === true || _this7._opts.mergeCell === 'both' || rowOffset > 1 && _this7._opts.mergeCells === 'vertical' || colOffset > 1 && _this7._opts.mergeCells === 'horizontal') _this7._access.rangeMerged(rng, true);
            rng.forEach(function (cell) {
              return _this7.applyDataStyle(cell, inRoot, template);
            });
          } // Finally, calculate the next cell.


          nextCell = _this7._access.offsetCell(nextCell, rowOffset + (template.padding[0] || 0), colOffset + (template.padding[1] || 0));
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxTQUFTLEVBQUUsSUFOSztBQU9oQixFQUFBLFlBQVksRUFBRTtBQUNWLFFBQUksV0FBQSxJQUFJO0FBQUEsYUFBSSxFQUFDLENBQUMsSUFBRixDQUFPLElBQVAsQ0FBSjtBQUFBO0FBREU7QUFQRSxDQUFwQjtBQVlBLElBQU0sU0FBUyxHQUFHLDRDQUFsQjtBQUVBOzs7O0lBR00sWTtBQUNGOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCQSx3QkFBWSxRQUFaLEVBQXNCLElBQXRCLEVBQTRCO0FBQUE7O0FBQ3hCLFNBQUssS0FBTCxHQUFhLEVBQUMsQ0FBQyxZQUFGLENBQWUsRUFBZixFQUFtQixJQUFuQixFQUF5QixXQUF6QixDQUFiO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsUUFBZjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7NEJBTVEsTyxFQUFTO0FBQ2IsVUFBSSxPQUFPLEtBQUssSUFBaEIsRUFBc0I7QUFDbEIsUUFBQSxFQUFDLENBQUMsS0FBRixDQUFRLEtBQUssS0FBYixFQUFvQixPQUFwQjs7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BSUksT0FBTyxLQUFLLEtBQVo7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YyxLQUFkLENBQW9CLEtBQUssU0FBTCxDQUFlLEtBQWYsSUFBd0IsR0FBRyxDQUFDLE1BQUosR0FBYSxLQUFiLEVBQTVDO0FBRUosYUFBTyxJQUFQO0FBQ0g7Ozs7OztBQUdMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiAvXFx7XFx7KFtefV0qKVxcfVxcfS8sXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIG1lcmdlQ2VsbHM6IHRydWUsXG4gICAgZm9sbG93Rm9ybXVsYWU6IGZhbHNlLFxuICAgIGNvcHlTdHlsZTogdHJ1ZSxcbiAgICBjYWxsYmFja3NNYXA6IHtcbiAgICAgICAgXCJcIjogZGF0YSA9PiBfLmtleXMoZGF0YSlcbiAgICB9XG59O1xuXG5jb25zdCByZWZSZWdFeHAgPSAvKCc/KFteIV0qKT8nPyEpPyhbQS1aXStcXGQrKSg6KFtBLVpdK1xcZCspKT8vO1xuXG4vKipcbiAqIERhdGEgZmlsbCBlbmdpbmUsIHRha2luZyBhbiBpbnN0YW5jZSBvZiBFeGNlbCBzaGVldCBhY2Nlc3NvciBhbmQgYSBKU09OIG9iamVjdCBhcyBkYXRhLCBhbmQgZmlsbGluZyB0aGUgdmFsdWVzIGZyb20gdGhlIGxhdHRlciBpbnRvIHRoZSBmb3JtZXIuXG4gKi9cbmNsYXNzIFhsc3hEYXRhRmlsbCB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4RGF0YUZpbGwgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhY2Nlc3NvciBBbiBpbnN0YW5jZSBvZiBYTFNYIHNwcmVhZHNoZWV0IGFjY2Vzc2luZyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBvcHRzIE9wdGlvbnMgdG8gYmUgdXNlZCBkdXJpbmcgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gb3B0cy50ZW1wbGF0ZVJlZ0V4cCBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIGJlIHVzZWQgZm9yIHRlbXBsYXRlIHJlY29nbml6aW5nLiBcbiAgICAgKiBEZWZhdWx0IGlzIGAvXFx7XFx7KFtefV0qKVxcfVxcfS9gLCBpLmUuIE11c3RhY2hlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci4gRGVmYXVsdCBpcyBgfGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuam9pblRleHQgVGhlIHN0cmluZyB0byBiZSB1c2VkIHdoZW4gdGhlIGV4dHJhY3RlZCB2YWx1ZSBmb3IgYSBzaW5nbGUgY2VsbCBpcyBhbiBhcnJheSwgXG4gICAgICogYW5kIGl0IG5lZWRzIHRvIGJlIGpvaW5lZC4gRGVmYXVsdCBpcyBgLGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gb3B0cy5tZXJnZUNlbGxzIFdoZXRoZXIgdG8gbWVyZ2UgdGhlIGhpZ2hlciBkaW1lbnNpb24gY2VsbHMgaW4gdGhlIG91dHB1dC4gRGVmYXVsdCBpcyB0cnVlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5mb2xsb3dGb3JtdWxhZSBJZiBhIHRlbXBsYXRlIGlzIGxvY2F0ZWQgYXMgYSByZXN1bHQgb2YgYSBmb3JtdWxhLCB3aGV0aGVyIHRvIHN0aWxsIHByb2Nlc3MgaXQuXG4gICAgICogRGVmYXVsdCBpcyBmYWxzZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuY29weVN0eWxlIENvcHkgdGhlIHN0eWxlIG9mIHRoZSB0ZW1wbGF0ZSBjZWxsIHdoZW4gcG9wdWxhdGluZy4gRXZlbiB3aGVuIGBmYWxzZWAsIHRoZSB0ZW1wbGF0ZVxuICAgICAqIHN0eWxpbmcgX2lzXyBhcHBsaWVkLiBEZWZhdWx0IGlzIHRydWUuXG4gICAgICogQHBhcmFtIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBvcHRzLmNhbGxiYWNrc01hcCBBIG1hcCBvZiBoYW5kbGVycyB0byBiZSB1c2VkIGZvciBkYXRhIGFuZCB2YWx1ZSBleHRyYWN0aW9uLlxuICAgICAqIFRoZXJlIGlzIG9uZSBkZWZhdWx0IC0gdGhlIGVtcHR5IG9uZSwgZm9yIG9iamVjdCBrZXkgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ldyBvcHRpb25zIHRvIGJlIHVzZWQuIFxuICAgICAqIEBzZWUge0Bjb25zdHJ1Y3Rvcn0uXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbHx7fX0gVGhlIHJlcXVpcmVkIG9wdGlvbnMgKGluIGdldHRlciBtb2RlKSBvciBYbHN4RGF0YUZpbGwgKGluIHNldHRlciBtb2RlKSBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgICAgIGlmIChuZXdPcHRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMuX29wdHMsIG5ld09wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHdob2xlIGRhdGEgcG9wdWxhdGlvbiBtZWNoYW5pc20uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSB0byBiZSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGZpbGxEYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YUZpbGxzID0ge307XG5cdFxuICAgICAgICAvLyBCdWlsZCB0aGUgZGVwZW5kZW5jeSBjb25uZWN0aW9ucyBiZXR3ZWVuIHRlbXBsYXRlcy5cbiAgICAgICAgdGhpcy5jb2xsZWN0VGVtcGxhdGVzKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFGaWxsID0geyAgXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLCBcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzOiBbXSxcbiAgICAgICAgICAgICAgICBmb3JtdWxhczogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZkZpbGwgPSBkYXRhRmlsbHNbdGVtcGxhdGUucmVmZXJlbmNlXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXJlZkZpbGwpIFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGEgcmVmZXJlbmNlICcke3RlbXBsYXRlLnJlZmVyZW5jZX0nIWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5mb3JtdWxhKSBcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5mb3JtdWxhcy5wdXNoKGFGaWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlZkZpbGwuZGVwZW5kZW50cy5wdXNoKGFGaWxsKTtcbiAgICBcbiAgICAgICAgICAgICAgICBhRmlsbC5vZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHJlZkZpbGwudGVtcGxhdGUuY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhRmlsbHNbdGhpcy5fYWNjZXNzLmNlbGxSZWYodGVtcGxhdGUuY2VsbCldID0gYUZpbGw7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBBcHBseSBlYWNoIGZpbGwgb250byB0aGUgc2hlZXQuXG4gICAgICAgIF8uZWFjaChkYXRhRmlsbHMsIGZpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKGZpbGwucHJvY2Vzc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGVsc2UgaWYgKGZpbGwudGVtcGxhdGUuZm9ybXVsYSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1yZWZlcmVuY2luZyBmb3JtdWxhIGZvdW5kICcke2ZpbGwuZXh0cmFjdG9yfScuIFVzZSBhIG5vbi10ZW1wbGF0ZWQgb25lIWApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWxsKGZpbGwsIGRhdGEsIGZpbGwudGVtcGxhdGUuY2VsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgcHJvdmlkZWQgaGFuZGxlciBmcm9tIHRoZSBtYXAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhhbmRsZXJOYW1lIFRoZSBuYW1lIG9mIHRoZSBoYW5kbGVyLlxuICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gaXRzZWxmLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyKGhhbmRsZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJGbiA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW2hhbmRsZXJOYW1lXTtcblxuICAgICAgICBpZiAoIWhhbmRsZXJGbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGNhbm5vdCBiZSBmb3VuZCFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGhhbmRsZXJGbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGlzIG5vdCBhIGZ1bmN0aW9uIWApO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJGbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHByb3ZpZGVkIGV4dHJhY3RvciAob3QgaXRlcmF0b3IpIHN0cmluZyB0byBmaW5kIGEgY2FsbGJhY2sgaWQgaW5zaWRlLCBpZiBwcmVzZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGl0ZXJhdG9yL2V4dHJhY3RvciBzdHJpbmcgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBBIHsgYHBhdGhgLCBgaGFuZGxlcmAgfSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBKU09OIHBhdGhcbiAgICAgKiByZWFkeSBmb3IgdXNlIGFuZCB0aGUgcHJvdmlkZWQgYGhhbmRsZXJgIF9mdW5jdGlvbl8gLSByZWFkeSBmb3IgaW52b2tpbmcsIGlmIHN1Y2ggaXMgcHJvdmlkZWQuXG4gICAgICogSWYgbm90IC0gdGhlIGBwYXRoYCBwcm9wZXJ0eSBjb250YWlucyB0aGUgcHJvdmlkZWQgYGV4dHJhY3RvcmAsIGFuZCB0aGUgYGhhbmRsZXJgIGlzIGBudWxsYC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKSB7XG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBleHRyYWN0UGFydHMgPSBleHRyYWN0b3Iuc3BsaXQoXCI6XCIpLFxuICAgICAgICAgICAgaGFuZGxlck5hbWUgPSBleHRyYWN0UGFydHNbMV07XG5cbiAgICAgICAgcmV0dXJuIGV4dHJhY3RQYXJ0cy5sZW5ndGggPT0gMVxuICAgICAgICAgICAgPyB7IHBhdGg6IGV4dHJhY3RvciwgaGFuZGxlcjogbnVsbCB9XG4gICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICBwYXRoOiBleHRyYWN0UGFydHNbMF0sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogdGhpcy5nZXRIYW5kbGVyKGhhbmRsZXJOYW1lKVxuICAgICAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBzdHlsZSBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSBvbnRvIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGRlc3RpbmF0aW9uIGNlbGwgdG8gYXBwbHkgc3R5bGluZyB0by5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIGNodW5rIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRvIGJlIHVzZWQgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7RGF0YUZpbGxlcn0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcblxuICAgICAgICBpZiAodGhpcy5fb3B0cy5jb3B5U3R5bGUpXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFN0eWxlKGNlbGwsIHBhaXIubmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgY29udGVudHMgb2YgdGhlIGNlbGwgaW50byBhIHZhbGlkIHRlbXBsYXRlIGluZm8uXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIGNvbnRhaW5pbmcgdGhlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBwYXJzZWQgdGVtcGxhdGUuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGJ1aWxkcyB0ZW1wbGF0ZSBpbmZvLCB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBzdXBwbGllZCBvcHRpb25zLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwpO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZU1hdGNoID0gdmFsdWUubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIGlmICghcmVNYXRjaCB8fCAhdGhpcy5fb3B0cy5mb2xsb3dGb3JtdWxhZSAmJiB0aGlzLl9hY2Nlc3MuY2VsbFR5cGUoY2VsbCkgPT09ICdmb3JtdWxhJykgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpLFxuICAgICAgICAgICAgZXh0cmFjdG9yID0gcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGxSZWYgPSB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICcke3JlTWF0Y2hbMF19J2ApO1xuICAgICAgICBpZiAoISFwYXJ0c1swXSAmJiAhY2VsbFJlZilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWZlcmVuY2UgcGFzc2VkOiAnJHtwYXJ0c1swXX0nYCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZTogY2VsbFJlZixcbiAgICAgICAgICAgIGl0ZXJhdG9yczogcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBleHRyYWN0b3I6IGV4dHJhY3RvcixcbiAgICAgICAgICAgIGZvcm11bGE6IGV4dHJhY3Rvci5zdGFydHNXaXRoKFwiPVwiKSxcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFsbFRlbXBsYXRlc1xuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGEuY2VsbCkgfHwgIWEucmVmZXJlbmNlID8gLTEgOiAxKVxuICAgICAgICAgICAgLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIHJlZmVyZW5jZSBjZWxsLCBpZiBzdWNoIGV4aXN0cy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bWJlcnxEYXRlfEFycmF5fEFycmF5LjxBcnJheS48Kj4+fSBUaGUgdmFsdWUgdG8gYmUgdXNlZC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgaXMgdXNlZCBldmVuIHdoZW4gYSB3aG9sZSAtIHBvc3NpYmx5IHJlY3Rhbmd1bGFyIC0gcmFuZ2UgaXMgYWJvdXQgdG8gYmUgc2V0LCBzbyBpdCBjYW5cbiAgICAgKiByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIHJvb3QsIGNlbGwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIGFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZGF0YSBmb3IgdGhlIGdpdmVuIGZpbGwsIGJhc2VkIG9uIHRoZSBnaXZlblxuICAgICAqIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIG1haW4gcmVmZXJlbmNlIG9iamVjdCB0byBhcHBseSBpdGVyYXRvcnMgdG8uXG4gICAgICogQHBhcmFtIHtBcnJheX0gaXRlcmF0b3JzIExpc3Qgb2YgaXRlcmF0b3JzIC0gc3RyaW5nIEpTT04gcGF0aHMgaW5zaWRlIHRoZSByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IFRoZSBpbmRleCBpbiB0aGUgaXRlcmF0b3JzIGFycmF5IHRvIHdvcmsgb24uXG4gICAgICogQHJldHVybnMge0FycmF5fEFycmF5LjxBcnJheT59IEFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZXh0cmFjdGVkIGRhdGEuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3REYXRhKHJvb3QsIGl0ZXJhdG9ycywgaWR4KSB7XG4gICAgICAgIGxldCBpdGVyID0gaXRlcmF0b3JzW2lkeF0sXG4gICAgICAgICAgICBzaXplcyA9IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IGZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGl0ZXIgPT0gJzEnKSB7XG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGl0ZXIgPSBpdGVyYXRvcnNbKytpZHhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpdGVyKSByZXR1cm4gcm9vdDtcblxuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgcGFyc2VkSXRlciA9IHRoaXMucGFyc2VFeHRyYWN0b3IoaXRlcik7XG5cbiAgICAgICAgZGF0YSA9IF8uZ2V0KHJvb3QsIHBhcnNlZEl0ZXIucGF0aCwgcm9vdCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlZEl0ZXIuaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIGRhdGEgPSBwYXJzZWRJdGVyLmhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCBkYXRhKTtcblxuICAgICAgICBpZiAoaWR4IDwgaXRlcmF0b3JzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBfLm1hcChkYXRhLCBpblJvb3QgPT4gdGhpcy5leHRyYWN0RGF0YShpblJvb3QsIGl0ZXJhdG9ycywgaWR4ICsgMSkpO1xuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhWzBdLnNpemVzO1xuICAgICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEpICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JylcbiAgICAgICAgICAgIGRhdGEgPSBfLnZhbHVlcyhkYXRhKTtcblxuICAgICAgICAvLyBTb21lIGRhdGEgc2FuaXR5IGNoZWNrcy5cbiAgICAgICAgaWYgKCFkYXRhKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgaXRlcmF0b3IgJyR7aXRlcn0nIGV4dHJhY3RlZCBubyBkYXRhIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIGV4dHJhY3RlZCBmcm9tIGl0ZXJhdG9yICcke2l0ZXJ9JyBpcyBuZWl0aGVyIGFuIGFycmF5LCBub3Igb2JqZWN0IWApO1xuXG4gICAgICAgIHNpemVzLnVuc2hpZnQodHJhbnNwb3NlZCA/IC1kYXRhLmxlbmd0aCA6IGRhdGEubGVuZ3RoKTtcbiAgICAgICAgZGF0YS5zaXplcyA9IHNpemVzO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdXQgdGhlIGRhdGEgdmFsdWVzIGludG8gdGhlIHByb3BlciBjZWxscywgd2l0aCBjb3JyZWN0IGV4dHJhY3RlZCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHt7fX0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgdGhlIGRhdGEgdG8gYmUgcHV0LlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgVGhlIGFjdHVhbCBkYXRhIHRvIGJlIHB1dC4gVGhlIHZhbHVlcyB3aWxsIGJlIF9leHRyYWN0ZWRfIGZyb20gaGVyZSBmaXJzdC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdGhhdCBpcyBiZWluZyBpbXBsZW1lbnRlZCB3aXRoIHRoYXQgZGF0YSBmaWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gTWF0cml4IHNpemUgdGhhdCB0aGlzIGRhdGEgaGFzIG9jY3VwaWVkIG9uIHRoZSBzaGVldCBbcm93cywgY29sc10uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHB1dFZhbHVlcyhjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBpZiAoIWNlbGwpIHRocm93IG5ldyBFcnJvcihcIkNyYXNoISBOdWxsIHJlZmVyZW5jZSBjZWxsIGluICdwdXRWYWx1ZXMoKSchXCIpO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBkYXRhLnNpemVzLFxuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgdGVtcGxhdGUuZXh0cmFjdG9yLCBjZWxsKTtcblxuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldENlbGxWYWx1ZShjZWxsLCB2YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBfLmNodW5rKGRhdGEsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWVbcmldW2NpXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhW3JpXVtjaV0sIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogRGVhbCB3aXRoIG1vcmUgdGhhbiAzIGRpbWVuc2lvbnMgY2FzZS5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWVzIGV4dHJhY3RlZCB3aXRoICcke3RlbXBsYXRlLmV4dHJhY3Rvcn0gYXJlIG1vcmUgdGhhbiAyIGRpbWVuc2lvbiEnYCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHRoZSBnaXZlbiBmaWx0ZXIgb250byB0aGUgc2hlZXQgLSBleHRyYWN0aW5nIHRoZSBwcm9wZXIgZGF0YSwgZm9sbG93aW5nIGRlcGVuZGVudCBmaWxscywgZXRjLlxuICAgICAqIEBwYXJhbSB7e319IGFGaWxsIFRoZSBmaWxsIHRvIGJlIGFwcGxpZWQsIGFzIGNvbnN0cnVjdGVkIGluIHRoZSB7QGxpbmsgZmlsbERhdGF9IG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgdXNlZCBmb3IgZGF0YSBleHRyYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gbWFpbkNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIGRhdGEgcGxhY2VtZW50IHByb2NlZHVyZS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBzaXplIG9mIHRoZSBkYXRhIHB1dCBpbiBbcm93LCBjb2xdIGZvcm1hdC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlGaWxsKGFGaWxsLCByb290LCBtYWluQ2VsbCkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgdGhlRGF0YSA9IHRoaXMuZXh0cmFjdERhdGEocm9vdCwgdGVtcGxhdGUuaXRlcmF0b3JzLCAwKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gWzEsIDFdO1xuXG4gICAgICAgIGlmICghYUZpbGwuZGVwZW5kZW50cyB8fCAhYUZpbGwuZGVwZW5kZW50cy5sZW5ndGgpXG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0aGlzLnB1dFZhbHVlcyhtYWluQ2VsbCwgdGhlRGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXh0Q2VsbCA9IG1haW5DZWxsO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZU1heHhlciA9ICh2YWwsIGlkeCkgPT4gZW50cnlTaXplW2lkeF0gPSBNYXRoLm1heChlbnRyeVNpemVbaWR4XSwgdmFsKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCB0aGVEYXRhLmxlbmd0aDsgKytkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5Sb290ID0gdGhlRGF0YVtkXTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYUZpbGwuZGVwZW5kZW50cy5sZW5ndGg7ICsrZikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbkZpbGwgPSBhRmlsbC5kZXBlbmRlbnRzW2ZdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5DZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIGluRmlsbC5vZmZzZXRbMF0sIGluRmlsbC5vZmZzZXRbMV0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuYXBwbHlGaWxsKGluRmlsbCwgaW5Sb290LCBpbkNlbGwpLCBzaXplTWF4eGVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBOb3cgd2UgaGF2ZSB0aGUgaW5uZXIgZGF0YSBwdXQgYW5kIHRoZSBzaXplIGNhbGN1bGF0ZWQuXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMucHV0VmFsdWVzKG5leHRDZWxsLCBpblJvb3QsIHRlbXBsYXRlKSwgc2l6ZU1heHhlcik7XG5cbiAgICAgICAgICAgICAgICBsZXQgcm93T2Zmc2V0ID0gZW50cnlTaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSBlbnRyeVNpemVbMV07XG5cbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgd2UgZ3JvdyBvbmx5IG9uIG9uZSBkaW1lbnNpb24uXG4gICAgICAgICAgICAgICAgaWYgKHRoZURhdGEuc2l6ZXNbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvd09mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVsxXSA9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzBdID0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocm93T2Zmc2V0ID4gMSB8fCBjb2xPZmZzZXQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UobmV4dENlbGwsIE1hdGgubWF4KHJvd09mZnNldCAtIDEsIDApLCBNYXRoLm1heChjb2xPZmZzZXQgLSAxLCAwKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gdHJ1ZSB8fCB0aGlzLl9vcHRzLm1lcmdlQ2VsbCA9PT0gJ2JvdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCByb3dPZmZzZXQgPiAxICYmIHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gJ3ZlcnRpY2FsJyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IGNvbE9mZnNldCA+IDEgJiYgdGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSAnaG9yaXpvbnRhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MucmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICBybmcuZm9yRWFjaChjZWxsID0+IHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArICh0ZW1wbGF0ZS5wYWRkaW5nWzBdIHx8IDApLCBjb2xPZmZzZXQgKyAodGVtcGxhdGUucGFkZGluZ1sxXSB8fCAwKSk7XHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHJlY2FsYyBjb21iaW5lZCBlbnRyeSBzaXplLlxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UobWFpbkNlbGwsIG5leHRDZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goYUZpbGwuZm9ybXVsYXMsIGYgPT4gdGhpcy5hcHBseUZvcm11bGEoZiwgZW50cnlTaXplLCBtYWluQ2VsbCkpO1xuXG4gICAgICAgIGFGaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBhIGZvcm11bGEgYmUgc2hpZnRpbmcgYWxsIHRoZSBmaXhlZCBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2hpZnRlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcixOdW1iZXI+fSBvZmZzZXQgVGhlIG9mZnNldCBvZiB0aGUgcmVmZXJlbmNlZCB0ZW1wbGF0ZSB0byB0aGUgZm9ybXVsYSBvbmUuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gc2l6ZSBUaGUgc2l6ZSBvZiB0aGUgcmFuZ2VzIGFzIHRoZXkgc2hvdWxkIGJlLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwcm9jZXNzZWQgdGV4dC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgc2l6ZSkge1xuICAgICAgICBsZXQgbmV3Rm9ybXVsYSA9ICcnO1xuXG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZm9ybXVsYS5tYXRjaChyZWZSZWdFeHApO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCkgYnJlYWs7XG5cbiAgICAgICAgICAgIGxldCBmcm9tID0gdGhpcy5fYWNjZXNzLmdldENlbGwobWF0Y2hbM10sIG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBuZXdSZWYgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob2Zmc2V0WzBdID4gMCB8fCBvZmZzZXRbMV0gPiAwKVxuICAgICAgICAgICAgICAgIGZyb20gPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChmcm9tLCBvZmZzZXRbMF0sIG9mZnNldFsxXSk7XG5cbiAgICAgICAgICAgIG5ld1JlZiA9ICFtYXRjaFs1XVxuICAgICAgICAgICAgICAgID8gdGhpcy5fYWNjZXNzLmNlbGxSZWYoZnJvbSwgISFtYXRjaFsyXSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuX2FjY2Vzcy5yYW5nZVJlZih0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGZyb20sIHNpemVbMF0sIHNpemVbMV0pLCAhIW1hdGNoWzJdKTtcblxuICAgICAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhLnN1YnN0cigwLCBtYXRjaC5pbmRleCkgKyBuZXdSZWY7XG4gICAgICAgICAgICBmb3JtdWxhID0gZm9ybXVsYS5zdWJzdHIobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhO1xuICAgICAgICByZXR1cm4gbmV3Rm9ybXVsYTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZm9ybXVsYSBpbiB0aGUgc2hlZXQsIGkuZS4gY2hhbmdpbmcgaXQgdG8gbWF0Y2ggdGhlIFxuICAgICAqIHNpemVzIG9mIHRoZSByZWZlcmVuY2VzIHRlbXBsYXRlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXI+fSBlbnRyeVNpemUgVGhlIGZpbGwtdG8tc2l6ZSBtYXAsIGFzIGNvbnN0cnVjdGVkIHNvIGZhclxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBwdXQvc3RhcnQgdGhpcyBmb3JtdWxhIGludG9cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZvcm11bGEoYUZpbGwsIGVudHJ5U2l6ZSwgY2VsbCkge1xuICAgICAgICBjZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoY2VsbCwgYUZpbGwub2Zmc2V0WzBdLCBhRmlsbC5vZmZzZXRbMV0pO1xuXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICBpdGVyID0gXy50cmltKHRlbXBsYXRlLml0ZXJhdG9yc1swXSksXG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHRlbXBsYXRlLmNlbGwsIGNlbGwpO1xuICAgICAgICAgICAgXG4gICAgICAgIGxldCBmb3JtdWxhID0gdGVtcGxhdGUuZXh0cmFjdG9yLCBcbiAgICAgICAgICAgIHJuZztcbiAgICAgICAgICAgIFxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbFZhbHVlKGNlbGwsIG51bGwpO1xuXG4gICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAyICYmIGVudHJ5U2l6ZVsxXSA8IDIgfHwgaXRlciA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbMCwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAnY29scycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFtlbnRyeVNpemVbMF0gLSAxLCAwXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIDAsIGVudHJ5U2l6ZVsxXSAtIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZXIgPT09ICdyb3dzJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIGVudHJ5U2l6ZVsxXSAtIDFdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgMCk7XG4gICAgICAgIH0gZWxzZSB7IC8vIGkuZS4gJ25vbmUnXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0Q2VsbEZvcm11bGEoY2VsbCwgdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMV0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRSYW5nZUZvcm11bGEocm5nLCBmb3JtdWxhKTtcbiAgICB9XG59XG5cbi8qKlxuICogVGhlIGJ1aWx0LWluIGFjY2Vzc29yIGJhc2VkIG9uIHhsc3gtcG9wdWxhdGUgbnBtIG1vZHVsZVxuICogQHR5cGUge1hsc3hQb3B1bGF0ZUFjY2Vzc31cbiAqL1xuWGxzeERhdGFGaWxsLlhsc3hQb3B1bGF0ZUFjY2VzcyA9IHJlcXVpcmUoJy4vWGxzeFBvcHVsYXRlQWNjZXNzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuLy8gY29uc3QgYWxsU3R5bGVzID0gW1xuLy8gICAgIFwiYm9sZFwiLCBcbi8vICAgICBcIml0YWxpY1wiLCBcbi8vICAgICBcInVuZGVybGluZVwiLCBcbi8vICAgICBcInN0cmlrZXRocm91Z2hcIiwgXG4vLyAgICAgXCJzdWJzY3JpcHRcIiwgXG4vLyAgICAgXCJzdXBlcnNjcmlwdFwiLCBcbi8vICAgICBcImZvbnRTaXplXCIsIFxuLy8gICAgIFwiZm9udEZhbWlseVwiLCBcbi8vICAgICBcImZvbnRHZW5lcmljRmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udFNjaGVtZVwiLCBcbi8vICAgICBcImZvbnRDb2xvclwiLCBcbi8vICAgICBcImhvcml6b250YWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJqdXN0aWZ5TGFzdExpbmVcIiwgXG4vLyAgICAgXCJpbmRlbnRcIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbEFsaWdubWVudFwiLCBcbi8vICAgICBcIndyYXBUZXh0XCIsIFxuLy8gICAgIFwic2hyaW5rVG9GaXRcIiwgXG4vLyAgICAgXCJ0ZXh0RGlyZWN0aW9uXCIsIFxuLy8gICAgIFwidGV4dFJvdGF0aW9uXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q291bnRlcmNsb2Nrd2lzZVwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENsb2Nrd2lzZVwiLCBcbi8vICAgICBcInJvdGF0ZVRleHRVcFwiLCBcbi8vICAgICBcInJvdGF0ZVRleHREb3duXCIsIFxuLy8gICAgIFwidmVydGljYWxUZXh0XCIsIFxuLy8gICAgIFwiZmlsbFwiLCBcbi8vICAgICBcImJvcmRlclwiLCBcbi8vICAgICBcImJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwiYm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyXCIsIFwicmlnaHRCb3JkZXJcIiwgXCJ0b3BCb3JkZXJcIiwgXCJib3R0b21Cb3JkZXJcIiwgXCJkaWFnb25hbEJvcmRlclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJDb2xvclwiLCBcInJpZ2h0Qm9yZGVyQ29sb3JcIiwgXCJ0b3BCb3JkZXJDb2xvclwiLCBcImJvdHRvbUJvcmRlckNvbG9yXCIsIFwiZGlhZ29uYWxCb3JkZXJDb2xvclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJTdHlsZVwiLCBcInJpZ2h0Qm9yZGVyU3R5bGVcIiwgXCJ0b3BCb3JkZXJTdHlsZVwiLCBcImJvdHRvbUJvcmRlclN0eWxlXCIsIFwiZGlhZ29uYWxCb3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImRpYWdvbmFsQm9yZGVyRGlyZWN0aW9uXCIsIFxuLy8gICAgIFwibnVtYmVyRm9ybWF0XCJcbi8vIF07XG5cbmxldCBfUmljaFRleHQgPSBudWxsO1xuXG4vKipcbiAqIGB4c2x4LXBvcHVsYXRlYCBsaWJyYXJ5IGJhc2VkIGFjY2Vzc29yIHRvIGEgZ2l2ZW4gRXhjZWwgd29ya2Jvb2suIEFsbCB0aGVzZSBtZXRob2RzIGFyZSBpbnRlcm5hbGx5IHVzZWQgYnkge0BsaW5rIFhsc3hEYXRhRmlsbH0sIFxuICogYnV0IGNhbiBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciBpbXBsZW1lbnRpbmcgY3VzdG9tIHNwcmVhZHNoZWV0IGFjY2Vzc29ycy5cbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIHRodXNcbiAgICAgKiBhdm9pZGluZyBtYWtpbmcgdGhlIGB4bHN4LWRhdGFmaWxsYCBwYWNrYWdlIGEgZGVwZW5kZW5jeS5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3b3JrYm9vaywgWGxzeFBvcHVsYXRlKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rID0gd29ya2Jvb2s7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgXG4gICAgICAgIF9SaWNoVGV4dCA9IFhsc3hQb3B1bGF0ZS5SaWNoVGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb25maWd1cmVkIHdvcmtib29rIGZvciBkaXJlY3QgWGxzeFBvcHVsYXRlIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7V29ya2Jvb2t9IFRoZSB3b3JrYm9vayBpbnZvbHZlZC5cbiAgICAgKi9cbiAgICB3b3JrYm9vaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtib29rOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGNlbGwncyBjb250ZW50cy5cbiAgICAgKi9cbiAgICBjZWxsVmFsdWUoY2VsbCkge1xuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0ID8gdGhlVmFsdWUudGV4dCgpIDogdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHJlcXVlc3RlZCB2YWx1ZSBmb3Igc2V0dGluZy5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBFaXRoZXIgdGhlIHJlcXVlc3RlZCB2YWx1ZSBvciBjaGFpbmFibGUgdGhpcy5cbiAgICAgKi9cbiAgICBzZXRDZWxsVmFsdWUoY2VsbCwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC52YWx1ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHR5cGUgb2YgdGhlIGNlbGwgLSAnZm9ybXVsYScsICdyaWNodGV4dCcsIFxuICAgICAqICd0ZXh0JywgJ251bWJlcicsICdkYXRlJywgJ2h5cGVybGluaycsIG9yICd1bmtub3duJztcbiAgICAgKi9cbiAgICBjZWxsVHlwZShjZWxsKSB7XG4gICAgICAgIGlmIChjZWxsLmZvcm11bGEoKSlcbiAgICAgICAgICAgIHJldHVybiAnZm9ybXVsYSc7XG4gICAgICAgIGVsc2UgaWYgKGNlbGwuaHlwZXJsaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2h5cGVybGluayc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0KVxuICAgICAgICAgICAgcmV0dXJuICdyaWNodGV4dCc7XG4gICAgICAgIGVsc2UgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcbiAgICAgICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGZvcm11bGEgaW4gdGhlIGNlbGxcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybXVsYSAtIHRoZSB0ZXh0IG9mIHRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0Q2VsbEZvcm11bGEoY2VsbCwgZm9ybXVsYSkge1xuICAgICAgICBjZWxsLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZWFzdXJlcyB0aGUgZGlzdGFuY2UsIGFzIGEgdmVjdG9yIGJldHdlZW4gdHdvIGdpdmVuIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZnJvbSBUaGUgZmlyc3QgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHRvIFRoZSBzZWNvbmQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBjZWxscy5cbiAgICAgKi9cbiAgICBjZWxsRGlzdGFuY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRvLnJvd051bWJlcigpIC0gZnJvbS5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIHRvLmNvbHVtbk51bWJlcigpIC0gZnJvbS5jb2x1bW5OdW1iZXIoKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgdGhlIHNpemUgb2YgY2VsbCwgdGFraW5nIGludG8gYWNjb3VudCBpZiBpdCBpcyBwYXJ0IG9mIGEgbWVyZ2VkIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBvY2N1cGllZCBzaXplLlxuICAgICAqL1xuICAgIGNlbGxTaXplKGNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbEFkZHIgPSBjZWxsLmFkZHJlc3MoKTtcbiAgICAgICAgbGV0IHRoZVNpemUgPSBbMSwgMV07XG4gICAgXG4gICAgICAgIF8uZm9yRWFjaChjZWxsLnNoZWV0KCkuX21lcmdlQ2VsbHMsIHJhbmdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQWRkciA9IHJhbmdlLmF0dHJpYnV0ZXMucmVmLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChyYW5nZUFkZHJbMF0gPT0gY2VsbEFkZHIpIHtcbiAgICAgICAgICAgICAgICB0aGVTaXplID0gdGhpcy5jZWxsRGlzdGFuY2UoY2VsbCwgY2VsbC5zaGVldCgpLmNlbGwocmFuZ2VBZGRyWzFdKSk7XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzBdO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhlU2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmFtZWQgc3R5bGUgb2YgYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgc3R5bGUgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIGZvciB0aGlzIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRDZWxsU3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2VsbC5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgcmVmZXJlbmNlIHN0cmluZyBmb3IgYSBjZWxsIGlkZW50aWZpZWQgYnkgQHBhcmFtIGFkciwgZnJvbSB0aGUgQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgY2VsbCB0aGF0IGlzIGEgYmFzZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZHIgVGhlIGFkZHJlc3Mgb2YgdGhlIHRhcmdldCBjZWxsLCBhcyBtZW50aW9uZWQgaW4gQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSByZWZlcmVuY2Ugc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0YXJnZXQgY2VsbCB1bmlxdWVseS5cbiAgICAgKi9cbiAgICBidWlsZFJlZihjZWxsLCBhZHIsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYSBnaXZlbiBjZWxsIGZyb20gYSBnaXZlbiBzaGVldCAob3IgYW4gYWN0aXZlIG9uZSkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBhZGRyZXNzIFRoZSBjZWxsIGFkcmVzcyB0byBiZSB1c2VkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8aWR4fSBzaGVldElkIFRoZSBpZC9uYW1lIG9mIHRoZSBzaGVldCB0byByZXRyaWV2ZSB0aGUgY2VsbCBmcm9tLiBEZWZhdWx0cyB0byBhbiBhY3RpdmUgb25lLlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBBIHJlZmVyZW5jZSB0byB0aGUgcmVxdWlyZWQgY2VsbC5cbiAgICAgKi9cbiAgICBnZXRDZWxsKGFkZHJlc3MsIHNoZWV0SWQpIHtcbiAgICAgICAgY29uc3QgdGhlU2hlZXQgPSBzaGVldElkID09IG51bGwgPyB0aGlzLl93b3JrYm9vay5hY3RpdmVTaGVldCgpIDogdGhpcy5fd29ya2Jvb2suc2hlZXQoc2hlZXRJZCk7XG4gICAgICAgIHJldHVybiB0aGVTaGVldC5jZWxsKGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYW5kIHJldHVybnMgdGhlIHJhbmdlIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIGNlbGwgYW5kIHNwYXduaW5nIGdpdmVuIHJvd3MgYW5kIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHJvd09mZnNldCBOdW1iZXIgb2Ygcm93cyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSByb3cuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvbE9mZnNldCBOdW1iZXIgb2YgY29sdW1ucyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSBjb2x1bW4uXG4gICAgICogQHJldHVybnMge1JhbmdlfSBUaGUgY29uc3RydWN0ZWQgcmFuZ2UuXG4gICAgICovXG4gICAgZ2V0Q2VsbFJhbmdlKGNlbGwsIHJvd09mZnNldCwgY29sT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJhbmdlVG8oY2VsbC5yZWxhdGl2ZUNlbGwocm93T2Zmc2V0LCBjb2xPZmZzZXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBjZWxsIGF0IGEgY2VydGFpbiBvZmZzZXQgZnJvbSBhIGdpdmVuIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHJlZmVyZW5jZSBjZWxsIHRvIG1ha2UgdGhlIG9mZnNldCBmcm9tLlxuICAgICAqIEBwYXJhbSB7aW50fSByb3dzIE51bWJlciBvZiByb3dzIHRvIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge2ludH0gY29scyBOdW1iZXIgb2YgY29sdW1ucyB0byBvZmZzZXQuXG4gICAgICogQHJldHVybnMge0NlbGx9IFRoZSByZXN1bHRpbmcgY2VsbC5cbiAgICAgKi9cbiAgICBvZmZzZXRDZWxsKGNlbGwsIHJvd3MsIGNvbHMpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmVsYXRpdmVDZWxsKHJvd3MsIGNvbHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lcmdlIG9yIHNwbGl0IHJhbmdlIG9mIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdHVzIFRoZSBtZXJnZWQgc3RhdHVzIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICByYW5nZU1lcmdlZChyYW5nZSwgc3RhdHVzKSB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5tZXJnZWQoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIGZvcm11bGEgZm9yIHRoZSB3aG9sZSByYW5nZS4gSWYgaXQgY29udGFpbnMgb25seSBvbmUgLSBpdCBpcyBzZXQgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHNldFJhbmdlRm9ybXVsYShyYW5nZSwgZm9ybXVsYSkge1xuICAgICAgICByYW5nZS5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBnaXZlbiByYW5nZS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2Ugd2hpY2ggYWRkcmVzcyB3ZSdyZSBpbnRlcmVzdGVkIGluLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSBzaGVldCBuYW1lIGluIHRoZSBhZGRyZXNzLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiByYW5nZS5cbiAgICAgKi9cbiAgICByYW5nZVJlZihyYW5nZSwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiByYW5nZS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGhlUmFuZ2UgPSBzaGVldC51c2VkUmFuZ2UoKTtcbiAgICAgICAgICAgIGlmICh0aGVSYW5nZSkgXG4gICAgICAgICAgICAgICAgdGhlUmFuZ2UuZm9yRWFjaChjYik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmICghc3JjIHx8ICFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCAnc3JjJyBvciAnZGVzdCcgZm9yIGNvcHlTdHlsZSgpIVwiKTtcbiAgICAgICAgaWYgKHNyYyA9PSBkZXN0KSByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG5cbiAgICAgICAgY29uc3QgZGVzdFNoZWV0SWQgPSBkZXN0LnNoZWV0KCkubmFtZSgpLFxuICAgICAgICAgICAgcm93SWQgPSBgJyR7ZGVzdFNoZWV0SWR9Jzoke2Rlc3Qucm93TnVtYmVyKCl9YCxcbiAgICAgICAgICAgIGNvbElkID0gYCcke2Rlc3RTaGVldElkfSc6JHtkZXN0LmNvbHVtbk51bWJlcigpfWA7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvd1NpemVzW3Jvd0lkXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93SWRdID0gc3JjLnJvdygpLmhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9jb2xTaXplc1tjb2xJZF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3QuY29sdW1uKCkud2lkdGgodGhpcy5fY29sU2l6ZXNbY29sSWRdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
