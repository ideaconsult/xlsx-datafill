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
        this._access.cellValue(cell, value).copyStyle(cell, template.cell);

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
          _this6._access.cellValue(cell, value[ri][ci]).copyStyle(cell, template.cell);

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
              return _this7._access.copyStyle(cell, template.cell);
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

      this._access.cellValue(cell, null);

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBTkUsQ0FBcEI7QUFXQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsd0JBQVksUUFBWixFQUFzQixJQUF0QixFQUE0QjtBQUFBOztBQUN4QixTQUFLLEtBQUwsR0FBYSxFQUFDLENBQUMsWUFBRixDQUFlLEVBQWYsRUFBbUIsSUFBbkIsRUFBeUIsV0FBekIsQ0FBYjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssT0FBTCxHQUFlLFFBQWY7QUFDSDtBQUVEOzs7Ozs7Ozs7OzRCQU1RLE8sRUFBUztBQUNiLFVBQUksT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFFBQUEsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFLLEtBQWIsRUFBb0IsT0FBcEI7O0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FIRCxNQUlJLE9BQU8sS0FBSyxLQUFaO0FBQ1A7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFN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QWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxHQUFMLEdBQVcsTUFBWCxDQUFrQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxHQUFKLEdBQVUsTUFBVixFQUExQztBQUVKLFVBQUksS0FBSyxTQUFMLENBQWUsS0FBZixNQUEwQixTQUE5QixFQUNJLElBQUksQ0FBQyxNQUFMLEdBQWMsS0FBZCxDQUFvQixLQUFLLFNBQUwsQ0FBZSxLQUFmLElBQXdCLEdBQUcsQ0FBQyxNQUFKLEdBQWEsS0FBYixFQUE1QztBQUVKLGFBQU8sSUFBUDtBQUNIOzs7Ozs7QUFHTCxNQUFNLENBQUMsT0FBUCxHQUFpQixrQkFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICB0ZW1wbGF0ZVJlZ0V4cDogL1xce1xceyhbXn1dKilcXH1cXH0vLFxuICAgIGZpZWxkU3BsaXR0ZXI6IFwifFwiLFxuICAgIGpvaW5UZXh0OiBcIixcIixcbiAgICBtZXJnZUNlbGxzOiB0cnVlLFxuICAgIGZvbGxvd0Zvcm11bGFlOiBmYWxzZSxcbiAgICBjYWxsYmFja3NNYXA6IHtcbiAgICAgICAgXCJcIjogZGF0YSA9PiBfLmtleXMoZGF0YSlcbiAgICB9XG59O1xuXG5jb25zdCByZWZSZWdFeHAgPSAvKCc/KFteIV0qKT8nPyEpPyhbQS1aXStcXGQrKSg6KFtBLVpdK1xcZCspKT8vO1xuXG4vKipcbiAqIERhdGEgZmlsbCBlbmdpbmUsIHRha2luZyBhbiBpbnN0YW5jZSBvZiBFeGNlbCBzaGVldCBhY2Nlc3NvciBhbmQgYSBKU09OIG9iamVjdCBhcyBkYXRhLCBhbmQgZmlsbGluZyB0aGUgdmFsdWVzIGZyb20gdGhlIGxhdHRlciBpbnRvIHRoZSBmb3JtZXIuXG4gKi9cbmNsYXNzIFhsc3hEYXRhRmlsbCB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4RGF0YUZpbGwgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhY2Nlc3NvciBBbiBpbnN0YW5jZSBvZiBYTFNYIHNwcmVhZHNoZWV0IGFjY2Vzc2luZyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBvcHRzIE9wdGlvbnMgdG8gYmUgdXNlZCBkdXJpbmcgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gb3B0cy50ZW1wbGF0ZVJlZ0V4cCBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIGJlIHVzZWQgZm9yIHRlbXBsYXRlIHJlY29nbml6aW5nLiBcbiAgICAgKiBEZWZhdWx0IGlzIGAvXFx7XFx7KFtefV0qKVxcfVxcfS9gLCBpLmUuIE11c3RhY2hlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci4gRGVmYXVsdCBpcyBgfGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuam9pblRleHQgVGhlIHN0cmluZyB0byBiZSB1c2VkIHdoZW4gdGhlIGV4dHJhY3RlZCB2YWx1ZSBmb3IgYSBzaW5nbGUgY2VsbCBpcyBhbiBhcnJheSwgXG4gICAgICogYW5kIGl0IG5lZWRzIHRvIGJlIGpvaW5lZC4gRGVmYXVsdCBpcyBgLGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gb3B0cy5tZXJnZUNlbGxzIFdoZXRoZXIgdG8gbWVyZ2UgdGhlIGhpZ2hlciBkaW1lbnNpb24gY2VsbHMgaW4gdGhlIG91dHB1dC4gRGVmYXVsdCBpcyB0cnVlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0cy5mb2xsb3dGb3JtdWxhZSBJZiBhIHRlbXBsYXRlIGlzIGxvY2F0ZWQgYXMgYSByZXN1bHQgb2YgYSBmb3JtdWxhLCB3aGV0aGVyIHRvIHN0aWxsIHByb2Nlc3MgaXQuXG4gICAgICogRGVmYXVsdCBpcyBmYWxzZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgYW5kIHZhbHVlIGV4dHJhY3Rpb24uXG4gICAgICogVGhlcmUgaXMgb25lIGRlZmF1bHQgLSB0aGUgZW1wdHkgb25lLCBmb3Igb2JqZWN0IGtleSBleHRyYWN0aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFjY2Vzc29yLCBvcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHMgPSBfLmRlZmF1bHRzRGVlcCh7fSwgb3B0cywgZGVmYXVsdE9wdHMpO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9hY2Nlc3MgPSBhY2Nlc3NvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXR0ZXIvZ2V0dGVyIGZvciBYbHN4RGF0YUZpbGwncyBvcHRpb25zIGFzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uLlxuICAgICAqIEBwYXJhbSB7e318bnVsbH0gbmV3T3B0cyBJZiBzZXQgLSB0aGUgbmV3IG9wdGlvbnMgdG8gYmUgdXNlZC4gXG4gICAgICogQHNlZSB7QGNvbnN0cnVjdG9yfS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfHt9fSBUaGUgcmVxdWlyZWQgb3B0aW9ucyAoaW4gZ2V0dGVyIG1vZGUpIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0dGVyIG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3Igd2hvbGUgZGF0YSBwb3B1bGF0aW9uIG1lY2hhbmlzbS5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIHRvIGJlIGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbH0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgZmlsbERhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBkYXRhRmlsbHMgPSB7fTtcblx0XG4gICAgICAgIC8vIEJ1aWxkIHRoZSBkZXBlbmRlbmN5IGNvbm5lY3Rpb25zIGJldHdlZW4gdGVtcGxhdGVzLlxuICAgICAgICB0aGlzLmNvbGxlY3RUZW1wbGF0ZXModGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYUZpbGwgPSB7ICBcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsIFxuICAgICAgICAgICAgICAgIGRlcGVuZGVudHM6IFtdLFxuICAgICAgICAgICAgICAgIGZvcm11bGFzOiBbXSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmRmlsbCA9IGRhdGFGaWxsc1t0ZW1wbGF0ZS5yZWZlcmVuY2VdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcmVmRmlsbCkgXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSByZWZlcmVuY2UgJyR7dGVtcGxhdGUucmVmZXJlbmNlfSchYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlLmZvcm11bGEpIFxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmZvcm11bGFzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgIFxuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFGaWxsc1t0aGlzLl9hY2Nlc3MuY2VsbFJlZih0ZW1wbGF0ZS5jZWxsKV0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsbC5wcm9jZXNzZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZWxzZSBpZiAoZmlsbC50ZW1wbGF0ZS5mb3JtdWxhKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXJlZmVyZW5jaW5nIGZvcm11bGEgZm91bmQgJyR7ZmlsbC5leHRyYWN0b3J9Jy4gVXNlIGEgbm9uLXRlbXBsYXRlZCBvbmUhYCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbGwoZmlsbCwgZGF0YSwgZmlsbC50ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBwcm92aWRlZCBoYW5kbGVyIGZyb20gdGhlIG1hcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGFuZGxlck5hbWUgVGhlIG5hbWUgb2YgdGhlIGhhbmRsZXIuXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgaGFuZGxlciBmdW5jdGlvbiBpdHNlbGYuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldEhhbmRsZXIoaGFuZGxlck5hbWUpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlckZuID0gdGhpcy5fb3B0cy5jYWxsYmFja3NNYXBbaGFuZGxlck5hbWVdO1xuXG4gICAgICAgIGlmICghaGFuZGxlckZuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgY2Fubm90IGJlIGZvdW5kIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaGFuZGxlckZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgaXMgbm90IGEgZnVuY3Rpb24hYCk7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlckZuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpIHtcbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RQYXJ0cyA9IGV4dHJhY3Rvci5zcGxpdChcIjpcIiksXG4gICAgICAgICAgICBoYW5kbGVyTmFtZSA9IGV4dHJhY3RQYXJ0c1sxXTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dHJhY3RQYXJ0c1swXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiB0aGlzLmdldEhhbmRsZXIoaGFuZGxlck5hbWUpXG4gICAgICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIHN0eWxlIHBhcnQgb2YgdGhlIHRlbXBsYXRlIG9udG8gYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgZGVzdGluYXRpb24gY2VsbCB0byBhcHBseSBzdHlsaW5nIHRvLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgY2h1bmsgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gYmUgdXNlZCBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtEYXRhRmlsbGVyfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gdGVtcGxhdGUuc3R5bGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3MuY2VsbFN0eWxlKGNlbGwsIHBhaXIubmFtZSwgdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgY29udGVudHMgb2YgdGhlIGNlbGwgaW50byBhIHZhbGlkIHRlbXBsYXRlIGluZm8uXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIGNvbnRhaW5pbmcgdGhlIHRlbXBsYXRlIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7e319IFRoZSBwYXJzZWQgdGVtcGxhdGUuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGJ1aWxkcyB0ZW1wbGF0ZSBpbmZvLCB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBzdXBwbGllZCBvcHRpb25zLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwpO1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZU1hdGNoID0gdmFsdWUubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIGlmICghcmVNYXRjaCB8fCAhdGhpcy5fb3B0cy5mb2xsb3dGb3JtdWxhZSAmJiB0aGlzLl9hY2Nlc3MuY2VsbFR5cGUoY2VsbCkgPT09ICdmb3JtdWxhJykgXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpLFxuICAgICAgICAgICAgZXh0cmFjdG9yID0gcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGxSZWYgPSB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICcke3JlTWF0Y2hbMF19J2ApO1xuICAgICAgICBpZiAoISFwYXJ0c1swXSAmJiAhY2VsbFJlZilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWZlcmVuY2UgcGFzc2VkOiAnJHtwYXJ0c1swXX0nYCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZTogY2VsbFJlZixcbiAgICAgICAgICAgIGl0ZXJhdG9yczogcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBleHRyYWN0b3I6IGV4dHJhY3RvcixcbiAgICAgICAgICAgIGZvcm11bGE6IGV4dHJhY3Rvci5zdGFydHNXaXRoKFwiPVwiKSxcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFsbFRlbXBsYXRlc1xuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGEuY2VsbCkgfHwgIWEucmVmZXJlbmNlID8gLTEgOiAxKVxuICAgICAgICAgICAgLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIHJlZmVyZW5jZSBjZWxsLCBpZiBzdWNoIGV4aXN0cy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bWJlcnxEYXRlfEFycmF5fEFycmF5LjxBcnJheS48Kj4+fSBUaGUgdmFsdWUgdG8gYmUgdXNlZC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgaXMgdXNlZCBldmVuIHdoZW4gYSB3aG9sZSAtIHBvc3NpYmx5IHJlY3Rhbmd1bGFyIC0gcmFuZ2UgaXMgYWJvdXQgdG8gYmUgc2V0LCBzbyBpdCBjYW5cbiAgICAgKiByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIHJvb3QsIGNlbGwpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIGFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZGF0YSBmb3IgdGhlIGdpdmVuIGZpbGwsIGJhc2VkIG9uIHRoZSBnaXZlblxuICAgICAqIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIG1haW4gcmVmZXJlbmNlIG9iamVjdCB0byBhcHBseSBpdGVyYXRvcnMgdG8uXG4gICAgICogQHBhcmFtIHtBcnJheX0gaXRlcmF0b3JzIExpc3Qgb2YgaXRlcmF0b3JzIC0gc3RyaW5nIEpTT04gcGF0aHMgaW5zaWRlIHRoZSByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWR4IFRoZSBpbmRleCBpbiB0aGUgaXRlcmF0b3JzIGFycmF5IHRvIHdvcmsgb24uXG4gICAgICogQHJldHVybnMge0FycmF5fEFycmF5LjxBcnJheT59IEFuIGFycmF5IChwb3NzaWJseSBvZiBhcnJheXMpIHdpdGggZXh0cmFjdGVkIGRhdGEuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3REYXRhKHJvb3QsIGl0ZXJhdG9ycywgaWR4KSB7XG4gICAgICAgIGxldCBpdGVyID0gaXRlcmF0b3JzW2lkeF0sXG4gICAgICAgICAgICBzaXplcyA9IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IGZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGl0ZXIgPT0gJzEnKSB7XG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGl0ZXIgPSBpdGVyYXRvcnNbKytpZHhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpdGVyKSByZXR1cm4gcm9vdDtcblxuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgcGFyc2VkSXRlciA9IHRoaXMucGFyc2VFeHRyYWN0b3IoaXRlcik7XG5cbiAgICAgICAgZGF0YSA9IF8uZ2V0KHJvb3QsIHBhcnNlZEl0ZXIucGF0aCwgcm9vdCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlZEl0ZXIuaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIGRhdGEgPSBwYXJzZWRJdGVyLmhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCBkYXRhKTtcblxuICAgICAgICBpZiAoaWR4IDwgaXRlcmF0b3JzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBfLm1hcChkYXRhLCBpblJvb3QgPT4gdGhpcy5leHRyYWN0RGF0YShpblJvb3QsIGl0ZXJhdG9ycywgaWR4ICsgMSkpO1xuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhWzBdLnNpemVzO1xuICAgICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEpICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JylcbiAgICAgICAgICAgIGRhdGEgPSBfLnZhbHVlcyhkYXRhKTtcblxuICAgICAgICAvLyBTb21lIGRhdGEgc2FuaXR5IGNoZWNrcy5cbiAgICAgICAgaWYgKCFkYXRhKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgaXRlcmF0b3IgJyR7aXRlcn0nIGV4dHJhY3RlZCBubyBkYXRhIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIGV4dHJhY3RlZCBmcm9tIGl0ZXJhdG9yICcke2l0ZXJ9JyBpcyBuZWl0aGVyIGFuIGFycmF5LCBub3Igb2JqZWN0IWApO1xuXG4gICAgICAgIHNpemVzLnVuc2hpZnQodHJhbnNwb3NlZCA/IC1kYXRhLmxlbmd0aCA6IGRhdGEubGVuZ3RoKTtcbiAgICAgICAgZGF0YS5zaXplcyA9IHNpemVzO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdXQgdGhlIGRhdGEgdmFsdWVzIGludG8gdGhlIHByb3BlciBjZWxscywgd2l0aCBjb3JyZWN0IGV4dHJhY3RlZCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHt7fX0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgdGhlIGRhdGEgdG8gYmUgcHV0LlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgVGhlIGFjdHVhbCBkYXRhIHRvIGJlIHB1dC4gVGhlIHZhbHVlcyB3aWxsIGJlIF9leHRyYWN0ZWRfIGZyb20gaGVyZSBmaXJzdC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdGhhdCBpcyBiZWluZyBpbXBsZW1lbnRlZCB3aXRoIHRoYXQgZGF0YSBmaWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gTWF0cml4IHNpemUgdGhhdCB0aGlzIGRhdGEgaGFzIG9jY3VwaWVkIG9uIHRoZSBzaGVldCBbcm93cywgY29sc10uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHB1dFZhbHVlcyhjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBpZiAoIWNlbGwpIHRocm93IG5ldyBFcnJvcihcIkNyYXNoISBOdWxsIHJlZmVyZW5jZSBjZWxsIGluICdwdXRWYWx1ZXMoKSchXCIpO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBkYXRhLnNpemVzLFxuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgdGVtcGxhdGUuZXh0cmFjdG9yLCBjZWxsKTtcblxuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgLmNlbGxWYWx1ZShjZWxsLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0ZW1wbGF0ZS5jZWxsU2l6ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgc2l6ZSBhbmQgZGF0YS5cbiAgICAgICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gWzEsIC1lbnRyeVNpemVbMF1dO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBlbnRyeVNpemUuY29uY2F0KFsxXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfLmNodW5rKHZhbHVlLCAxKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gXy5jaHVuayhkYXRhLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKS5mb3JFYWNoKChjZWxsLCByaSwgY2kpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgLmNlbGxWYWx1ZShjZWxsLCB2YWx1ZVtyaV1bY2ldKVxuICAgICAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YVtyaV1bY2ldLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlYWwgd2l0aCBtb3JlIHRoYW4gMyBkaW1lbnNpb25zIGNhc2UuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlcyBleHRyYWN0ZWQgd2l0aCAnJHt0ZW1wbGF0ZS5leHRyYWN0b3J9IGFyZSBtb3JlIHRoYW4gMiBkaW1lbnNpb24hJ2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZmlsdGVyIG9udG8gdGhlIHNoZWV0IC0gZXh0cmFjdGluZyB0aGUgcHJvcGVyIGRhdGEsIGZvbGxvd2luZyBkZXBlbmRlbnQgZmlsbHMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RmlsbChhRmlsbCwgcm9vdCwgbWFpbkNlbGwpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHRoZURhdGEgPSB0aGlzLmV4dHJhY3REYXRhKHJvb3QsIHRlbXBsYXRlLml0ZXJhdG9ycywgMCk7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IFsxLCAxXTtcblxuICAgICAgICBpZiAoIWFGaWxsLmRlcGVuZGVudHMgfHwgIWFGaWxsLmRlcGVuZGVudHMubGVuZ3RoKVxuICAgICAgICAgICAgZW50cnlTaXplID0gdGhpcy5wdXRWYWx1ZXMobWFpbkNlbGwsIHRoZURhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV4dENlbGwgPSBtYWluQ2VsbDtcbiAgICAgICAgICAgIGNvbnN0IHNpemVNYXh4ZXIgPSAodmFsLCBpZHgpID0+IGVudHJ5U2l6ZVtpZHhdID0gTWF0aC5tYXgoZW50cnlTaXplW2lkeF0sIHZhbCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgdGhlRGF0YS5sZW5ndGg7ICsrZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluUm9vdCA9IHRoZURhdGFbZF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmID0gMDsgZiA8IGFGaWxsLmRlcGVuZGVudHMubGVuZ3RoOyArK2YpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5GaWxsID0gYUZpbGwuZGVwZW5kZW50c1tmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluQ2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCBpbkZpbGwub2Zmc2V0WzBdLCBpbkZpbGwub2Zmc2V0WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVswXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJvd09mZnNldCA+IDEgfHwgY29sT2Zmc2V0ID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKG5leHRDZWxsLCBNYXRoLm1heChyb3dPZmZzZXQgLSAxLCAwKSwgTWF0aC5tYXgoY29sT2Zmc2V0IC0gMSwgMCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09IHRydWUgfHwgdGhpcy5fb3B0cy5tZXJnZUNlbGwgPT09ICdib3RoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgcm93T2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09ICd2ZXJ0aWNhbCcgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBjb2xPZmZzZXQgPiAxICYmIHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gJ2hvcml6b250YWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnJhbmdlTWVyZ2VkKHJuZywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcm5nLmZvckVhY2goY2VsbCA9PiB0aGlzLl9hY2Nlc3MuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGaW5hbGx5LCBjYWxjdWxhdGUgdGhlIG5leHQgY2VsbC5cbiAgICAgICAgICAgICAgICBuZXh0Q2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCByb3dPZmZzZXQgKyAodGVtcGxhdGUucGFkZGluZ1swXSB8fCAwKSwgY29sT2Zmc2V0ICsgKHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMCkpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5mb3JFYWNoKGFGaWxsLmZvcm11bGFzLCBmID0+IHRoaXMuYXBwbHlGb3JtdWxhKGYsIGVudHJ5U2l6ZSwgbWFpbkNlbGwpKTtcblxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBmb3JtdWxhIGJlIHNoaWZ0aW5nIGFsbCB0aGUgZml4ZWQgb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNoaWZ0ZWQuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gb2Zmc2V0IFRoZSBvZmZzZXQgb2YgdGhlIHJlZmVyZW5jZWQgdGVtcGxhdGUgdG8gdGhlIGZvcm11bGEgb25lLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8TnVtYmVyLE51bWJlcj59IHNpemUgVGhlIHNpemUgb2YgdGhlIHJhbmdlcyBhcyB0aGV5IHNob3VsZCBiZS5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcHJvY2Vzc2VkIHRleHQuXG4gICAgICovXG4gICAgc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgc2l6ZSkge1xuICAgICAgICBsZXQgbmV3Rm9ybXVsYSA9ICcnO1xuXG4gICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZm9ybXVsYS5tYXRjaChyZWZSZWdFeHApO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCkgYnJlYWs7XG5cbiAgICAgICAgICAgIGxldCBmcm9tID0gdGhpcy5fYWNjZXNzLmdldENlbGwobWF0Y2hbM10sIG1hdGNoWzJdKSxcbiAgICAgICAgICAgICAgICBuZXdSZWYgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAob2Zmc2V0WzBdID4gMCB8fCBvZmZzZXRbMV0gPiAwKVxuICAgICAgICAgICAgICAgIGZyb20gPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChmcm9tLCBvZmZzZXRbMF0sIG9mZnNldFsxXSk7XG5cbiAgICAgICAgICAgIG5ld1JlZiA9ICFtYXRjaFs1XVxuICAgICAgICAgICAgICAgID8gdGhpcy5fYWNjZXNzLmNlbGxSZWYoZnJvbSwgISFtYXRjaFsyXSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuX2FjY2Vzcy5yYW5nZVJlZih0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGZyb20sIHNpemVbMF0sIHNpemVbMV0pLCAhIW1hdGNoWzJdKTtcblxuICAgICAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhLnN1YnN0cigwLCBtYXRjaC5pbmRleCkgKyBuZXdSZWY7XG4gICAgICAgICAgICBmb3JtdWxhID0gZm9ybXVsYS5zdWJzdHIobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3Rm9ybXVsYSArPSBmb3JtdWxhO1xuICAgICAgICByZXR1cm4gbmV3Rm9ybXVsYTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZm9ybXVsYSBpbiB0aGUgc2hlZXQsIGkuZS4gY2hhbmdpbmcgaXQgdG8gbWF0Y2ggdGhlIFxuICAgICAqIHNpemVzIG9mIHRoZSByZWZlcmVuY2VzIHRlbXBsYXRlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXI+fSBlbnRyeVNpemUgVGhlIGZpbGwtdG8tc2l6ZSBtYXAsIGFzIGNvbnN0cnVjdGVkIHNvIGZhclxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBwdXQvc3RhcnQgdGhpcyBmb3JtdWxhIGludG9cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZvcm11bGEoYUZpbGwsIGVudHJ5U2l6ZSwgY2VsbCkge1xuICAgICAgICBjZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwoY2VsbCwgYUZpbGwub2Zmc2V0WzBdLCBhRmlsbC5vZmZzZXRbMV0pO1xuXG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICBpdGVyID0gXy50cmltKHRlbXBsYXRlLml0ZXJhdG9yc1swXSksXG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHRlbXBsYXRlLmNlbGwsIGNlbGwpO1xuICAgICAgICAgICAgXG4gICAgICAgIGxldCBmb3JtdWxhID0gdGVtcGxhdGUuZXh0cmFjdG9yLCBcbiAgICAgICAgICAgIHJuZztcbiAgICAgICAgICAgIFxuICAgICAgICBhRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9hY2Nlc3MuY2VsbFZhbHVlKGNlbGwsIG51bGwpO1xuXG4gICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAyICYmIGVudHJ5U2l6ZVsxXSA8IDIgfHwgaXRlciA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbMCwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAnY29scycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFtlbnRyeVNpemVbMF0gLSAxLCAwXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIDAsIGVudHJ5U2l6ZVsxXSAtIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZXIgPT09ICdyb3dzJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIGVudHJ5U2l6ZVsxXSAtIDFdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgMCk7XG4gICAgICAgIH0gZWxzZSB7IC8vIGkuZS4gJ25vbmUnXG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMV0pO1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmNlbGxGb3JtdWxhKGNlbGwsIGZvcm11bGEpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYWNjZXNzLnJhbmdlRm9ybXVsYShybmcsIGZvcm11bGEpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaGUgYnVpbHQtaW4gYWNjZXNzb3IgYmFzZWQgb24geGxzeC1wb3B1bGF0ZSBucG0gbW9kdWxlXG4gKiBAdHlwZSB7WGxzeFBvcHVsYXRlQWNjZXNzfVxuICovXG5YbHN4RGF0YUZpbGwuWGxzeFBvcHVsYXRlQWNjZXNzID0gcmVxdWlyZSgnLi9YbHN4UG9wdWxhdGVBY2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4RGF0YUZpbGw7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vLyBjb25zdCBhbGxTdHlsZXMgPSBbXG4vLyAgICAgXCJib2xkXCIsIFxuLy8gICAgIFwiaXRhbGljXCIsIFxuLy8gICAgIFwidW5kZXJsaW5lXCIsIFxuLy8gICAgIFwic3RyaWtldGhyb3VnaFwiLCBcbi8vICAgICBcInN1YnNjcmlwdFwiLCBcbi8vICAgICBcInN1cGVyc2NyaXB0XCIsIFxuLy8gICAgIFwiZm9udFNpemVcIiwgXG4vLyAgICAgXCJmb250RmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udEdlbmVyaWNGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250U2NoZW1lXCIsIFxuLy8gICAgIFwiZm9udENvbG9yXCIsIFxuLy8gICAgIFwiaG9yaXpvbnRhbEFsaWdubWVudFwiLCBcbi8vICAgICBcImp1c3RpZnlMYXN0TGluZVwiLCBcbi8vICAgICBcImluZGVudFwiLCBcbi8vICAgICBcInZlcnRpY2FsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwid3JhcFRleHRcIiwgXG4vLyAgICAgXCJzaHJpbmtUb0ZpdFwiLCBcbi8vICAgICBcInRleHREaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJ0ZXh0Um90YXRpb25cIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDb3VudGVyY2xvY2t3aXNlXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q2xvY2t3aXNlXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dFVwXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dERvd25cIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbFRleHRcIiwgXG4vLyAgICAgXCJmaWxsXCIsIFxuLy8gICAgIFwiYm9yZGVyXCIsIFxuLy8gICAgIFwiYm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJib3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJcIiwgXCJyaWdodEJvcmRlclwiLCBcInRvcEJvcmRlclwiLCBcImJvdHRvbUJvcmRlclwiLCBcImRpYWdvbmFsQm9yZGVyXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlckNvbG9yXCIsIFwicmlnaHRCb3JkZXJDb2xvclwiLCBcInRvcEJvcmRlckNvbG9yXCIsIFwiYm90dG9tQm9yZGVyQ29sb3JcIiwgXCJkaWFnb25hbEJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclN0eWxlXCIsIFwicmlnaHRCb3JkZXJTdHlsZVwiLCBcInRvcEJvcmRlclN0eWxlXCIsIFwiYm90dG9tQm9yZGVyU3R5bGVcIiwgXCJkaWFnb25hbEJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwiZGlhZ29uYWxCb3JkZXJEaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJudW1iZXJGb3JtYXRcIlxuLy8gXTtcblxubGV0IF9SaWNoVGV4dCA9IG51bGw7XG5cbi8qKlxuICogYHhzbHgtcG9wdWxhdGVgIGxpYnJhcnkgYmFzZWQgYWNjZXNzb3IgdG8gYSBnaXZlbiBFeGNlbCB3b3JrYm9vay4gQWxsIHRoZXNlIG1ldGhvZHMgYXJlIGludGVybmFsbHkgdXNlZCBieSB7QGxpbmsgWGxzeERhdGFGaWxsfSwgXG4gKiBidXQgY2FuIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIGltcGxlbWVudGluZyBjdXN0b20gc3ByZWFkc2hlZXQgYWNjZXNzb3JzLlxuICovXG5jbGFzcyBYbHN4UG9wdWxhdGVBY2Nlc3Mge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeFNtYXJ0VGVtcGxhdGUgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7V29ya2Jvb2t9IHdvcmtib29rIC0gVGhlIHdvcmtib29rIHRvIGJlIGFjY2Vzc2VkLlxuICAgICAqIEBwYXJhbSB7WGxzeFBvcHVsYXRlfSBYbHN4UG9wdWxhdGUgLSBUaGUgYWN0dWFsIHhsc3gtcG9wdWxhdGUgbGlicmFyeSBvYmplY3QuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBgWGxzeFBvcHVsYXRlYCBvYmplY3QgbmVlZCB0byBiZSBwYXNzZWQgaW4gb3JkZXIgdG8gZXh0cmFjdFxuICAgICAqIGNlcnRhaW4gaW5mb3JtYXRpb24gZnJvbSBpdCwgX3dpdGhvdXRfIHJlZmVycmluZyB0aGUgd2hvbGUgbGlicmFyeSwgdGh1c1xuICAgICAqIGF2b2lkaW5nIG1ha2luZyB0aGUgYHhsc3gtZGF0YWZpbGxgIHBhY2thZ2UgYSBkZXBlbmRlbmN5LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdvcmtib29rLCBYbHN4UG9wdWxhdGUpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2sgPSB3b3JrYm9vaztcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICBcbiAgICAgICAgX1JpY2hUZXh0ID0gWGxzeFBvcHVsYXRlLlJpY2hUZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvbmZpZ3VyZWQgd29ya2Jvb2sgZm9yIGRpcmVjdCBYbHN4UG9wdWxhdGUgbWFuaXB1bGF0aW9uLlxuICAgICAqIEByZXR1cm5zIHtXb3JrYm9va30gVGhlIHdvcmtib29rIGludm9sdmVkLlxuICAgICAqL1xuICAgIHdvcmtib29rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd29ya2Jvb2s7IFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMvU2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0geyp9IHZhbHVlIC0gVGhlIHJlcXVlc3RlZCB2YWx1ZSBmb3Igc2V0dGluZy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiBjZWxsJ3MgY29udGVudHMuXG4gICAgICogQHJldHVybnMgeyp8WGxzeFBvcHVsYXRlQWNjZXNzfSBFaXRoZXIgdGhlIHJlcXVlc3RlZCB2YWx1ZSBvciBjaGFpbmFibGUgdGhpcy5cbiAgICAgKi9cbiAgICBjZWxsVmFsdWUoY2VsbCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNlbGwudmFsdWUodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dCA/IHRoZVZhbHVlLnRleHQoKSA6IHRoZVZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdHlwZSBvZiB0aGUgY2VsbCAtICdmb3JtdWxhJywgJ3JpY2h0ZXh0JywgXG4gICAgICogJ3RleHQnLCAnbnVtYmVyJywgJ2RhdGUnLCAnaHlwZXJsaW5rJywgb3IgJ3Vua25vd24nO1xuICAgICAqL1xuICAgIGNlbGxUeXBlKGNlbGwpIHtcbiAgICAgICAgaWYgKGNlbGwuZm9ybXVsYSgpKVxuICAgICAgICAgICAgcmV0dXJuICdmb3JtdWxhJztcbiAgICAgICAgZWxzZSBpZiAoY2VsbC5oeXBlcmxpbmsoKSlcbiAgICAgICAgICAgIHJldHVybiAnaHlwZXJsaW5rJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRoZVZhbHVlID0gY2VsbC52YWx1ZSgpO1xuICAgICAgICBpZiAodGhlVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQpXG4gICAgICAgICAgICByZXR1cm4gJ3JpY2h0ZXh0JztcbiAgICAgICAgZWxzZSBpZiAodGhlVmFsdWUgaW5zdGFuY2VvZiBEYXRlKVxuICAgICAgICAgICAgcmV0dXJuICdkYXRlJztcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZm9ybXVsYSBmcm9tIHRoZSBjZWxsIG9yIG51bGwsIGlmIHRoZXJlIGlzbid0IGFueVxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtdWxhIC0gdGhlIHRleHQgb2YgdGhlIGZvcm11bGEgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtdWxhIGluc2lkZSB0aGUgY2VsbCBvciB0aGlzIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjZWxsRm9ybXVsYShjZWxsLCBmb3JtdWxhKSB7XG4gICAgICAgIGlmIChmb3JtdWxhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNlbGwuZm9ybXVsYShfLnRyaW1TdGFydChmb3JtdWxhLCAnID0nKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gY2VsbC5mb3JtdWxhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVhc3VyZXMgdGhlIGRpc3RhbmNlLCBhcyBhIHZlY3RvciBiZXR3ZWVuIHR3byBnaXZlbiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGZyb20gVGhlIGZpcnN0IGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSB0byBUaGUgc2Vjb25kIGNlbGwuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gY2VsbHMuXG4gICAgICovXG4gICAgY2VsbERpc3RhbmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB0by5yb3dOdW1iZXIoKSAtIGZyb20ucm93TnVtYmVyKCksXG4gICAgICAgICAgICB0by5jb2x1bW5OdW1iZXIoKSAtIGZyb20uY29sdW1uTnVtYmVyKClcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIGNlbGwsIHRha2luZyBpbnRvIGFjY291bnQgaWYgaXQgaXMgcGFydCBvZiBhIG1lcmdlZCByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgb2NjdXBpZWQgc2l6ZS5cbiAgICAgKi9cbiAgICBjZWxsU2l6ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxBZGRyID0gY2VsbC5hZGRyZXNzKCk7XG4gICAgICAgIGxldCB0aGVTaXplID0gWzEsIDFdO1xuICAgIFxuICAgICAgICBfLmZvckVhY2goY2VsbC5zaGVldCgpLl9tZXJnZUNlbGxzLCByYW5nZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByYW5nZUFkZHIgPSByYW5nZS5hdHRyaWJ1dGVzLnJlZi5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAocmFuZ2VBZGRyWzBdID09IGNlbGxBZGRyKSB7XG4gICAgICAgICAgICAgICAgdGhlU2l6ZSA9IHRoaXMuY2VsbERpc3RhbmNlKGNlbGwsIGNlbGwuc2hlZXQoKS5jZWxsKHJhbmdlQWRkclsxXSkpO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVswXTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoZVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY2VsbFN0eWxlKGNlbGwsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjZWxsLnN0eWxlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNlbGwuc3R5bGUobmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVmZXJlbmNlIElkIGZvciBhIGdpdmVuIGNlbGwsIGJhc2VkIG9uIGl0cyBzaGVldCBhbmQgYWRkcmVzcy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gY3JlYXRlIGEgcmVmZXJlbmNlIElkIHRvLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBpZCB0byBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciB0aGlzIGNlbGwuXG4gICAgICovXG4gICAgY2VsbFJlZihjZWxsLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNlbGwuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhIHJlZmVyZW5jZSBzdHJpbmcgZm9yIGEgY2VsbCBpZGVudGlmaWVkIGJ5IEBwYXJhbSBhZHIsIGZyb20gdGhlIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIGNlbGwgdGhhdCBpcyBhIGJhc2Ugb2YgdGhlIHJlZmVyZW5jZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRyIFRoZSBhZGRyZXNzIG9mIHRoZSB0YXJnZXQgY2VsbCwgYXMgbWVudGlvbmVkIGluIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgc2hlZXQgbmFtZSBpbiB0aGUgcmVmZXJlbmNlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEgcmVmZXJlbmNlIHN0cmluZyBpZGVudGlmeWluZyB0aGUgdGFyZ2V0IGNlbGwgdW5pcXVlbHkuXG4gICAgICovXG4gICAgYnVpbGRSZWYoY2VsbCwgYWRyLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGFkciA/IGNlbGwuc2hlZXQoKS5jZWxsKGFkcikuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHdpdGhTaGVldCB9KSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgY2VsbCBhdCBhIGNlcnRhaW4gb2Zmc2V0IGZyb20gYSBnaXZlbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSByZWZlcmVuY2UgY2VsbCB0byBtYWtlIHRoZSBvZmZzZXQgZnJvbS5cbiAgICAgKiBAcGFyYW0ge2ludH0gcm93cyBOdW1iZXIgb2Ygcm93cyB0byBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtpbnR9IGNvbHMgTnVtYmVyIG9mIGNvbHVtbnMgdG8gb2Zmc2V0LlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBUaGUgcmVzdWx0aW5nIGNlbGwuXG4gICAgICovXG4gICAgb2Zmc2V0Q2VsbChjZWxsLCByb3dzLCBjb2xzKSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJlbGF0aXZlQ2VsbChyb3dzLCBjb2xzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBvciBzcGxpdCByYW5nZSBvZiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXR1cyBUaGUgbWVyZ2VkIHN0YXR1cyB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgcmFuZ2VNZXJnZWQocmFuZ2UsIHN0YXR1cykge1xuICAgICAgICBpZiAoc3RhdHVzID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gcmFuZ2UubWVyZ2VkKCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmFuZ2UubWVyZ2VkKHN0YXR1cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBmb3JtdWxhIGZvciB0aGUgd2hvbGUgcmFuZ2UuIElmIGl0IGNvbnRhaW5zIG9ubHkgb25lIC0gaXQgaXMgc2V0IGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmb3JtdWxhIFRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICByYW5nZUZvcm11bGEocmFuZ2UsIGZvcm11bGEpIHtcbiAgICAgICAgaWYgKGZvcm11bGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmFuZ2UuZm9ybXVsYShfLnRyaW1TdGFydChmb3JtdWxhLCAnID0nKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5mb3JtdWxhKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGdpdmVuIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSB3aGljaCBhZGRyZXNzIHdlJ3JlIGludGVyZXN0ZWQgaW4uXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoU2hlZXQgV2hldGhlciB0byBpbmNsdWRlIHNoZWV0IG5hbWUgaW4gdGhlIGFkZHJlc3MuXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nLCByZXByZXNlbnRpbmcgdGhlIGdpdmVuIHJhbmdlLlxuICAgICAqL1xuICAgIHJhbmdlUmVmKHJhbmdlLCB3aXRoU2hlZXQpIHtcbiAgICAgICAgaWYgKHdpdGhTaGVldCA9PSBudWxsKVxuICAgICAgICAgICAgd2l0aFNoZWV0ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHJhbmdlLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFsbCB1c2VkIGNlbGxzIG9mIHRoZSBnaXZlbiB3b3JrYm9vay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGBjZWxsYCBhcmd1bWVudCBmb3IgZWFjaCB1c2VkIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgZm9yQWxsQ2VsbHMoY2IpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2suc2hlZXRzKCkuZm9yRWFjaChzaGVldCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aGVSYW5nZSA9IHNoZWV0LnVzZWRSYW5nZSgpO1xuICAgICAgICAgICAgaWYgKHRoZVJhbmdlKSBcbiAgICAgICAgICAgICAgICB0aGVSYW5nZS5mb3JFYWNoKGNiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgc3R5bGVzIGZyb20gYHNyY2AgY2VsbCB0byB0aGUgYGRlc3RgLWluYXRpb24gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBEZXN0aW5hdGlvbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gc3JjIFNvdXJjZSBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTdHlsZShkZXN0LCBzcmMpIHtcbiAgICAgICAgaWYgKCFzcmMgfHwgIWRlc3QpIHRocm93IG5ldyBFcnJvcihcIkNyYXNoISBOdWxsICdzcmMnIG9yICdkZXN0JyBmb3IgY29weVN0eWxlKCkhXCIpO1xuICAgICAgICBpZiAoc3JjID09IGRlc3QpIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChzcmMuX3N0eWxlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnN0eWxlKHNyYy5fc3R5bGUpO1xuICAgICAgICBlbHNlIGlmIChzcmMuX3N0eWxlSWQgPiAwKVxuICAgICAgICAgICAgZGVzdC5fc3R5bGVJZCA9IHNyYy5fc3R5bGVJZDtcblxuICAgICAgICBjb25zdCBkZXN0U2hlZXRJZCA9IGRlc3Quc2hlZXQoKS5uYW1lKCksXG4gICAgICAgICAgICByb3dJZCA9IGAnJHtkZXN0U2hlZXRJZH0nOiR7ZGVzdC5yb3dOdW1iZXIoKX1gLFxuICAgICAgICAgICAgY29sSWQgPSBgJyR7ZGVzdFNoZWV0SWR9Jzoke2Rlc3QuY29sdW1uTnVtYmVyKCl9YDtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93SWRdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnJvdygpLmhlaWdodCh0aGlzLl9yb3dTaXplc1tyb3dJZF0gPSBzcmMucm93KCkuaGVpZ2h0KCkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX2NvbFNpemVzW2NvbElkXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xJZF0gPSBzcmMuY29sdW1uKCkud2lkdGgoKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hQb3B1bGF0ZUFjY2VzcztcbiJdfQ==
