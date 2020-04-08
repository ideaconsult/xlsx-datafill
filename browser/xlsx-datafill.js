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

      if (styles && data) {
        _2.each(styles, function (pair) {
          if (_2.startsWith(pair.name, ":")) {
            _this2.getHandler(pair.name.substr(1)).call(_this2._opts, data, cell);
          } else {
            var val = _this2.extractValues(data, pair.extractor, cell);

            if (val) _this2._access.cellStyle(cell, pair.name, val);
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
          extractor = parts[2] || "";
      if (parts.length < 2) throw new Error("Not enough components of the template '".concat(reMatch[0], "'"));
      return {
        reference: this._access.buildRef(cell, parts[0]),
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
        return a.reference == _this3._access.cellRef(b.cell) > -1 ? 1 : b.reference == _this3._access.cellRef(a.cell) > -1 ? -1 : 0;
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

      var entrySize = data.sizes,
          value = this.extractValues(data, template.extractor, cell); // make sure, the 

      if (!entrySize || !entrySize.length) {
        this._access.cellValue(cell, value).copyStyle(cell, template.cell).copySize(cell, template.cell);

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
          _this6._access.cellValue(cell, value[ri][ci]).copyStyle(cell, template.cell).copySize(cell, template.cell);

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

        for (var d = 0; d < theData.length; ++d) {
          var inRoot = theData[d];

          for (var f = 0; f < aFill.dependents.length; ++f) {
            var inFill = aFill.dependents[f],
                inCell = this._access.offsetCell(nextCell, inFill.offset[0], inFill.offset[1]);

            _2.forEach(this.applyFill(inFill, inRoot, inCell), sizeMaxxer);
          } // Now we have the inner data put and the size calculated.


          _2.forEach(this.putValues(nextCell, inRoot, template), sizeMaxxer);

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
            var rng = this._access.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0));

            if (this._opts.mergeCells === true || this._opts.mergeCell === 'both' || rowOffset > 1 && this._opts.mergeCells === 'vertical' || colOffset > 1 && this._opts.mergeCells === 'horizontal') this._access.rangeMerged(rng, true);
            rng.forEach(function (cell) {
              return _this7._access.copySize(cell, template.cell);
            });
          } // Finally, calculate the next cell.


          nextCell = this._access.offsetCell(nextCell, rowOffset + (template.padding[0] || 0), colOffset + (template.padding[1] || 0));
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

        if (offset[0] > 0 && offset[1] > 0) from = this._access.offsetCell(from, offset[0], offset[1]);
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

      this._access.cellValue(cell, null);

      if (entrySize[0] < 2 && entrySize[1] < 2 || iter === 'all') {
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
        formula = this.shiftFormula(formula, offset, [entrySize[0] - 1, entrySize[1] - 1]);

        this._access.cellFormula(cell, formula);

        return;
      }

      this._access.rangeFormula(rng, formula);
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
     * Gets/Sets the textual representation of the cell value.
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {*} value - The requested value for setting.
     * @returns {string} The textual representation of cell's contents.
     * @returns {*|XlsxPopulateAccess} Either the requested value or chainable this.
     */

  }, {
    key: "cellValue",
    value: function cellValue(cell, value) {
      if (value !== undefined) {
        cell.value(value);
        return this;
      } else {
        var theValue = cell.value();
        return theValue instanceof _RichText ? theValue.text() : theValue;
      }
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
     * Gets the formula from the cell or null, if there isn't any
     * @param {Cell} cell - The cell to retrieve the value from.
     * @param {string} formula - the text of the formula to be set.
     * @returns {string} The formula inside the cell or this for chaining.
     */

  }, {
    key: "cellFormula",
    value: function cellFormula(cell, formula) {
      if (formula !== undefined) {
        cell.formula(_.trimStart(formula, ' ='));
        return this;
      } else return cell.formula();
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
    key: "cellStyle",
    value: function cellStyle(cell, name, value) {
      if (value !== undefined) {
        cell.style(name, value);
        return this;
      } else {
        return cell.style(name);
      }
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
    key: "rangeFormula",
    value: function rangeFormula(range, formula) {
      if (formula !== undefined) {
        range.formula(_.trimStart(formula, ' ='));
        return this;
      } else {
        return range.formula();
      }
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
      if (src == dest) return this;
      if (src._style !== undefined) dest.style(src._style);else if (src._styleId > 0) dest._styleId = src._styleId;
      return this;
    }
    /**
     * Resize the column and row of the destination cell, if not changed already.
     * @param {Cell} dest The destination cell which row and column to resize.
     * @param {Cell} src The source (template) cell to take the size from.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "copySize",
    value: function copySize(dest, src) {
      var row = dest.rowNumber(),
          col = dest.columnNumber();
      if (this._rowSizes[row] === undefined) dest.row().height(this._rowSizes[row] = src.row().height());
      if (this._colSizes[col] === undefined) dest.column().width(this._colSizes[col] = src.column().width());
      return this;
    }
  }]);

  return XlsxPopulateAccess;
}();

module.exports = XlsxPopulateAccess;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBTkUsQ0FBcEI7QUFXQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsd0JBQVksUUFBWixFQUFzQixJQUF0QixFQUE0QjtBQUFBOztBQUN4QixTQUFLLEtBQUwsR0FBYSxFQUFDLENBQUMsWUFBRixDQUFlLEVBQWYsRUFBbUIsSUFBbkIsRUFBeUIsV0FBekIsQ0FBYjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssT0FBTCxHQUFlLFFBQWY7QUFDSDtBQUVEOzs7Ozs7Ozs7OzRCQU1RLE8sRUFBUztBQUNiLFVBQUksT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFFBQUEsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFLLEtBQWIsRUFBb0IsT0FBcEI7O0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FIRCxNQUlJLE9BQU8sS0FBSyxLQUFaO0FBQ1A7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFNO0FBQUE7O0FBQ1gsVUFBTSxTQUFTLEdBQUcsRUFBbEIsQ0FEVyxDQUdYOztBQUNBLFdBQUssZ0JBQUwsQ0FBc0IsVUFBQSxRQUFRLEVBQUk7QUFDOUIsWUFBTSxLQUFLLEdBQUc7QUFDVixVQUFBLFFBQVEsRUFBRSxRQURBO0FBRVYsVUFBQSxVQUFVLEVBQUUsRUFGRjtBQUdWLFVBQUEsUUFBUSxFQUFFLEVBSEE7QUFJVixVQUFBLFNBQVMsRUFBRTtBQUpELFNBQWQ7O0FBT0EsWUFBSSxRQUFRLENBQUMsU0FBYixFQUF3QjtBQUNwQixjQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVYsQ0FBekI7QUFFQSxjQUFJLENBQUMsT0FBTCxFQUFjLE1BQU0sSUFBSSxLQUFKLHVDQUF5QyxRQUFRLENBQUMsU0FBbEQsUUFBTjtBQUVkLGNBQUksUUFBUSxDQUFDLE9BQWIsRUFDSSxPQUFPLENBQUMsUUFBUixDQUFpQixJQUFqQixDQUFzQixLQUF0QixFQURKLEtBR0ksT0FBTyxDQUFDLFVBQVIsQ0FBbUIsSUFBbkIsQ0FBd0IsS0FBeEI7QUFFSixVQUFBLEtBQUssQ0FBQyxNQUFOLEdBQWUsS0FBSSxDQUFDLE9BQUwsQ0FBYSxZQUFiLENBQTBCLE9BQU8sQ0FBQyxRQUFSLENBQWlCLElBQTNDLEVBQWlELFFBQVEsQ0FBQyxJQUExRCxDQUFmO0FBQ0g7O0FBQ0QsUUFBQSxTQUFTLENBQUMsS0FBSSxDQUFDLE9BQUwsQ0FBYSxPQUFiLENBQXFCLFFBQVEsQ0FBQyxJQUE5QixDQUFELENBQVQsR0FBaUQsS0FBakQ7QUFDSCxPQXJCRCxFQUpXLENBMkJYOztBQUNBLE1BQUEsRUFBQyxDQUFDLElBQUYsQ0FBTyxTQUFQLEVBQWtCLFVBQUEsSUFBSSxFQUFJO0FBQ3RCLFlBQUksSUFBSSxDQUFDLFNBQVQsRUFDSSxPQURKLEtBRUssSUFBSSxJQUFJLENBQUMsUUFBTCxDQUFjLE9BQWxCLEVBQ0QsTUFBTSxJQUFJLEtBQUosMENBQTRDLElBQUksQ0FBQyxTQUFqRCxpQ0FBTixDQURDLEtBR0QsS0FBSSxDQUFDLFNBQUwsQ0FBZSxJQUFmLEVBQXFCLElBQXJCLEVBQTJCLElBQUksQ0FBQyxRQUFMLENBQWMsSUFBekM7QUFDUCxPQVBEOztBQVNBLGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7OzsrQkFNVyxXLEVBQWE7QUFDcEIsVUFBTSxTQUFTLEdBQUcsS0FBSyxLQUFMLENBQVcsWUFBWCxDQUF3QixXQUF4QixDQUFsQjtBQUVBLFVBQUksQ0FBQyxTQUFMLEVBQ0ksTUFBTSxJQUFJLEtBQUosb0JBQXNCLFdBQXRCLHdCQUFOLENBREosS0FFSyxJQUFJLE9BQU8sU0FBUCxLQUFxQixVQUF6QixFQUNELE1BQU0sSUFBSSxLQUFKLG9CQUFzQixXQUF0QiwwQkFBTixDQURDLEtBR0QsT0FBTyxTQUFQO0FBQ1A7QUFFRDs7Ozs7Ozs7Ozs7bUNBUWUsUyxFQUFXO0FBQ3RCO0FBQ0EsVUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLEtBQVYsQ0FBZ0IsR0FBaEIsQ0FBckI7QUFBQSxVQUNJLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBRCxDQUQ5QjtBQUdBLGFBQU8sWUFBWSxDQUFDLE1BQWIsSUFBdUIsQ0FBdkIsR0FDRDtBQUFFLFFBQUEsSUFBSSxFQUFFLFNBQVI7QUFBbUIsUUFBQSxPQUFPLEVBQUU7QUFBNUIsT0FEQyxHQUVEO0FBQ0UsUUFBQSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUQsQ0FEcEI7QUFFRSxRQUFBLE9BQU8sRUFBRSxLQUFLLFVBQUwsQ0FBZ0IsV0FBaEI7QUFGWCxPQUZOO0FBTUg7QUFFRDs7Ozs7Ozs7Ozs7bUNBUWUsSSxFQUFNLEksRUFBTSxRLEVBQVU7QUFBQTs7QUFDakMsVUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQXhCOztBQUVBLFVBQUksTUFBTSxJQUFJLElBQWQsRUFBb0I7QUFDaEIsUUFBQSxFQUFDLENBQUMsSUFBRixDQUFPLE1BQVAsRUFBZSxVQUFBLElBQUksRUFBSTtBQUNuQixjQUFJLEVBQUMsQ0FBQyxVQUFGLENBQWEsSUFBSSxDQUFDLElBQWxCLEVBQXdCLEdBQXhCLENBQUosRUFBa0M7QUFDOUIsWUFBQSxNQUFJLENBQUMsVUFBTCxDQUFnQixJQUFJLENBQUMsSUFBTCxDQUFVLE1BQVYsQ0FBaUIsQ0FBakIsQ0FBaEIsRUFBcUMsSUFBckMsQ0FBMEMsTUFBSSxDQUFDLEtBQS9DLEVBQXNELElBQXRELEVBQTRELElBQTVEO0FBQ0gsV0FGRCxNQUVPO0FBQ0gsZ0JBQU0sR0FBRyxHQUFHLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLEVBQXlCLElBQUksQ0FBQyxTQUE5QixFQUF5QyxJQUF6QyxDQUFaOztBQUNBLGdCQUFJLEdBQUosRUFDSSxNQUFJLENBQUMsT0FBTCxDQUFhLFNBQWIsQ0FBdUIsSUFBdkIsRUFBNkIsSUFBSSxDQUFDLElBQWxDLEVBQXdDLEdBQXhDO0FBQ1A7QUFDSixTQVJEO0FBU0g7O0FBRUQsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OztrQ0FPYyxJLEVBQU07QUFDaEIsVUFBTSxLQUFLLEdBQUcsS0FBSyxPQUFMLENBQWEsU0FBYixDQUF1QixJQUF2QixDQUFkOztBQUNBLFVBQUksS0FBSyxJQUFJLElBQVQsSUFBaUIsT0FBTyxLQUFQLEtBQWlCLFFBQXRDLEVBQ0ksT0FBTyxJQUFQO0FBRUosVUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQU4sQ0FBWSxLQUFLLEtBQUwsQ0FBVyxjQUF2QixDQUFoQjtBQUNBLFVBQUksQ0FBQyxPQUFELElBQVksQ0FBQyxLQUFLLEtBQUwsQ0FBVyxjQUFaLElBQThCLEtBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsTUFBZ0MsU0FBOUUsRUFDSSxPQUFPLElBQVA7QUFFSixVQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBRCxDQUFQLENBQVcsS0FBWCxDQUFpQixLQUFLLEtBQUwsQ0FBVyxhQUE1QixFQUEyQyxHQUEzQyxDQUErQyxFQUFDLENBQUMsSUFBakQsQ0FBZDtBQUFBLFVBQ0ksTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUQsQ0FBTixHQUFZLElBQVosR0FBbUIsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTLEtBQVQsQ0FBZSxHQUFmLENBRGhDO0FBQUEsVUFFSSxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUQsQ0FBTCxJQUFZLEVBRjVCO0FBSUEsVUFBSSxLQUFLLENBQUMsTUFBTixHQUFlLENBQW5CLEVBQ0ksTUFBTSxJQUFJLEtBQUosa0RBQW9ELE9BQU8sQ0FBQyxDQUFELENBQTNELE9BQU47QUFFSixhQUFPO0FBQ0gsUUFBQSxTQUFTLEVBQUUsS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixJQUF0QixFQUE0QixLQUFLLENBQUMsQ0FBRCxDQUFqQyxDQURSO0FBRUgsUUFBQSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTLEtBQVQsQ0FBZSxNQUFmLEVBQXVCLEdBQXZCLENBQTJCLEVBQUMsQ0FBQyxJQUE3QixDQUZSO0FBR0gsUUFBQSxTQUFTLEVBQUUsU0FIUjtBQUlILFFBQUEsT0FBTyxFQUFFLFNBQVMsQ0FBQyxVQUFWLENBQXFCLEdBQXJCLENBSk47QUFLSCxRQUFBLElBQUksRUFBRSxJQUxIO0FBTUgsUUFBQSxRQUFRLEVBQUUsS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixJQUF0QixDQU5QO0FBT0gsUUFBQSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBRCxDQUFMLElBQVksRUFBYixFQUFpQixLQUFqQixDQUF1QixVQUF2QixFQUFtQyxHQUFuQyxDQUF1QyxVQUFBLENBQUM7QUFBQSxpQkFBSSxRQUFRLENBQUMsQ0FBRCxDQUFSLElBQWUsQ0FBbkI7QUFBQSxTQUF4QyxDQVBOO0FBUUgsUUFBQSxNQUFNLEVBQUUsQ0FBQyxNQUFELEdBQVUsSUFBVixHQUFpQixFQUFDLENBQUMsR0FBRixDQUFNLE1BQU4sRUFBYyxVQUFBLENBQUMsRUFBSTtBQUN4QyxjQUFNLElBQUksR0FBRyxFQUFDLENBQUMsSUFBRixDQUFPLENBQVAsRUFBVSxLQUFWLENBQWdCLEdBQWhCLENBQWI7O0FBQ0EsaUJBQU87QUFBRSxZQUFBLElBQUksRUFBRSxFQUFDLENBQUMsSUFBRixDQUFPLElBQUksQ0FBQyxDQUFELENBQVgsQ0FBUjtBQUF5QixZQUFBLFNBQVMsRUFBRSxFQUFDLENBQUMsSUFBRixDQUFPLElBQUksQ0FBQyxDQUFELENBQVg7QUFBcEMsV0FBUDtBQUNILFNBSHdCO0FBUnRCLE9BQVA7QUFhSDtBQUVEOzs7Ozs7Ozs7Ozs7cUNBU2lCLEUsRUFBSTtBQUFBOztBQUNqQixVQUFNLFlBQVksR0FBRyxFQUFyQjs7QUFFQSxXQUFLLE9BQUwsQ0FBYSxXQUFiLENBQXlCLFVBQUEsSUFBSSxFQUFJO0FBQzdCLFlBQU0sUUFBUSxHQUFHLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLENBQWpCOztBQUNBLFlBQUksUUFBSixFQUNJLFlBQVksQ0FBQyxJQUFiLENBQWtCLFFBQWxCO0FBQ1AsT0FKRDs7QUFNQSxhQUFPLFlBQVksQ0FDZCxJQURFLENBQ0csVUFBQyxDQUFELEVBQUksQ0FBSjtBQUFBLGVBQVUsQ0FBQyxDQUFDLFNBQUYsSUFBZSxNQUFJLENBQUMsT0FBTCxDQUFhLE9BQWIsQ0FBcUIsQ0FBQyxDQUFDLElBQXZCLElBQStCLENBQUMsQ0FBL0MsR0FDVixDQURVLEdBRVYsQ0FBQyxDQUFDLFNBQUYsSUFBZSxNQUFJLENBQUMsT0FBTCxDQUFhLE9BQWIsQ0FBcUIsQ0FBQyxDQUFDLElBQXZCLElBQStCLENBQUMsQ0FBL0MsR0FBbUQsQ0FBQyxDQUFwRCxHQUF3RCxDQUZ4RDtBQUFBLE9BREgsRUFJRixPQUpFLENBSU0sRUFKTixDQUFQO0FBS0g7QUFFRDs7Ozs7Ozs7Ozs7OztrQ0FVYyxJLEVBQU0sUyxFQUFXLEksRUFBTTtBQUFBOztBQUFBLGlDQUNQLEtBQUssY0FBTCxDQUFvQixTQUFwQixDQURPO0FBQUEsVUFDekIsSUFEeUIsd0JBQ3pCLElBRHlCO0FBQUEsVUFDbkIsT0FEbUIsd0JBQ25CLE9BRG1COztBQUdqQyxVQUFJLENBQUMsS0FBSyxDQUFDLE9BQU4sQ0FBYyxJQUFkLENBQUwsRUFDSSxJQUFJLEdBQUcsRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksSUFBWixFQUFrQixJQUFsQixDQUFQLENBREosS0FFSyxJQUFJLElBQUksQ0FBQyxLQUFMLEtBQWUsU0FBbkIsRUFDRCxJQUFJLEdBQUcsQ0FBQyxTQUFELEdBQWEsSUFBYixHQUFvQixFQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBWSxVQUFBLEtBQUs7QUFBQSxlQUFJLE1BQUksQ0FBQyxhQUFMLENBQW1CLEtBQW5CLEVBQTBCLFNBQTFCLEVBQXFDLElBQXJDLENBQUo7QUFBQSxPQUFqQixDQUEzQixDQURDLEtBRUEsSUFBSSxDQUFDLE9BQUwsRUFDRCxPQUFPLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxLQUFMLENBQVcsUUFBWCxJQUF1QixHQUFqQyxDQUFQO0FBRUosYUFBTyxDQUFDLE9BQUQsR0FBVyxJQUFYLEdBQWtCLE9BQU8sQ0FBQyxJQUFSLENBQWEsS0FBSyxLQUFsQixFQUF5QixJQUF6QixFQUErQixJQUEvQixDQUF6QjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7OztnQ0FTWSxJLEVBQU0sUyxFQUFXLEcsRUFBSztBQUFBOztBQUM5QixVQUFJLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRCxDQUFwQjtBQUFBLFVBQ0ksS0FBSyxHQUFHLEVBRFo7QUFBQSxVQUVJLFVBQVUsR0FBRyxLQUZqQjtBQUFBLFVBR0ksSUFBSSxHQUFHLElBSFg7O0FBS0EsVUFBSSxJQUFJLElBQUksR0FBWixFQUFpQjtBQUNiLFFBQUEsVUFBVSxHQUFHLElBQWI7QUFDQSxRQUFBLElBQUksR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFILENBQWhCO0FBQ0g7O0FBRUQsVUFBSSxDQUFDLElBQUwsRUFBVyxPQUFPLElBQVAsQ0FYbUIsQ0FhOUI7O0FBQ0EsVUFBTSxVQUFVLEdBQUcsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQW5CO0FBRUEsTUFBQSxJQUFJLEdBQUcsRUFBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVksVUFBVSxDQUFDLElBQXZCLEVBQTZCLElBQTdCLENBQVA7QUFFQSxVQUFJLE9BQU8sVUFBVSxDQUFDLE9BQWxCLEtBQThCLFVBQWxDLEVBQ0ksSUFBSSxHQUFHLFVBQVUsQ0FBQyxPQUFYLENBQW1CLElBQW5CLENBQXdCLEtBQUssS0FBN0IsRUFBb0MsSUFBcEMsQ0FBUDs7QUFFSixVQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBVixHQUFtQixDQUE3QixFQUFnQztBQUM1QixRQUFBLElBQUksR0FBRyxFQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBWSxVQUFBLE1BQU07QUFBQSxpQkFBSSxNQUFJLENBQUMsV0FBTCxDQUFpQixNQUFqQixFQUF5QixTQUF6QixFQUFvQyxHQUFHLEdBQUcsQ0FBMUMsQ0FBSjtBQUFBLFNBQWxCLENBQVA7QUFDQSxRQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBRCxDQUFKLENBQVEsS0FBaEI7QUFDSCxPQUhELE1BR08sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFOLENBQWMsSUFBZCxDQUFELElBQXdCLFFBQU8sSUFBUCxNQUFnQixRQUE1QyxFQUNILElBQUksR0FBRyxFQUFDLENBQUMsTUFBRixDQUFTLElBQVQsQ0FBUCxDQXpCMEIsQ0EyQjlCOzs7QUFDQSxVQUFJLENBQUMsSUFBTCxFQUNJLE1BQU0sSUFBSSxLQUFKLHlCQUEyQixJQUEzQiwwQkFBTixDQURKLEtBRUssSUFBSSxRQUFPLElBQVAsTUFBZ0IsUUFBcEIsRUFDRCxNQUFNLElBQUksS0FBSiw2Q0FBK0MsSUFBL0Msd0NBQU47QUFFSixNQUFBLEtBQUssQ0FBQyxPQUFOLENBQWMsVUFBVSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQVQsR0FBa0IsSUFBSSxDQUFDLE1BQS9DO0FBQ0EsTUFBQSxJQUFJLENBQUMsS0FBTCxHQUFhLEtBQWI7QUFDQSxhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7Ozs4QkFRVSxJLEVBQU0sSSxFQUFNLFEsRUFBVTtBQUFBOztBQUM1QixVQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBckI7QUFBQSxVQUNJLEtBQUssR0FBRyxLQUFLLGFBQUwsQ0FBbUIsSUFBbkIsRUFBeUIsUUFBUSxDQUFDLFNBQWxDLEVBQTZDLElBQTdDLENBRFosQ0FENEIsQ0FJNUI7O0FBQ0EsVUFBSSxDQUFDLFNBQUQsSUFBYyxDQUFDLFNBQVMsQ0FBQyxNQUE3QixFQUFxQztBQUNqQyxhQUFLLE9BQUwsQ0FDSyxTQURMLENBQ2UsSUFEZixFQUNxQixLQURyQixFQUVLLFNBRkwsQ0FFZSxJQUZmLEVBRXFCLFFBQVEsQ0FBQyxJQUY5QixFQUdLLFFBSEwsQ0FHYyxJQUhkLEVBR29CLFFBQVEsQ0FBQyxJQUg3Qjs7QUFJQSxhQUFLLGNBQUwsQ0FBb0IsSUFBcEIsRUFBMEIsSUFBMUIsRUFBZ0MsUUFBaEM7QUFDQSxRQUFBLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBckI7QUFDSCxPQVBELE1BT08sSUFBSSxTQUFTLENBQUMsTUFBVixJQUFvQixDQUF4QixFQUEyQjtBQUM5QjtBQUNBLFlBQUksU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQW5CLEVBQXNCO0FBQ2xCLFVBQUEsU0FBUyxHQUFHLENBQUMsQ0FBRCxFQUFJLENBQUMsU0FBUyxDQUFDLENBQUQsQ0FBZCxDQUFaO0FBQ0EsVUFBQSxLQUFLLEdBQUcsQ0FBQyxLQUFELENBQVI7QUFDQSxVQUFBLElBQUksR0FBRyxDQUFDLElBQUQsQ0FBUDtBQUNILFNBSkQsTUFJTyxJQUFJLFNBQVMsQ0FBQyxNQUFWLElBQW9CLENBQXhCLEVBQTJCO0FBQzlCLFVBQUEsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFWLENBQWlCLENBQUMsQ0FBRCxDQUFqQixDQUFaO0FBQ0EsVUFBQSxLQUFLLEdBQUcsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFSLEVBQWUsQ0FBZixDQUFSO0FBQ0EsVUFBQSxJQUFJLEdBQUcsRUFBQyxDQUFDLEtBQUYsQ0FBUSxJQUFSLEVBQWMsQ0FBZCxDQUFQO0FBQ0g7O0FBRUQsYUFBSyxPQUFMLENBQWEsWUFBYixDQUEwQixJQUExQixFQUFnQyxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBL0MsRUFBa0QsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWpFLEVBQW9FLE9BQXBFLENBQTRFLFVBQUMsSUFBRCxFQUFPLEVBQVAsRUFBVyxFQUFYLEVBQWtCO0FBQzFGLFVBQUEsTUFBSSxDQUFDLE9BQUwsQ0FDSyxTQURMLENBQ2UsSUFEZixFQUNxQixLQUFLLENBQUMsRUFBRCxDQUFMLENBQVUsRUFBVixDQURyQixFQUVLLFNBRkwsQ0FFZSxJQUZmLEVBRXFCLFFBQVEsQ0FBQyxJQUY5QixFQUdLLFFBSEwsQ0FHYyxJQUhkLEVBR29CLFFBQVEsQ0FBQyxJQUg3Qjs7QUFJQSxVQUFBLE1BQUksQ0FBQyxjQUFMLENBQW9CLElBQXBCLEVBQTBCLElBQUksQ0FBQyxFQUFELENBQUosQ0FBUyxFQUFULENBQTFCLEVBQXdDLFFBQXhDO0FBQ0gsU0FORDtBQU9ILE9BbkJNLE1BbUJBO0FBQ0g7QUFDQSxjQUFNLElBQUksS0FBSixrQ0FBb0MsUUFBUSxDQUFDLFNBQTdDLGtDQUFOO0FBQ0g7O0FBRUQsYUFBTyxTQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs7OEJBUVUsSyxFQUFPLEksRUFBTSxRLEVBQVU7QUFBQTs7QUFDN0IsVUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQXZCO0FBQUEsVUFDSSxPQUFPLEdBQUcsS0FBSyxXQUFMLENBQWlCLElBQWpCLEVBQXVCLFFBQVEsQ0FBQyxTQUFoQyxFQUEyQyxDQUEzQyxDQURkO0FBR0EsVUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFoQjtBQUVBLFVBQUksQ0FBQyxLQUFLLENBQUMsVUFBUCxJQUFxQixDQUFDLEtBQUssQ0FBQyxVQUFOLENBQWlCLE1BQTNDLEVBQ0ksU0FBUyxHQUFHLEtBQUssU0FBTCxDQUFlLFFBQWYsRUFBeUIsT0FBekIsRUFBa0MsUUFBbEMsQ0FBWixDQURKLEtBRUs7QUFDRCxZQUFJLFFBQVEsR0FBRyxRQUFmOztBQUNBLFlBQU0sVUFBVSxHQUFHLFNBQWIsVUFBYSxDQUFDLEdBQUQsRUFBTSxHQUFOO0FBQUEsaUJBQWMsU0FBUyxDQUFDLEdBQUQsQ0FBVCxHQUFpQixJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVMsQ0FBQyxHQUFELENBQWxCLEVBQXlCLEdBQXpCLENBQS9CO0FBQUEsU0FBbkI7O0FBRUEsYUFBSyxJQUFJLENBQUMsR0FBRyxDQUFiLEVBQWdCLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBNUIsRUFBb0MsRUFBRSxDQUF0QyxFQUF5QztBQUNyQyxjQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBRCxDQUF0Qjs7QUFFQSxlQUFLLElBQUksQ0FBQyxHQUFHLENBQWIsRUFBZ0IsQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFOLENBQWlCLE1BQXJDLEVBQTZDLEVBQUUsQ0FBL0MsRUFBa0Q7QUFDOUMsZ0JBQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFOLENBQWlCLENBQWpCLENBQWY7QUFBQSxnQkFDSSxNQUFNLEdBQUcsS0FBSyxPQUFMLENBQWEsVUFBYixDQUF3QixRQUF4QixFQUFrQyxNQUFNLENBQUMsTUFBUCxDQUFjLENBQWQsQ0FBbEMsRUFBb0QsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLENBQXBELENBRGI7O0FBR0EsWUFBQSxFQUFDLENBQUMsT0FBRixDQUFVLEtBQUssU0FBTCxDQUFlLE1BQWYsRUFBdUIsTUFBdkIsRUFBK0IsTUFBL0IsQ0FBVixFQUFrRCxVQUFsRDtBQUNILFdBUm9DLENBVXJDOzs7QUFDQSxVQUFBLEVBQUMsQ0FBQyxPQUFGLENBQVUsS0FBSyxTQUFMLENBQWUsUUFBZixFQUF5QixNQUF6QixFQUFpQyxRQUFqQyxDQUFWLEVBQXNELFVBQXREOztBQUVBLGNBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFELENBQXpCO0FBQUEsY0FDSSxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUQsQ0FEekIsQ0FicUMsQ0FnQnJDOztBQUNBLGNBQUksT0FBTyxDQUFDLEtBQVIsQ0FBYyxDQUFkLElBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFlBQUEsU0FBUyxHQUFHLENBQVo7QUFDQSxZQUFBLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFmO0FBQ0gsV0FIRCxNQUdPO0FBQ0gsWUFBQSxTQUFTLEdBQUcsQ0FBWjtBQUNBLFlBQUEsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWY7QUFDSDs7QUFFRCxjQUFJLFNBQVMsR0FBRyxDQUFaLElBQWlCLFNBQVMsR0FBRyxDQUFqQyxFQUFvQztBQUNoQyxnQkFBTSxHQUFHLEdBQUcsS0FBSyxPQUFMLENBQWEsWUFBYixDQUEwQixRQUExQixFQUFvQyxJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVMsR0FBRyxDQUFyQixFQUF3QixDQUF4QixDQUFwQyxFQUFnRSxJQUFJLENBQUMsR0FBTCxDQUFTLFNBQVMsR0FBRyxDQUFyQixFQUF3QixDQUF4QixDQUFoRSxDQUFaOztBQUVBLGdCQUFJLEtBQUssS0FBTCxDQUFXLFVBQVgsS0FBMEIsSUFBMUIsSUFBa0MsS0FBSyxLQUFMLENBQVcsU0FBWCxLQUF5QixNQUEzRCxJQUNHLFNBQVMsR0FBRyxDQUFaLElBQWlCLEtBQUssS0FBTCxDQUFXLFVBQVgsS0FBMEIsVUFEOUMsSUFFRyxTQUFTLEdBQUcsQ0FBWixJQUFpQixLQUFLLEtBQUwsQ0FBVyxVQUFYLEtBQTBCLFlBRmxELEVBR0ksS0FBSyxPQUFMLENBQWEsV0FBYixDQUF5QixHQUF6QixFQUE4QixJQUE5QjtBQUVKLFlBQUEsR0FBRyxDQUFDLE9BQUosQ0FBWSxVQUFBLElBQUk7QUFBQSxxQkFBSSxNQUFJLENBQUMsT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsRUFBNEIsUUFBUSxDQUFDLElBQXJDLENBQUo7QUFBQSxhQUFoQjtBQUNILFdBbENvQyxDQW9DckM7OztBQUNBLFVBQUEsUUFBUSxHQUFHLEtBQUssT0FBTCxDQUFhLFVBQWIsQ0FBd0IsUUFBeEIsRUFBa0MsU0FBUyxJQUFJLFFBQVEsQ0FBQyxPQUFULENBQWlCLENBQWpCLEtBQXVCLENBQTNCLENBQTNDLEVBQTBFLFNBQVMsSUFBSSxRQUFRLENBQUMsT0FBVCxDQUFpQixDQUFqQixLQUF1QixDQUEzQixDQUFuRixDQUFYO0FBQ0gsU0ExQ0EsQ0E0Q0Q7OztBQUNBLFFBQUEsRUFBQyxDQUFDLE9BQUYsQ0FBVSxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLFFBQTFCLEVBQW9DLFFBQXBDLENBQVYsRUFBeUQsVUFBekQ7QUFDSDs7QUFFRCxNQUFBLEVBQUMsQ0FBQyxPQUFGLENBQVUsS0FBSyxDQUFDLFFBQWhCLEVBQTBCLFVBQUEsQ0FBQztBQUFBLGVBQUksTUFBSSxDQUFDLFlBQUwsQ0FBa0IsQ0FBbEIsRUFBcUIsU0FBckIsRUFBZ0MsUUFBaEMsQ0FBSjtBQUFBLE9BQTNCOztBQUVBLE1BQUEsS0FBSyxDQUFDLFNBQU4sR0FBa0IsSUFBbEI7QUFDQSxhQUFPLFNBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7O2lDQU9hLE8sRUFBUyxNLEVBQVEsSSxFQUFNO0FBQ2hDLFVBQUksVUFBVSxHQUFHLEVBQWpCOztBQUVBLGVBQVM7QUFDTCxZQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBUixDQUFjLFNBQWQsQ0FBZDtBQUNBLFlBQUksQ0FBQyxLQUFMLEVBQVk7O0FBRVosWUFBSSxJQUFJLEdBQUcsS0FBSyxPQUFMLENBQWEsT0FBYixDQUFxQixLQUFLLENBQUMsQ0FBRCxDQUExQixFQUErQixLQUFLLENBQUMsQ0FBRCxDQUFwQyxDQUFYO0FBQUEsWUFDSSxNQUFNLEdBQUcsSUFEYjs7QUFHQSxZQUFJLE1BQU0sQ0FBQyxDQUFELENBQU4sR0FBWSxDQUFaLElBQWlCLE1BQU0sQ0FBQyxDQUFELENBQU4sR0FBWSxDQUFqQyxFQUNJLElBQUksR0FBRyxLQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLElBQXhCLEVBQThCLE1BQU0sQ0FBQyxDQUFELENBQXBDLEVBQXlDLE1BQU0sQ0FBQyxDQUFELENBQS9DLENBQVA7QUFFSixRQUFBLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFELENBQU4sR0FDSCxLQUFLLE9BQUwsQ0FBYSxPQUFiLENBQXFCLElBQXJCLEVBQTJCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBRCxDQUFsQyxDQURHLEdBRUgsS0FBSyxPQUFMLENBQWEsUUFBYixDQUFzQixLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLElBQTFCLEVBQWdDLElBQUksQ0FBQyxDQUFELENBQXBDLEVBQXlDLElBQUksQ0FBQyxDQUFELENBQTdDLENBQXRCLEVBQXlFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBRCxDQUFoRixDQUZOO0FBSUEsUUFBQSxVQUFVLElBQUksT0FBTyxDQUFDLE1BQVIsQ0FBZSxDQUFmLEVBQWtCLEtBQUssQ0FBQyxLQUF4QixJQUFpQyxNQUEvQztBQUNBLFFBQUEsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFSLENBQWUsS0FBSyxDQUFDLEtBQU4sR0FBYyxLQUFLLENBQUMsQ0FBRCxDQUFMLENBQVMsTUFBdEMsQ0FBVjtBQUNIOztBQUVELE1BQUEsVUFBVSxJQUFJLE9BQWQ7QUFDQSxhQUFPLFVBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7Ozs7aUNBU2EsSyxFQUFPLFMsRUFBVyxJLEVBQU07QUFDakMsTUFBQSxJQUFJLEdBQUcsS0FBSyxPQUFMLENBQWEsVUFBYixDQUF3QixJQUF4QixFQUE4QixLQUFLLENBQUMsTUFBTixDQUFhLENBQWIsQ0FBOUIsRUFBK0MsS0FBSyxDQUFDLE1BQU4sQ0FBYSxDQUFiLENBQS9DLENBQVA7O0FBRUEsVUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQXZCO0FBQUEsVUFDSSxJQUFJLEdBQUcsRUFBQyxDQUFDLElBQUYsQ0FBTyxRQUFRLENBQUMsU0FBVCxDQUFtQixDQUFuQixDQUFQLENBRFg7QUFBQSxVQUVJLE1BQU0sR0FBRyxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLFFBQVEsQ0FBQyxJQUFuQyxFQUF5QyxJQUF6QyxDQUZiOztBQUlBLFVBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUF2QjtBQUFBLFVBQ0ksR0FESjtBQUdBLE1BQUEsS0FBSyxDQUFDLFNBQU4sR0FBa0IsSUFBbEI7O0FBQ0EsV0FBSyxPQUFMLENBQWEsU0FBYixDQUF1QixJQUF2QixFQUE2QixJQUE3Qjs7QUFFQSxVQUFJLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFmLElBQW9CLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFuQyxJQUF3QyxJQUFJLEtBQUssS0FBckQsRUFBNEQ7QUFDeEQsUUFBQSxPQUFPLEdBQUcsS0FBSyxZQUFMLENBQWtCLE9BQWxCLEVBQTJCLE1BQTNCLEVBQW1DLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBbkMsQ0FBVjtBQUNBLFFBQUEsR0FBRyxHQUFHLEtBQUssT0FBTCxDQUFhLFlBQWIsQ0FBMEIsSUFBMUIsRUFBZ0MsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQS9DLEVBQWtELFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFqRSxDQUFOO0FBQ0gsT0FIRCxNQUdPLElBQUksSUFBSSxLQUFLLE1BQWIsRUFBcUI7QUFDeEIsUUFBQSxPQUFPLEdBQUcsS0FBSyxZQUFMLENBQWtCLE9BQWxCLEVBQTJCLE1BQTNCLEVBQW1DLENBQUMsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWhCLEVBQW1CLENBQW5CLENBQW5DLENBQVY7QUFDQSxRQUFBLEdBQUcsR0FBRyxLQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLElBQTFCLEVBQWdDLENBQWhDLEVBQW1DLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFsRCxDQUFOO0FBQ0gsT0FITSxNQUdBLElBQUksSUFBSSxLQUFLLE1BQWIsRUFBcUI7QUFDeEIsUUFBQSxPQUFPLEdBQUcsS0FBSyxZQUFMLENBQWtCLE9BQWxCLEVBQTJCLE1BQTNCLEVBQW1DLENBQUMsQ0FBRCxFQUFJLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFuQixDQUFuQyxDQUFWO0FBQ0EsUUFBQSxHQUFHLEdBQUcsS0FBSyxPQUFMLENBQWEsWUFBYixDQUEwQixJQUExQixFQUFnQyxTQUFTLENBQUMsQ0FBRCxDQUFULEdBQWUsQ0FBL0MsRUFBa0QsQ0FBbEQsQ0FBTjtBQUNILE9BSE0sTUFHQTtBQUFFO0FBQ0wsUUFBQSxPQUFPLEdBQUcsS0FBSyxZQUFMLENBQWtCLE9BQWxCLEVBQTJCLE1BQTNCLEVBQW1DLENBQUMsU0FBUyxDQUFDLENBQUQsQ0FBVCxHQUFlLENBQWhCLEVBQW1CLFNBQVMsQ0FBQyxDQUFELENBQVQsR0FBZSxDQUFsQyxDQUFuQyxDQUFWOztBQUNBLGFBQUssT0FBTCxDQUFhLFdBQWIsQ0FBeUIsSUFBekIsRUFBK0IsT0FBL0I7O0FBQ0E7QUFDSDs7QUFFRCxXQUFLLE9BQUwsQ0FBYSxZQUFiLENBQTBCLEdBQTFCLEVBQStCLE9BQS9CO0FBQ0g7Ozs7O0FBR0w7Ozs7OztBQUlBLFlBQVksQ0FBQyxrQkFBYixHQUFrQyxPQUFPLENBQUMsc0JBQUQsQ0FBekM7QUFFQSxNQUFNLENBQUMsT0FBUCxHQUFpQixZQUFqQjs7Ozs7O0FDL2VBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakIsQyxDQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUVBLElBQUksU0FBUyxHQUFHLElBQWhCO0FBRUE7Ozs7O0lBSU0sa0I7QUFDRjs7Ozs7Ozs7QUFRQSw4QkFBWSxRQUFaLEVBQXNCLFlBQXRCLEVBQW9DO0FBQUE7O0FBQ2hDLFNBQUssU0FBTCxHQUFpQixRQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUVBLElBQUEsU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUF6QjtBQUNIO0FBRUQ7Ozs7Ozs7OytCQUlXO0FBQ1AsYUFBTyxLQUFLLFNBQVo7QUFDSDtBQUVEOzs7Ozs7Ozs7OzhCQU9VLEksRUFBTSxLLEVBQU87QUFDbkIsVUFBSSxLQUFLLEtBQUssU0FBZCxFQUF5QjtBQUNyQixRQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBWDtBQUNBLGVBQU8sSUFBUDtBQUNILE9BSEQsTUFHTztBQUNILFlBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFMLEVBQWpCO0FBQ0EsZUFBTyxRQUFRLFlBQVksU0FBcEIsR0FBZ0MsUUFBUSxDQUFDLElBQVQsRUFBaEMsR0FBa0QsUUFBekQ7QUFDSDtBQUNKO0FBRUQ7Ozs7Ozs7Ozs2QkFNUyxJLEVBQU07QUFDWCxVQUFJLElBQUksQ0FBQyxPQUFMLEVBQUosRUFDSSxPQUFPLFNBQVAsQ0FESixLQUVLLElBQUksSUFBSSxDQUFDLFNBQUwsRUFBSixFQUNELE9BQU8sV0FBUDtBQUVKLFVBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFMLEVBQWpCO0FBQ0EsVUFBSSxRQUFRLFlBQVksU0FBeEIsRUFDSSxPQUFPLFVBQVAsQ0FESixLQUVLLElBQUksUUFBUSxZQUFZLElBQXhCLEVBQ0QsT0FBTyxNQUFQLENBREMsS0FHRCxlQUFjLFFBQWQ7QUFDUDtBQUVEOzs7Ozs7Ozs7Z0NBTVksSSxFQUFNLE8sRUFBUztBQUN2QixVQUFJLE9BQU8sS0FBSyxTQUFoQixFQUEyQjtBQUN2QixRQUFBLElBQUksQ0FBQyxPQUFMLENBQWEsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxPQUFaLEVBQXFCLElBQXJCLENBQWI7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BSUksT0FBTyxJQUFJLENBQUMsT0FBTCxFQUFQO0FBQ1A7QUFFRDs7Ozs7Ozs7O2lDQU1hLEksRUFBTSxFLEVBQUk7QUFDbkIsYUFBTyxDQUNILEVBQUUsQ0FBQyxTQUFILEtBQWlCLElBQUksQ0FBQyxTQUFMLEVBRGQsRUFFSCxFQUFFLENBQUMsWUFBSCxLQUFvQixJQUFJLENBQUMsWUFBTCxFQUZqQixDQUFQO0FBSUg7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFNO0FBQUE7O0FBQ1gsVUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQUwsRUFBakI7QUFDQSxVQUFJLE9BQU8sR0FBRyxDQUFDLENBQUQsRUFBSSxDQUFKLENBQWQ7O0FBRUEsTUFBQSxDQUFDLENBQUMsT0FBRixDQUFVLElBQUksQ0FBQyxLQUFMLEdBQWEsV0FBdkIsRUFBb0MsVUFBQSxLQUFLLEVBQUk7QUFDekMsWUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsR0FBakIsQ0FBcUIsS0FBckIsQ0FBMkIsR0FBM0IsQ0FBbEI7O0FBQ0EsWUFBSSxTQUFTLENBQUMsQ0FBRCxDQUFULElBQWdCLFFBQXBCLEVBQThCO0FBQzFCLFVBQUEsT0FBTyxHQUFHLEtBQUksQ0FBQyxZQUFMLENBQWtCLElBQWxCLEVBQXdCLElBQUksQ0FBQyxLQUFMLEdBQWEsSUFBYixDQUFrQixTQUFTLENBQUMsQ0FBRCxDQUEzQixDQUF4QixDQUFWO0FBQ0EsWUFBRSxPQUFPLENBQUMsQ0FBRCxDQUFUO0FBQ0EsWUFBRSxPQUFPLENBQUMsQ0FBRCxDQUFUO0FBQ0EsaUJBQU8sS0FBUDtBQUNIO0FBQ0osT0FSRDs7QUFVQSxhQUFPLE9BQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7OzhCQU9VLEksRUFBTSxJLEVBQU0sSyxFQUFPO0FBQ3pCLFVBQUksS0FBSyxLQUFLLFNBQWQsRUFBeUI7QUFDckIsUUFBQSxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVgsRUFBaUIsS0FBakI7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BR087QUFDSCxlQUFPLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBWCxDQUFQO0FBQ0g7QUFDSjtBQUVEOzs7Ozs7Ozs7NEJBTVEsSSxFQUFNLFMsRUFBVztBQUNyQixVQUFJLFNBQVMsSUFBSSxJQUFqQixFQUNJLFNBQVMsR0FBRyxJQUFaO0FBQ0osYUFBTyxJQUFJLENBQUMsT0FBTCxDQUFhO0FBQUUsUUFBQSxnQkFBZ0IsRUFBRTtBQUFwQixPQUFiLENBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7OzZCQU9TLEksRUFBTSxHLEVBQUssUyxFQUFXO0FBQzNCLFVBQUksU0FBUyxJQUFJLElBQWpCLEVBQ0ksU0FBUyxHQUFHLElBQVo7QUFDSixhQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBTCxHQUFhLElBQWIsQ0FBa0IsR0FBbEIsRUFBdUIsT0FBdkIsQ0FBK0I7QUFBRSxRQUFBLGdCQUFnQixFQUFFO0FBQXBCLE9BQS9CLENBQUgsR0FBcUUsSUFBL0U7QUFDSDtBQUVEOzs7Ozs7Ozs7NEJBTVEsTyxFQUFTLE8sRUFBUztBQUN0QixVQUFNLFFBQVEsR0FBRyxPQUFPLElBQUksSUFBWCxHQUFrQixLQUFLLFNBQUwsQ0FBZSxXQUFmLEVBQWxCLEdBQWlELEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsT0FBckIsQ0FBbEU7QUFDQSxhQUFPLFFBQVEsQ0FBQyxJQUFULENBQWMsT0FBZCxDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OztpQ0FPYSxJLEVBQU0sUyxFQUFXLFMsRUFBVztBQUNyQyxhQUFPLElBQUksQ0FBQyxPQUFMLENBQWEsSUFBSSxDQUFDLFlBQUwsQ0FBa0IsU0FBbEIsRUFBNkIsU0FBN0IsQ0FBYixDQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzsrQkFPVyxJLEVBQU0sSSxFQUFNLEksRUFBTTtBQUN6QixhQUFPLElBQUksQ0FBQyxZQUFMLENBQWtCLElBQWxCLEVBQXdCLElBQXhCLENBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7Z0NBTVksSyxFQUFPLE0sRUFBUTtBQUN2QixVQUFJLE1BQU0sS0FBSyxTQUFmLEVBQ0ksT0FBTyxLQUFLLENBQUMsTUFBTixFQUFQLENBREosS0FFSztBQUNELFFBQUEsS0FBSyxDQUFDLE1BQU4sQ0FBYSxNQUFiO0FBQ0EsZUFBTyxJQUFQO0FBQ0g7QUFDSjtBQUVEOzs7Ozs7Ozs7aUNBTWEsSyxFQUFPLE8sRUFBUztBQUN6QixVQUFJLE9BQU8sS0FBSyxTQUFoQixFQUEyQjtBQUN2QixRQUFBLEtBQUssQ0FBQyxPQUFOLENBQWMsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxPQUFaLEVBQXFCLElBQXJCLENBQWQ7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BR087QUFDSCxlQUFPLEtBQUssQ0FBQyxPQUFOLEVBQVA7QUFDSDtBQUNKO0FBRUQ7Ozs7Ozs7Ozs2QkFNUyxLLEVBQU8sUyxFQUFXO0FBQ3ZCLFVBQUksU0FBUyxJQUFJLElBQWpCLEVBQ0ksU0FBUyxHQUFHLElBQVo7QUFDSixhQUFPLEtBQUssQ0FBQyxPQUFOLENBQWM7QUFBRSxRQUFBLGdCQUFnQixFQUFFO0FBQXBCLE9BQWQsQ0FBUDtBQUNIO0FBRUQ7Ozs7Ozs7O2dDQUtZLEUsRUFBSTtBQUNaLFdBQUssU0FBTCxDQUFlLE1BQWYsR0FBd0IsT0FBeEIsQ0FBZ0MsVUFBQSxLQUFLLEVBQUk7QUFDckMsWUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFNBQU4sRUFBakI7QUFDQSxZQUFJLFFBQUosRUFDSSxRQUFRLENBQUMsT0FBVCxDQUFpQixFQUFqQjtBQUNQLE9BSkQ7O0FBS0EsYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzhCQU1VLEksRUFBTSxHLEVBQUs7QUFDakIsVUFBSSxHQUFHLElBQUksSUFBWCxFQUFpQixPQUFPLElBQVA7QUFFakIsVUFBSSxHQUFHLENBQUMsTUFBSixLQUFlLFNBQW5CLEVBQ0ksSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFHLENBQUMsTUFBZixFQURKLEtBRUssSUFBSSxHQUFHLENBQUMsUUFBSixHQUFlLENBQW5CLEVBQ0QsSUFBSSxDQUFDLFFBQUwsR0FBZ0IsR0FBRyxDQUFDLFFBQXBCO0FBRUosYUFBTyxJQUFQO0FBQ0g7QUFFRDs7Ozs7Ozs7OzZCQU1TLEksRUFBTSxHLEVBQUs7QUFDaEIsVUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQUwsRUFBWjtBQUFBLFVBQ0ksR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFMLEVBRFY7QUFHQSxVQUFJLEtBQUssU0FBTCxDQUFlLEdBQWYsTUFBd0IsU0FBNUIsRUFDSSxJQUFJLENBQUMsR0FBTCxHQUFXLE1BQVgsQ0FBa0IsS0FBSyxTQUFMLENBQWUsR0FBZixJQUFzQixHQUFHLENBQUMsR0FBSixHQUFVLE1BQVYsRUFBeEM7QUFFSixVQUFJLEtBQUssU0FBTCxDQUFlLEdBQWYsTUFBd0IsU0FBNUIsRUFDSSxJQUFJLENBQUMsTUFBTCxHQUFjLEtBQWQsQ0FBb0IsS0FBSyxTQUFMLENBQWUsR0FBZixJQUFzQixHQUFHLENBQUMsTUFBSixHQUFhLEtBQWIsRUFBMUM7QUFFSixhQUFPLElBQVA7QUFDSDs7Ozs7O0FBR0wsTUFBTSxDQUFDLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuY29uc3QgZGVmYXVsdE9wdHMgPSB7XG4gICAgdGVtcGxhdGVSZWdFeHA6IC9cXHtcXHsoW159XSopXFx9XFx9LyxcbiAgICBmaWVsZFNwbGl0dGVyOiBcInxcIixcbiAgICBqb2luVGV4dDogXCIsXCIsXG4gICAgbWVyZ2VDZWxsczogdHJ1ZSxcbiAgICBmb2xsb3dGb3JtdWxhZTogZmFsc2UsXG4gICAgY2FsbGJhY2tzTWFwOiB7XG4gICAgICAgIFwiXCI6IGRhdGEgPT4gXy5rZXlzKGRhdGEpXG4gICAgfVxufTtcblxuY29uc3QgcmVmUmVnRXhwID0gLygnPyhbXiFdKik/Jz8hKT8oW0EtWl0rXFxkKykoOihbQS1aXStcXGQrKSk/LztcblxuLyoqXG4gKiBEYXRhIGZpbGwgZW5naW5lLCB0YWtpbmcgYW4gaW5zdGFuY2Ugb2YgRXhjZWwgc2hlZXQgYWNjZXNzb3IgYW5kIGEgSlNPTiBvYmplY3QgYXMgZGF0YSwgYW5kIGZpbGxpbmcgdGhlIHZhbHVlcyBmcm9tIHRoZSBsYXR0ZXIgaW50byB0aGUgZm9ybWVyLlxuICovXG5jbGFzcyBYbHN4RGF0YUZpbGwge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeERhdGFGaWxsIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYWNjZXNzb3IgQW4gaW5zdGFuY2Ugb2YgWExTWCBzcHJlYWRzaGVldCBhY2Nlc3NpbmcgY2xhc3MuXG4gICAgICogQHBhcmFtIHt7fX0gb3B0cyBPcHRpb25zIHRvIGJlIHVzZWQgZHVyaW5nIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IG9wdHMudGVtcGxhdGVSZWdFeHAgVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB1c2VkIGZvciB0ZW1wbGF0ZSByZWNvZ25pemluZy4gXG4gICAgICogRGVmYXVsdCBpcyBgL1xce1xceyhbXn1dKilcXH1cXH0vYCwgaS5lLiBNdXN0YWNoZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5maWVsZFNwbGl0dGVyIFRoZSBzdHJpbmcgdG8gYmUgZXhwZWN0ZWQgYXMgdGVtcGxhdGUgZmllbGQgc3BsaXR0ZXIuIERlZmF1bHQgaXMgYHxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmpvaW5UZXh0IFRoZSBzdHJpbmcgdG8gYmUgdXNlZCB3aGVuIHRoZSBleHRyYWN0ZWQgdmFsdWUgZm9yIGEgc2luZ2xlIGNlbGwgaXMgYW4gYXJyYXksIFxuICAgICAqIGFuZCBpdCBuZWVkcyB0byBiZSBqb2luZWQuIERlZmF1bHQgaXMgYCxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGJvb2xlYW59IG9wdHMubWVyZ2VDZWxscyBXaGV0aGVyIHRvIG1lcmdlIHRoZSBoaWdoZXIgZGltZW5zaW9uIGNlbGxzIGluIHRoZSBvdXRwdXQuIERlZmF1bHQgaXMgdHJ1ZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdHMuZm9sbG93Rm9ybXVsYWUgSWYgYSB0ZW1wbGF0ZSBpcyBsb2NhdGVkIGFzIGEgcmVzdWx0IG9mIGEgZm9ybXVsYSwgd2hldGhlciB0byBzdGlsbCBwcm9jZXNzIGl0LlxuICAgICAqIERlZmF1bHQgaXMgZmFsc2UuXG4gICAgICogQHBhcmFtIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBvcHRzLmNhbGxiYWNrc01hcCBBIG1hcCBvZiBoYW5kbGVycyB0byBiZSB1c2VkIGZvciBkYXRhIGFuZCB2YWx1ZSBleHRyYWN0aW9uLlxuICAgICAqIFRoZXJlIGlzIG9uZSBkZWZhdWx0IC0gdGhlIGVtcHR5IG9uZSwgZm9yIG9iamVjdCBrZXkgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ldyBvcHRpb25zIHRvIGJlIHVzZWQuIFxuICAgICAqIEBzZWUge0Bjb25zdHJ1Y3Rvcn0uXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbHx7fX0gVGhlIHJlcXVpcmVkIG9wdGlvbnMgKGluIGdldHRlciBtb2RlKSBvciBYbHN4RGF0YUZpbGwgKGluIHNldHRlciBtb2RlKSBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgICAgIGlmIChuZXdPcHRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMuX29wdHMsIG5ld09wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHdob2xlIGRhdGEgcG9wdWxhdGlvbiBtZWNoYW5pc20uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSB0byBiZSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGZpbGxEYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YUZpbGxzID0ge307XG5cdFxuICAgICAgICAvLyBCdWlsZCB0aGUgZGVwZW5kZW5jeSBjb25uZWN0aW9ucyBiZXR3ZWVuIHRlbXBsYXRlcy5cbiAgICAgICAgdGhpcy5jb2xsZWN0VGVtcGxhdGVzKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFGaWxsID0geyAgXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLCBcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzOiBbXSxcbiAgICAgICAgICAgICAgICBmb3JtdWxhczogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZkZpbGwgPSBkYXRhRmlsbHNbdGVtcGxhdGUucmVmZXJlbmNlXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXJlZkZpbGwpIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSByZWZlcmVuY2UgJyR7dGVtcGxhdGUucmVmZXJlbmNlfSchYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLmZvcm11bGEpIFxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmZvcm11bGFzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgIFxuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFGaWxsc1t0aGlzLl9hY2Nlc3MuY2VsbFJlZih0ZW1wbGF0ZS5jZWxsKV0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsbC5wcm9jZXNzZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZWxzZSBpZiAoZmlsbC50ZW1wbGF0ZS5mb3JtdWxhKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXJlZmVyZW5jaW5nIGZvcm11bGEgZm91bmQgJyR7ZmlsbC5leHRyYWN0b3J9Jy4gVXNlIGEgbm9uLXRlbXBsYXRlZCBvbmUhYCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbGwoZmlsbCwgZGF0YSwgZmlsbC50ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBwcm92aWRlZCBoYW5kbGVyIGZyb20gdGhlIG1hcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGFuZGxlck5hbWUgVGhlIG5hbWUgb2YgdGhlIGhhbmRsZXIuXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgaGFuZGxlciBmdW5jdGlvbiBpdHNlbGYuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldEhhbmRsZXIoaGFuZGxlck5hbWUpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlckZuID0gdGhpcy5fb3B0cy5jYWxsYmFja3NNYXBbaGFuZGxlck5hbWVdO1xuXG4gICAgICAgIGlmICghaGFuZGxlckZuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgY2Fubm90IGJlIGZvdW5kIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaGFuZGxlckZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgaXMgbm90IGEgZnVuY3Rpb24hYCk7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlckZuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpIHtcbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RQYXJ0cyA9IGV4dHJhY3Rvci5zcGxpdChcIjpcIiksXG4gICAgICAgICAgICBoYW5kbGVyTmFtZSA9IGV4dHJhY3RQYXJ0c1sxXTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dHJhY3RQYXJ0c1swXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiB0aGlzLmdldEhhbmRsZXIoaGFuZGxlck5hbWUpXG4gICAgICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIHN0eWxlIHBhcnQgb2YgdGhlIHRlbXBsYXRlIG9udG8gYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgZGVzdGluYXRpb24gY2VsbCB0byBhcHBseSBzdHlsaW5nIHRvLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgY2h1bmsgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gYmUgdXNlZCBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtEYXRhRmlsbGVyfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gdGVtcGxhdGUuc3R5bGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY2VsbFN0eWxlKGNlbGwsIHBhaXIubmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgY29udGVudHMgb2YgdGhlIGNlbGwgaW50byBhIHZhbGlkIHRlbXBsYXRlIGluZm8uXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIGNvbnRhaW5pbmcgdGhlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBwYXJzZWQgdGVtcGxhdGUuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGJ1aWxkcyB0ZW1wbGF0ZSBpbmZvLCB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBzdXBwbGllZCBvcHRpb25zLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwpO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZU1hdGNoID0gdmFsdWUubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIGlmICghcmVNYXRjaCB8fCAhdGhpcy5fb3B0cy5mb2xsb3dGb3JtdWxhZSAmJiB0aGlzLl9hY2Nlc3MuY2VsbFR5cGUoY2VsbCkgPT09ICdmb3JtdWxhJykgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpLFxuICAgICAgICAgICAgZXh0cmFjdG9yID0gcGFydHNbMl0gfHwgXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSBcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGVub3VnaCBjb21wb25lbnRzIG9mIHRoZSB0ZW1wbGF0ZSAnJHtyZU1hdGNoWzBdfSdgKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVmZXJlbmNlOiB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pLFxuICAgICAgICAgICAgaXRlcmF0b3JzOiBwYXJ0c1sxXS5zcGxpdCgveHxcXCovKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGV4dHJhY3RvcjogZXh0cmFjdG9yLFxuICAgICAgICAgICAgZm9ybXVsYTogZXh0cmFjdG9yLnN0YXJ0c1dpdGgoXCI9XCIpLFxuICAgICAgICAgICAgY2VsbDogY2VsbCxcbiAgICAgICAgICAgIGNlbGxTaXplOiB0aGlzLl9hY2Nlc3MuY2VsbFNpemUoY2VsbCksXG4gICAgICAgICAgICBwYWRkaW5nOiAocGFydHNbM10gfHwgXCJcIikuc3BsaXQoLzp8LHx4fFxcKi8pLm1hcCh2ID0+IHBhcnNlSW50KHYpIHx8IDApLFxuICAgICAgICAgICAgc3R5bGVzOiAhc3R5bGVzID8gbnVsbCA6IF8ubWFwKHN0eWxlcywgcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFpciA9IF8udHJpbShzKS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXy50cmltKHBhaXJbMF0pLCBleHRyYWN0b3I6IF8udHJpbShwYWlyWzFdKSB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgd2hvbGUgd29ya2Jvb2sgZm9yIHRlbXBsYXRlIHBhdHRlcm4gYW5kIGNvbnN0cnVjdHMgdGhlIHRlbXBsYXRlcyBmb3IgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBvbiBlYWNoIHRlbXBsYXRlZCwgYWZ0ZXIgdGhleSBhcmUgc29ydGVkLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZW1wbGF0ZXMgY29sbGVjdGVkIGFyZSBzb3J0ZWQsIGJhc2VkIG9uIHRoZSBpbnRyYS10ZW1wbGF0ZSByZWZlcmVuY2UgLSBpZiBvbmUgdGVtcGxhdGVcbiAgICAgKiBpcyByZWZlcnJpbmcgYW5vdGhlciBvbmUsIGl0J2xsIGFwcGVhciBfbGF0ZXJfIGluIHRoZSByZXR1cm5lZCBhcnJheSwgdGhhbiB0aGUgcmVmZXJyZWQgdGVtcGxhdGUuXG4gICAgICogVGhpcyBpcyB0aGUgb3JkZXIgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGludm9rZWQgb24uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYWxsVGVtcGxhdGVzXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYi5jZWxsKSA+IC0xIFxuICAgICAgICAgICAgICAgID8gMSBcbiAgICAgICAgICAgICAgICA6IGIucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGEuY2VsbCkgPiAtMSA/IC0xIDogMClcbiAgICAgICAgICAgIC5mb3JFYWNoKGNiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyB0aGUgdmFsdWUocykgZnJvbSB0aGUgcHJvdmlkZWQgZGF0YSBgcm9vdGAgdG8gYmUgc2V0IGluIHRoZSBwcm92aWRlZCBgY2VsbGAuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIGV4dHJhY3RlZCB2YWx1ZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBleHRyYWN0aW9uIHN0cmluZyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuIFVzdWFsbHkgYSBKU09OIHBhdGggd2l0aGluIHRoZSBkYXRhIGByb290YC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSByZWZlcmVuY2UgY2VsbCwgaWYgc3VjaCBleGlzdHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudW1iZXJ8RGF0ZXxBcnJheXxBcnJheS48QXJyYXkuPCo+Pn0gVGhlIHZhbHVlIHRvIGJlIHVzZWQuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGlzIHVzZWQgZXZlbiB3aGVuIGEgd2hvbGUgLSBwb3NzaWJseSByZWN0YW5ndWxhciAtIHJhbmdlIGlzIGFib3V0IHRvIGJlIHNldCwgc28gaXQgY2FuXG4gICAgICogcmV0dXJuIGFuIGFycmF5IG9mIGFycmF5cy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdFZhbHVlcyhyb290LCBleHRyYWN0b3IsIGNlbGwpIHtcbiAgICAgICAgY29uc3QgeyBwYXRoLCBoYW5kbGVyIH0gPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcik7XG5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJvb3QpKVxuICAgICAgICAgICAgcm9vdCA9IF8uZ2V0KHJvb3QsIHBhdGgsIHJvb3QpO1xuICAgICAgICBlbHNlIGlmIChyb290LnNpemVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByb290ID0gIWV4dHJhY3RvciA/IHJvb3QgOiBfLm1hcChyb290LCBlbnRyeSA9PiB0aGlzLmV4dHJhY3RWYWx1ZXMoZW50cnksIGV4dHJhY3RvciwgY2VsbCkpO1xuICAgICAgICBlbHNlIGlmICghaGFuZGxlcilcbiAgICAgICAgICAgIHJldHVybiByb290LmpvaW4odGhpcy5fb3B0cy5qb2luVGV4dCB8fCBcIixcIik7XG5cbiAgICAgICAgcmV0dXJuICFoYW5kbGVyID8gcm9vdCA6IGhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCByb290LCBjZWxsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBhbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGRhdGEgZm9yIHRoZSBnaXZlbiBmaWxsLCBiYXNlZCBvbiB0aGUgZ2l2ZW5cbiAgICAgKiByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBtYWluIHJlZmVyZW5jZSBvYmplY3QgdG8gYXBwbHkgaXRlcmF0b3JzIHRvLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGl0ZXJhdG9ycyBMaXN0IG9mIGl0ZXJhdG9ycyAtIHN0cmluZyBKU09OIHBhdGhzIGluc2lkZSB0aGUgcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCBUaGUgaW5kZXggaW4gdGhlIGl0ZXJhdG9ycyBhcnJheSB0byB3b3JrIG9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxBcnJheS48QXJyYXk+fSBBbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGV4dHJhY3RlZCBkYXRhLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0RGF0YShyb290LCBpdGVyYXRvcnMsIGlkeCkge1xuICAgICAgICBsZXQgaXRlciA9IGl0ZXJhdG9yc1tpZHhdLFxuICAgICAgICAgICAgc2l6ZXMgPSBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSBmYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuXG4gICAgICAgIGlmIChpdGVyID09ICcxJykge1xuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBpdGVyID0gaXRlcmF0b3JzWysraWR4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXRlcikgcmV0dXJuIHJvb3Q7XG5cbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IHBhcnNlZEl0ZXIgPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGl0ZXIpO1xuXG4gICAgICAgIGRhdGEgPSBfLmdldChyb290LCBwYXJzZWRJdGVyLnBhdGgsIHJvb3QpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRJdGVyLmhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICBkYXRhID0gcGFyc2VkSXRlci5oYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgZGF0YSk7XG5cbiAgICAgICAgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcztcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgLmNlbGxWYWx1ZShjZWxsLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpXG4gICAgICAgICAgICAgICAgLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0ZW1wbGF0ZS5jZWxsU2l6ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgc2l6ZSBhbmQgZGF0YS5cbiAgICAgICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gWzEsIC1lbnRyeVNpemVbMF1dO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBlbnRyeVNpemUuY29uY2F0KFsxXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfLmNodW5rKHZhbHVlLCAxKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gXy5jaHVuayhkYXRhLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKS5mb3JFYWNoKChjZWxsLCByaSwgY2kpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgLmNlbGxWYWx1ZShjZWxsLCB2YWx1ZVtyaV1bY2ldKVxuICAgICAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpXG4gICAgICAgICAgICAgICAgICAgIC5jb3B5U2l6ZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGFbcmldW2NpXSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBEZWFsIHdpdGggbW9yZSB0aGFuIDMgZGltZW5zaW9ucyBjYXNlLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZXMgZXh0cmFjdGVkIHdpdGggJyR7dGVtcGxhdGUuZXh0cmFjdG9yfSBhcmUgbW9yZSB0aGFuIDIgZGltZW5zaW9uISdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSB1c2VkIGZvciBkYXRhIGV4dHJhY3Rpb24uXG4gICAgICogQHBhcmFtIHtDZWxsfSBtYWluQ2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgZGF0YSBwbGFjZW1lbnQgcHJvY2VkdXJlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHNpemUgb2YgdGhlIGRhdGEgcHV0IGluIFtyb3csIGNvbF0gZm9ybWF0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXTtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcm93T2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMF0gPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyb3dPZmZzZXQgPiAxIHx8IGNvbE9mZnNldCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShuZXh0Q2VsbCwgTWF0aC5tYXgocm93T2Zmc2V0IC0gMSwgMCksIE1hdGgubWF4KGNvbE9mZnNldCAtIDEsIDApKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSB0cnVlIHx8IHRoaXMuX29wdHMubWVyZ2VDZWxsID09PSAnYm90aCdcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IHJvd09mZnNldCA+IDEgJiYgdGhpcy5fb3B0cy5tZXJnZUNlbGxzID09PSAndmVydGljYWwnIFxuICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29sT2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09ICdob3Jpem9udGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5yYW5nZU1lcmdlZChybmcsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJuZy5mb3JFYWNoKGNlbGwgPT4gdGhpcy5fYWNjZXNzLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGaW5hbGx5LCBjYWxjdWxhdGUgdGhlIG5leHQgY2VsbC5cbiAgICAgICAgICAgICAgICBuZXh0Q2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCByb3dPZmZzZXQgKyAodGVtcGxhdGUucGFkZGluZ1swXSB8fCAwKSwgY29sT2Zmc2V0ICsgKHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMCkpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5mb3JFYWNoKGFGaWxsLmZvcm11bGFzLCBmID0+IHRoaXMuYXBwbHlGb3JtdWxhKGYsIGVudHJ5U2l6ZSwgbWFpbkNlbGwpKTtcblxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBmb3JtdWxhIGJlIHNoaWZ0aW5nIGFsbCB0aGUgZml4ZWQgb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNoaWZ0ZWQuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gb2Zmc2V0IFRoZSBvZmZzZXQgb2YgdGhlIHJlZmVyZW5jZWQgdGVtcGxhdGUgdG8gdGhlIGZvcm11bGEgb25lLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IHNpemUgVGhlIHNpemUgb2YgdGhlIHJhbmdlcyBhcyB0aGV5IHNob3VsZCBiZS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcHJvY2Vzc2VkIHRleHQuXG4gICAgICovXG4gICAgc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgc2l6ZSkge1xuICAgICAgICBsZXQgbmV3Rm9ybXVsYSA9ICcnO1xuXG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZm9ybXVsYS5tYXRjaChyZWZSZWdFeHApO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCkgYnJlYWs7XG5cbiAgICAgICAgICAgIGxldCBmcm9tID0gdGhpcy5fYWNjZXNzLmdldENlbGwobWF0Y2hbM10sIG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBuZXdSZWYgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob2Zmc2V0WzBdID4gMCAmJiBvZmZzZXRbMV0gPiAwKVxuICAgICAgICAgICAgICAgIGZyb20gPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChmcm9tLCBvZmZzZXRbMF0sIG9mZnNldFsxXSk7XG5cbiAgICAgICAgICAgIG5ld1JlZiA9ICFtYXRjaFs1XVxuICAgICAgICAgICAgICAgID8gdGhpcy5fYWNjZXNzLmNlbGxSZWYoZnJvbSwgISFtYXRjaFsyXSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuX2FjY2Vzcy5yYW5nZVJlZih0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGZyb20sIHNpemVbMF0sIHNpemVbMV0pLCAhIW1hdGNoWzJdKTtcblxuICAgICAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhLnN1YnN0cigwLCBtYXRjaC5pbmRleCkgKyBuZXdSZWY7XG4gICAgICAgICAgICBmb3JtdWxhID0gZm9ybXVsYS5zdWJzdHIobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhO1xuICAgICAgICByZXR1cm4gbmV3Rm9ybXVsYTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZm9ybXVsYSBpbiB0aGUgc2hlZXQsIGkuZS4gY2hhbmdpbmcgaXQgdG8gbWF0Y2ggdGhlIFxuICAgICAqIHNpemVzIG9mIHRoZSByZWZlcmVuY2VzIHRlbXBsYXRlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXI+fSBlbnRyeVNpemUgVGhlIGZpbGwtdG8tc2l6ZSBtYXAsIGFzIGNvbnN0cnVjdGVkIHNvIGZhclxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBwdXQvc3RhcnQgdGhpcyBmb3JtdWxhIGludG9cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZvcm11bGEoYUZpbGwsIGVudHJ5U2l6ZSwgY2VsbCkge1xuICAgICAgICBjZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoY2VsbCwgYUZpbGwub2Zmc2V0WzBdLCBhRmlsbC5vZmZzZXRbMV0pO1xuXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICBpdGVyID0gXy50cmltKHRlbXBsYXRlLml0ZXJhdG9yc1swXSksXG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHRlbXBsYXRlLmNlbGwsIGNlbGwpO1xuICAgICAgICAgICAgXG4gICAgICAgIGxldCBmb3JtdWxhID0gdGVtcGxhdGUuZXh0cmFjdG9yLCBcbiAgICAgICAgICAgIHJuZztcbiAgICAgICAgICAgIFxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwsIG51bGwpO1xuXG4gICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAyICYmIGVudHJ5U2l6ZVsxXSA8IDIgfHwgaXRlciA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCAwXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZXIgPT09ICdjb2xzJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgMCwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ3Jvd3MnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbMCwgZW50cnlTaXplWzFdIC0gMV0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCAwKTtcbiAgICAgICAgfSBlbHNlIHsgLy8gaS5lLiAnbm9uZSdcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFtlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxXSk7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY2VsbEZvcm11bGEoY2VsbCwgZm9ybXVsYSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hY2Nlc3MucmFuZ2VGb3JtdWxhKHJuZywgZm9ybXVsYSk7XG4gICAgfVxufVxuXG4vKipcbiAqIFRoZSBidWlsdC1pbiBhY2Nlc3NvciBiYXNlZCBvbiB4bHN4LXBvcHVsYXRlIG5wbSBtb2R1bGVcbiAqIEB0eXBlIHtYbHN4UG9wdWxhdGVBY2Nlc3N9XG4gKi9cblhsc3hEYXRhRmlsbC5YbHN4UG9wdWxhdGVBY2Nlc3MgPSByZXF1aXJlKCcuL1hsc3hQb3B1bGF0ZUFjY2VzcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hEYXRhRmlsbDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8vIGNvbnN0IGFsbFN0eWxlcyA9IFtcbi8vICAgICBcImJvbGRcIiwgXG4vLyAgICAgXCJpdGFsaWNcIiwgXG4vLyAgICAgXCJ1bmRlcmxpbmVcIiwgXG4vLyAgICAgXCJzdHJpa2V0aHJvdWdoXCIsIFxuLy8gICAgIFwic3Vic2NyaXB0XCIsIFxuLy8gICAgIFwic3VwZXJzY3JpcHRcIiwgXG4vLyAgICAgXCJmb250U2l6ZVwiLCBcbi8vICAgICBcImZvbnRGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250R2VuZXJpY0ZhbWlseVwiLCBcbi8vICAgICBcImZvbnRTY2hlbWVcIiwgXG4vLyAgICAgXCJmb250Q29sb3JcIiwgXG4vLyAgICAgXCJob3Jpem9udGFsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwianVzdGlmeUxhc3RMaW5lXCIsIFxuLy8gICAgIFwiaW5kZW50XCIsIFxuLy8gICAgIFwidmVydGljYWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJ3cmFwVGV4dFwiLCBcbi8vICAgICBcInNocmlua1RvRml0XCIsIFxuLy8gICAgIFwidGV4dERpcmVjdGlvblwiLCBcbi8vICAgICBcInRleHRSb3RhdGlvblwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENvdW50ZXJjbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0VXBcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0RG93blwiLCBcbi8vICAgICBcInZlcnRpY2FsVGV4dFwiLCBcbi8vICAgICBcImZpbGxcIiwgXG4vLyAgICAgXCJib3JkZXJcIiwgXG4vLyAgICAgXCJib3JkZXJDb2xvclwiLCBcbi8vICAgICBcImJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclwiLCBcInJpZ2h0Qm9yZGVyXCIsIFwidG9wQm9yZGVyXCIsIFwiYm90dG9tQm9yZGVyXCIsIFwiZGlhZ29uYWxCb3JkZXJcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyQ29sb3JcIiwgXCJyaWdodEJvcmRlckNvbG9yXCIsIFwidG9wQm9yZGVyQ29sb3JcIiwgXCJib3R0b21Cb3JkZXJDb2xvclwiLCBcImRpYWdvbmFsQm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyU3R5bGVcIiwgXCJyaWdodEJvcmRlclN0eWxlXCIsIFwidG9wQm9yZGVyU3R5bGVcIiwgXCJib3R0b21Cb3JkZXJTdHlsZVwiLCBcImRpYWdvbmFsQm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJkaWFnb25hbEJvcmRlckRpcmVjdGlvblwiLCBcbi8vICAgICBcIm51bWJlckZvcm1hdFwiXG4vLyBdO1xuXG5sZXQgX1JpY2hUZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBgeHNseC1wb3B1bGF0ZWAgbGlicmFyeSBiYXNlZCBhY2Nlc3NvciB0byBhIGdpdmVuIEV4Y2VsIHdvcmtib29rLiBBbGwgdGhlc2UgbWV0aG9kcyBhcmUgaW50ZXJuYWxseSB1c2VkIGJ5IHtAbGluayBYbHN4RGF0YUZpbGx9LCBcbiAqIGJ1dCBjYW4gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgaW1wbGVtZW50aW5nIGN1c3RvbSBzcHJlYWRzaGVldCBhY2Nlc3NvcnMuXG4gKi9cbmNsYXNzIFhsc3hQb3B1bGF0ZUFjY2VzcyB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4U21hcnRUZW1wbGF0ZSB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtXb3JrYm9va30gd29ya2Jvb2sgLSBUaGUgd29ya2Jvb2sgdG8gYmUgYWNjZXNzZWQuXG4gICAgICogQHBhcmFtIHtYbHN4UG9wdWxhdGV9IFhsc3hQb3B1bGF0ZSAtIFRoZSBhY3R1YWwgeGxzeC1wb3B1bGF0ZSBsaWJyYXJ5IG9iamVjdC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGBYbHN4UG9wdWxhdGVgIG9iamVjdCBuZWVkIHRvIGJlIHBhc3NlZCBpbiBvcmRlciB0byBleHRyYWN0XG4gICAgICogY2VydGFpbiBpbmZvcm1hdGlvbiBmcm9tIGl0LCBfd2l0aG91dF8gcmVmZXJyaW5nIHRoZSB3aG9sZSBsaWJyYXJ5LCB0aHVzXG4gICAgICogYXZvaWRpbmcgbWFraW5nIHRoZSBgeGxzeC1kYXRhZmlsbGAgcGFja2FnZSBhIGRlcGVuZGVuY3kuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod29ya2Jvb2ssIFhsc3hQb3B1bGF0ZSkge1xuICAgICAgICB0aGlzLl93b3JrYm9vayA9IHdvcmtib29rO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgIFxuICAgICAgICBfUmljaFRleHQgPSBYbHN4UG9wdWxhdGUuUmljaFRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCB3b3JrYm9vayBmb3IgZGlyZWN0IFhsc3hQb3B1bGF0ZSBtYW5pcHVsYXRpb24uXG4gICAgICogQHJldHVybnMge1dvcmtib29rfSBUaGUgd29ya2Jvb2sgaW52b2x2ZWQuXG4gICAgICovXG4gICAgd29ya2Jvb2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3JrYm9vazsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cy9TZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgLSBUaGUgcmVxdWVzdGVkIHZhbHVlIGZvciBzZXR0aW5nLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGNlbGwncyBjb250ZW50cy5cbiAgICAgKiBAcmV0dXJucyB7KnxYbHN4UG9wdWxhdGVBY2Nlc3N9IEVpdGhlciB0aGUgcmVxdWVzdGVkIHZhbHVlIG9yIGNoYWluYWJsZSB0aGlzLlxuICAgICAqL1xuICAgIGNlbGxWYWx1ZShjZWxsLCB2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2VsbC52YWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHRoZVZhbHVlID0gY2VsbC52YWx1ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0ID8gdGhlVmFsdWUudGV4dCgpIDogdGhlVmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0eXBlIG9mIHRoZSBjZWxsIC0gJ2Zvcm11bGEnLCAncmljaHRleHQnLCBcbiAgICAgKiAndGV4dCcsICdudW1iZXInLCAnZGF0ZScsICdoeXBlcmxpbmsnLCBvciAndW5rbm93bic7XG4gICAgICovXG4gICAgY2VsbFR5cGUoY2VsbCkge1xuICAgICAgICBpZiAoY2VsbC5mb3JtdWxhKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2Zvcm11bGEnO1xuICAgICAgICBlbHNlIGlmIChjZWxsLmh5cGVybGluaygpKVxuICAgICAgICAgICAgcmV0dXJuICdoeXBlcmxpbmsnO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dClcbiAgICAgICAgICAgIHJldHVybiAncmljaHRleHQnO1xuICAgICAgICBlbHNlIGlmICh0aGVWYWx1ZSBpbnN0YW5jZW9mIERhdGUpXG4gICAgICAgICAgICByZXR1cm4gJ2RhdGUnO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGVWYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmb3JtdWxhIGZyb20gdGhlIGNlbGwgb3IgbnVsbCwgaWYgdGhlcmUgaXNuJ3QgYW55XG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm11bGEgLSB0aGUgdGV4dCBvZiB0aGUgZm9ybXVsYSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm11bGEgaW5zaWRlIHRoZSBjZWxsIG9yIHRoaXMgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNlbGxGb3JtdWxhKGNlbGwsIGZvcm11bGEpIHtcbiAgICAgICAgaWYgKGZvcm11bGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2VsbC5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiBjZWxsLmZvcm11bGEoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZWFzdXJlcyB0aGUgZGlzdGFuY2UsIGFzIGEgdmVjdG9yIGJldHdlZW4gdHdvIGdpdmVuIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZnJvbSBUaGUgZmlyc3QgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHRvIFRoZSBzZWNvbmQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBjZWxscy5cbiAgICAgKi9cbiAgICBjZWxsRGlzdGFuY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRvLnJvd051bWJlcigpIC0gZnJvbS5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIHRvLmNvbHVtbk51bWJlcigpIC0gZnJvbS5jb2x1bW5OdW1iZXIoKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgdGhlIHNpemUgb2YgY2VsbCwgdGFraW5nIGludG8gYWNjb3VudCBpZiBpdCBpcyBwYXJ0IG9mIGEgbWVyZ2VkIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBvY2N1cGllZCBzaXplLlxuICAgICAqL1xuICAgIGNlbGxTaXplKGNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbEFkZHIgPSBjZWxsLmFkZHJlc3MoKTtcbiAgICAgICAgbGV0IHRoZVNpemUgPSBbMSwgMV07XG4gICAgXG4gICAgICAgIF8uZm9yRWFjaChjZWxsLnNoZWV0KCkuX21lcmdlQ2VsbHMsIHJhbmdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQWRkciA9IHJhbmdlLmF0dHJpYnV0ZXMucmVmLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChyYW5nZUFkZHJbMF0gPT0gY2VsbEFkZHIpIHtcbiAgICAgICAgICAgICAgICB0aGVTaXplID0gdGhpcy5jZWxsRGlzdGFuY2UoY2VsbCwgY2VsbC5zaGVldCgpLmNlbGwocmFuZ2VBZGRyWzFdKSk7XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzBdO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhlU2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmFtZWQgc3R5bGUgb2YgYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgc3R5bGUgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIGZvciB0aGlzIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjZWxsU3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNlbGwuc3R5bGUobmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY2VsbC5zdHlsZShuYW1lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2VsbC5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgcmVmZXJlbmNlIHN0cmluZyBmb3IgYSBjZWxsIGlkZW50aWZpZWQgYnkgQHBhcmFtIGFkciwgZnJvbSB0aGUgQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgY2VsbCB0aGF0IGlzIGEgYmFzZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZHIgVGhlIGFkZHJlc3Mgb2YgdGhlIHRhcmdldCBjZWxsLCBhcyBtZW50aW9uZWQgaW4gQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHRoZSBzaGVldCBuYW1lIGluIHRoZSByZWZlcmVuY2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSByZWZlcmVuY2Ugc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0YXJnZXQgY2VsbCB1bmlxdWVseS5cbiAgICAgKi9cbiAgICBidWlsZFJlZihjZWxsLCBhZHIsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYSBnaXZlbiBjZWxsIGZyb20gYSBnaXZlbiBzaGVldCAob3IgYW4gYWN0aXZlIG9uZSkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBhZGRyZXNzIFRoZSBjZWxsIGFkcmVzcyB0byBiZSB1c2VkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8aWR4fSBzaGVldElkIFRoZSBpZC9uYW1lIG9mIHRoZSBzaGVldCB0byByZXRyaWV2ZSB0aGUgY2VsbCBmcm9tLiBEZWZhdWx0cyB0byBhbiBhY3RpdmUgb25lLlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBBIHJlZmVyZW5jZSB0byB0aGUgcmVxdWlyZWQgY2VsbC5cbiAgICAgKi9cbiAgICBnZXRDZWxsKGFkZHJlc3MsIHNoZWV0SWQpIHtcbiAgICAgICAgY29uc3QgdGhlU2hlZXQgPSBzaGVldElkID09IG51bGwgPyB0aGlzLl93b3JrYm9vay5hY3RpdmVTaGVldCgpIDogdGhpcy5fd29ya2Jvb2suc2hlZXQoc2hlZXRJZCk7XG4gICAgICAgIHJldHVybiB0aGVTaGVldC5jZWxsKGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYW5kIHJldHVybnMgdGhlIHJhbmdlIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIGNlbGwgYW5kIHNwYXduaW5nIGdpdmVuIHJvd3MgYW5kIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHJvd09mZnNldCBOdW1iZXIgb2Ygcm93cyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSByb3cuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvbE9mZnNldCBOdW1iZXIgb2YgY29sdW1ucyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSBjb2x1bW4uXG4gICAgICogQHJldHVybnMge1JhbmdlfSBUaGUgY29uc3RydWN0ZWQgcmFuZ2UuXG4gICAgICovXG4gICAgZ2V0Q2VsbFJhbmdlKGNlbGwsIHJvd09mZnNldCwgY29sT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJhbmdlVG8oY2VsbC5yZWxhdGl2ZUNlbGwocm93T2Zmc2V0LCBjb2xPZmZzZXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBjZWxsIGF0IGEgY2VydGFpbiBvZmZzZXQgZnJvbSBhIGdpdmVuIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHJlZmVyZW5jZSBjZWxsIHRvIG1ha2UgdGhlIG9mZnNldCBmcm9tLlxuICAgICAqIEBwYXJhbSB7aW50fSByb3dzIE51bWJlciBvZiByb3dzIHRvIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge2ludH0gY29scyBOdW1iZXIgb2YgY29sdW1ucyB0byBvZmZzZXQuXG4gICAgICogQHJldHVybnMge0NlbGx9IFRoZSByZXN1bHRpbmcgY2VsbC5cbiAgICAgKi9cbiAgICBvZmZzZXRDZWxsKGNlbGwsIHJvd3MsIGNvbHMpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmVsYXRpdmVDZWxsKHJvd3MsIGNvbHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lcmdlIG9yIHNwbGl0IHJhbmdlIG9mIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdHVzIFRoZSBtZXJnZWQgc3RhdHVzIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICByYW5nZU1lcmdlZChyYW5nZSwgc3RhdHVzKSB7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5tZXJnZWQoKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIGZvcm11bGEgZm9yIHRoZSB3aG9sZSByYW5nZS4gSWYgaXQgY29udGFpbnMgb25seSBvbmUgLSBpdCBpcyBzZXQgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHJhbmdlRm9ybXVsYShyYW5nZSwgZm9ybXVsYSkge1xuICAgICAgICBpZiAoZm9ybXVsYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByYW5nZS5mb3JtdWxhKF8udHJpbVN0YXJ0KGZvcm11bGEsICcgPScpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHJhbmdlLmZvcm11bGEoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZ2l2ZW4gcmFuZ2UuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlIHdoaWNoIGFkZHJlc3Mgd2UncmUgaW50ZXJlc3RlZCBpbi5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgc2hlZXQgbmFtZSBpbiB0aGUgYWRkcmVzcy5cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcsIHJlcHJlc2VudGluZyB0aGUgZ2l2ZW4gcmFuZ2UuXG4gICAgICovXG4gICAgcmFuZ2VSZWYocmFuZ2UsIHdpdGhTaGVldCkge1xuICAgICAgICBpZiAod2l0aFNoZWV0ID09IG51bGwpXG4gICAgICAgICAgICB3aXRoU2hlZXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcmFuZ2UuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJdGVyYXRlIG92ZXIgYWxsIHVzZWQgY2VsbHMgb2YgdGhlIGdpdmVuIHdvcmtib29rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggYGNlbGxgIGFyZ3VtZW50IGZvciBlYWNoIHVzZWQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBmb3JBbGxDZWxscyhjYikge1xuICAgICAgICB0aGlzLl93b3JrYm9vay5zaGVldHMoKS5mb3JFYWNoKHNoZWV0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRoZVJhbmdlID0gc2hlZXQudXNlZFJhbmdlKCk7XG4gICAgICAgICAgICBpZiAodGhlUmFuZ2UpIFxuICAgICAgICAgICAgICAgIHRoZVJhbmdlLmZvckVhY2goY2IpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSBzdHlsZXMgZnJvbSBgc3JjYCBjZWxsIHRvIHRoZSBgZGVzdGAtaW5hdGlvbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IERlc3RpbmF0aW9uIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgU291cmNlIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVN0eWxlKGRlc3QsIHNyYykge1xuICAgICAgICBpZiAoc3JjID09IGRlc3QpIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChzcmMuX3N0eWxlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnN0eWxlKHNyYy5fc3R5bGUpO1xuICAgICAgICBlbHNlIGlmIChzcmMuX3N0eWxlSWQgPiAwKVxuICAgICAgICAgICAgZGVzdC5fc3R5bGVJZCA9IHNyYy5fc3R5bGVJZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZSB0aGUgY29sdW1uIGFuZCByb3cgb2YgdGhlIGRlc3RpbmF0aW9uIGNlbGwsIGlmIG5vdCBjaGFuZ2VkIGFscmVhZHkuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IFRoZSBkZXN0aW5hdGlvbiBjZWxsIHdoaWNoIHJvdyBhbmQgY29sdW1uIHRvIHJlc2l6ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBUaGUgc291cmNlICh0ZW1wbGF0ZSkgY2VsbCB0byB0YWtlIHRoZSBzaXplIGZyb20uXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVNpemUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGRlc3Qucm93TnVtYmVyKCksXG4gICAgICAgICAgICBjb2wgPSBkZXN0LmNvbHVtbk51bWJlcigpO1xuXG4gICAgICAgIGlmICh0aGlzLl9yb3dTaXplc1tyb3ddID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnJvdygpLmhlaWdodCh0aGlzLl9yb3dTaXplc1tyb3ddID0gc3JjLnJvdygpLmhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9jb2xTaXplc1tjb2xdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LmNvbHVtbigpLndpZHRoKHRoaXMuX2NvbFNpemVzW2NvbF0gPSBzcmMuY29sdW1uKCkud2lkdGgoKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hQb3B1bGF0ZUFjY2VzcztcbiJdfQ==
