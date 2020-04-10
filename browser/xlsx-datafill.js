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
      if (!src || !dest) throw new Error("Crash! Null 'src' or 'dest' for copyStyle()!");
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLGlCQURBO0FBRWhCLEVBQUEsYUFBYSxFQUFFLEdBRkM7QUFHaEIsRUFBQSxRQUFRLEVBQUUsR0FITTtBQUloQixFQUFBLFVBQVUsRUFBRSxJQUpJO0FBS2hCLEVBQUEsY0FBYyxFQUFFLEtBTEE7QUFNaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBTkUsQ0FBcEI7QUFXQSxJQUFNLFNBQVMsR0FBRyw0Q0FBbEI7QUFFQTs7OztJQUdNLFk7QUFDRjs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsd0JBQVksUUFBWixFQUFzQixJQUF0QixFQUE0QjtBQUFBOztBQUN4QixTQUFLLEtBQUwsR0FBYSxFQUFDLENBQUMsWUFBRixDQUFlLEVBQWYsRUFBbUIsSUFBbkIsRUFBeUIsV0FBekIsQ0FBYjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssT0FBTCxHQUFlLFFBQWY7QUFDSDtBQUVEOzs7Ozs7Ozs7OzRCQU1RLE8sRUFBUztBQUNiLFVBQUksT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFFBQUEsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFLLEtBQWIsRUFBb0IsT0FBcEI7O0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FIRCxNQUlJLE9BQU8sS0FBSyxLQUFaO0FBQ1A7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFN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LEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBTCxFQURWO0FBR0EsVUFBSSxLQUFLLFNBQUwsQ0FBZSxHQUFmLE1BQXdCLFNBQTVCLEVBQ0ksSUFBSSxDQUFDLEdBQUwsR0FBVyxNQUFYLENBQWtCLEtBQUssU0FBTCxDQUFlLEdBQWYsSUFBc0IsR0FBRyxDQUFDLEdBQUosR0FBVSxNQUFWLEVBQXhDO0FBRUosVUFBSSxLQUFLLFNBQUwsQ0FBZSxHQUFmLE1BQXdCLFNBQTVCLEVBQ0ksSUFBSSxDQUFDLE1BQUwsR0FBYyxLQUFkLENBQW9CLEtBQUssU0FBTCxDQUFlLEdBQWYsSUFBc0IsR0FBRyxDQUFDLE1BQUosR0FBYSxLQUFiLEVBQTFDO0FBRUosYUFBTyxJQUFQO0FBQ0g7Ozs7OztBQUdMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiAvXFx7XFx7KFtefV0qKVxcfVxcfS8sXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIG1lcmdlQ2VsbHM6IHRydWUsXG4gICAgZm9sbG93Rm9ybXVsYWU6IGZhbHNlLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICBcIlwiOiBkYXRhID0+IF8ua2V5cyhkYXRhKVxuICAgIH1cbn07XG5cbmNvbnN0IHJlZlJlZ0V4cCA9IC8oJz8oW14hXSopPyc/ISk/KFtBLVpdK1xcZCspKDooW0EtWl0rXFxkKykpPy87XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZSwgdGFraW5nIGFuIGluc3RhbmNlIG9mIEV4Y2VsIHNoZWV0IGFjY2Vzc29yIGFuZCBhIEpTT04gb2JqZWN0IGFzIGRhdGEsIGFuZCBmaWxsaW5nIHRoZSB2YWx1ZXMgZnJvbSB0aGUgbGF0dGVyIGludG8gdGhlIGZvcm1lci5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggc3ByZWFkc2hlZXQgYWNjZXNzaW5nIGNsYXNzLlxuICAgICAqIEBwYXJhbSB7e319IG9wdHMgT3B0aW9ucyB0byBiZSB1c2VkIGR1cmluZyBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBvcHRzLnRlbXBsYXRlUmVnRXhwIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCBmb3IgdGVtcGxhdGUgcmVjb2duaXppbmcuIFxuICAgICAqIERlZmF1bHQgaXMgYC9cXHtcXHsoW159XSopXFx9XFx9L2AsIGkuZS4gTXVzdGFjaGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZmllbGRTcGxpdHRlciBUaGUgc3RyaW5nIHRvIGJlIGV4cGVjdGVkIGFzIHRlbXBsYXRlIGZpZWxkIHNwbGl0dGVyLiBEZWZhdWx0IGlzIGB8YC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5qb2luVGV4dCBUaGUgc3RyaW5nIHRvIGJlIHVzZWQgd2hlbiB0aGUgZXh0cmFjdGVkIHZhbHVlIGZvciBhIHNpbmdsZSBjZWxsIGlzIGFuIGFycmF5LCBcbiAgICAgKiBhbmQgaXQgbmVlZHMgdG8gYmUgam9pbmVkLiBEZWZhdWx0IGlzIGAsYC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xib29sZWFufSBvcHRzLm1lcmdlQ2VsbHMgV2hldGhlciB0byBtZXJnZSB0aGUgaGlnaGVyIGRpbWVuc2lvbiBjZWxscyBpbiB0aGUgb3V0cHV0LiBEZWZhdWx0IGlzIHRydWUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRzLmZvbGxvd0Zvcm11bGFlIElmIGEgdGVtcGxhdGUgaXMgbG9jYXRlZCBhcyBhIHJlc3VsdCBvZiBhIGZvcm11bGEsIHdoZXRoZXIgdG8gc3RpbGwgcHJvY2VzcyBpdC5cbiAgICAgKiBEZWZhdWx0IGlzIGZhbHNlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gb3B0cy5jYWxsYmFja3NNYXAgQSBtYXAgb2YgaGFuZGxlcnMgdG8gYmUgdXNlZCBmb3IgZGF0YSBhbmQgdmFsdWUgZXh0cmFjdGlvbi5cbiAgICAgKiBUaGVyZSBpcyBvbmUgZGVmYXVsdCAtIHRoZSBlbXB0eSBvbmUsIGZvciBvYmplY3Qga2V5IGV4dHJhY3Rpb24uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWNjZXNzb3IsIG9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0cyA9IF8uZGVmYXVsdHNEZWVwKHt9LCBvcHRzLCBkZWZhdWx0T3B0cyk7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgICAgIHRoaXMuX2FjY2VzcyA9IGFjY2Vzc29yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHRlci9nZXR0ZXIgZm9yIFhsc3hEYXRhRmlsbCdzIG9wdGlvbnMgYXMgc2V0IGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAgICogQHBhcmFtIHt7fXxudWxsfSBuZXdPcHRzIElmIHNldCAtIHRoZSBuZXcgb3B0aW9ucyB0byBiZSB1c2VkLiBcbiAgICAgKiBAc2VlIHtAY29uc3RydWN0b3J9LlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx8e319IFRoZSByZXF1aXJlZCBvcHRpb25zIChpbiBnZXR0ZXIgbW9kZSkgb3IgWGxzeERhdGFGaWxsIChpbiBzZXR0ZXIgbW9kZSkgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIG9wdGlvbnMobmV3T3B0cykge1xuICAgICAgICBpZiAobmV3T3B0cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXy5tZXJnZSh0aGlzLl9vcHRzLCBuZXdPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB3aG9sZSBkYXRhIHBvcHVsYXRpb24gbWVjaGFuaXNtLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgdG8gYmUgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBmaWxsRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGRhdGFGaWxscyA9IHt9O1xuXHRcbiAgICAgICAgLy8gQnVpbGQgdGhlIGRlcGVuZGVuY3kgY29ubmVjdGlvbnMgYmV0d2VlbiB0ZW1wbGF0ZXMuXG4gICAgICAgIHRoaXMuY29sbGVjdFRlbXBsYXRlcyh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhRmlsbCA9IHsgIFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSwgXG4gICAgICAgICAgICAgICAgZGVwZW5kZW50czogW10sXG4gICAgICAgICAgICAgICAgZm9ybXVsYXM6IFtdLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWZGaWxsID0gZGF0YUZpbGxzW3RlbXBsYXRlLnJlZmVyZW5jZV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFyZWZGaWxsKSBcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBhIHJlZmVyZW5jZSAnJHt0ZW1wbGF0ZS5yZWZlcmVuY2V9JyFgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUuZm9ybXVsYSkgXG4gICAgICAgICAgICAgICAgICAgIHJlZkZpbGwuZm9ybXVsYXMucHVzaChhRmlsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZWZGaWxsLmRlcGVuZGVudHMucHVzaChhRmlsbCk7XG4gICAgXG4gICAgICAgICAgICAgICAgYUZpbGwub2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZShyZWZGaWxsLnRlbXBsYXRlLmNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YUZpbGxzW3RoaXMuX2FjY2Vzcy5jZWxsUmVmKHRlbXBsYXRlLmNlbGwpXSA9IGFGaWxsO1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLy8gQXBwbHkgZWFjaCBmaWxsIG9udG8gdGhlIHNoZWV0LlxuICAgICAgICBfLmVhY2goZGF0YUZpbGxzLCBmaWxsID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxsLnByb2Nlc3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBlbHNlIGlmIChmaWxsLnRlbXBsYXRlLmZvcm11bGEpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tcmVmZXJlbmNpbmcgZm9ybXVsYSBmb3VuZCAnJHtmaWxsLmV4dHJhY3Rvcn0nLiBVc2UgYSBub24tdGVtcGxhdGVkIG9uZSFgKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsbChmaWxsLCBkYXRhLCBmaWxsLnRlbXBsYXRlLmNlbGwpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHByb3ZpZGVkIGhhbmRsZXIgZnJvbSB0aGUgbWFwLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kbGVyTmFtZSBUaGUgbmFtZSBvZiB0aGUgaGFuZGxlci5cbiAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IFRoZSBoYW5kbGVyIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSkge1xuICAgICAgICBjb25zdCBoYW5kbGVyRm4gPSB0aGlzLl9vcHRzLmNhbGxiYWNrc01hcFtoYW5kbGVyTmFtZV07XG5cbiAgICAgICAgaWYgKCFoYW5kbGVyRm4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBjYW5ub3QgYmUgZm91bmQhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyRm4gIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBpcyBub3QgYSBmdW5jdGlvbiFgKTtcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyRm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBwcm92aWRlZCBleHRyYWN0b3IgKG90IGl0ZXJhdG9yKSBzdHJpbmcgdG8gZmluZCBhIGNhbGxiYWNrIGlkIGluc2lkZSwgaWYgcHJlc2VudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBpdGVyYXRvci9leHRyYWN0b3Igc3RyaW5nIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gQSB7IGBwYXRoYCwgYGhhbmRsZXJgIH0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgSlNPTiBwYXRoXG4gICAgICogcmVhZHkgZm9yIHVzZSBhbmQgdGhlIHByb3ZpZGVkIGBoYW5kbGVyYCBfZnVuY3Rpb25fIC0gcmVhZHkgZm9yIGludm9raW5nLCBpZiBzdWNoIGlzIHByb3ZpZGVkLlxuICAgICAqIElmIG5vdCAtIHRoZSBgcGF0aGAgcHJvcGVydHkgY29udGFpbnMgdGhlIHByb3ZpZGVkIGBleHRyYWN0b3JgLCBhbmQgdGhlIGBoYW5kbGVyYCBpcyBgbnVsbGAuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcikge1xuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgZXh0cmFjdFBhcnRzID0gZXh0cmFjdG9yLnNwbGl0KFwiOlwiKSxcbiAgICAgICAgICAgIGhhbmRsZXJOYW1lID0gZXh0cmFjdFBhcnRzWzFdO1xuXG4gICAgICAgIHJldHVybiBleHRyYWN0UGFydHMubGVuZ3RoID09IDFcbiAgICAgICAgICAgID8geyBwYXRoOiBleHRyYWN0b3IsIGhhbmRsZXI6IG51bGwgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgcGF0aDogZXh0cmFjdFBhcnRzWzBdLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IHRoaXMuZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSlcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgc3R5bGUgcGFydCBvZiB0aGUgdGVtcGxhdGUgb250byBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBkZXN0aW5hdGlvbiBjZWxsIHRvIGFwcGx5IHN0eWxpbmcgdG8uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSBjaHVuayBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBiZSB1c2VkIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHJldHVybnMge0RhdGFGaWxsZXJ9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3R5bGVzICYmIGRhdGEpIHtcbiAgICAgICAgICAgIF8uZWFjaChzdHlsZXMsIHBhaXIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIjpcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRIYW5kbGVyKHBhaXIubmFtZS5zdWJzdHIoMSkpLmNhbGwodGhpcy5fb3B0cywgZGF0YSwgY2VsbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHBhaXIuZXh0cmFjdG9yLCBjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5jZWxsU3R5bGUoY2VsbCwgcGFpci5uYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBjb250ZW50cyBvZiB0aGUgY2VsbCBpbnRvIGEgdmFsaWQgdGVtcGxhdGUgaW5mby5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgY29udGFpbmluZyB0aGUgdGVtcGxhdGUgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHt7fX0gVGhlIHBhcnNlZCB0ZW1wbGF0ZS5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgYnVpbGRzIHRlbXBsYXRlIGluZm8sIHRha2luZyBpbnRvIGFjY291bnQgdGhlIHN1cHBsaWVkIG9wdGlvbnMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlVGVtcGxhdGUoY2VsbCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX2FjY2Vzcy5jZWxsVmFsdWUoY2VsbCk7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlTWF0Y2ggPSB2YWx1ZS5tYXRjaCh0aGlzLl9vcHRzLnRlbXBsYXRlUmVnRXhwKTtcbiAgICAgICAgaWYgKCFyZU1hdGNoIHx8ICF0aGlzLl9vcHRzLmZvbGxvd0Zvcm11bGFlICYmIHRoaXMuX2FjY2Vzcy5jZWxsVHlwZShjZWxsKSA9PT0gJ2Zvcm11bGEnKSBcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IHJlTWF0Y2hbMV0uc3BsaXQodGhpcy5fb3B0cy5maWVsZFNwbGl0dGVyKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIHN0eWxlcyA9ICFwYXJ0c1s0XSA/IG51bGwgOiBwYXJ0c1s0XS5zcGxpdChcIixcIiksXG4gICAgICAgICAgICBleHRyYWN0b3IgPSBwYXJ0c1syXSB8fCBcIlwiLFxuICAgICAgICAgICAgY2VsbFJlZiA9IHRoaXMuX2FjY2Vzcy5idWlsZFJlZihjZWxsLCBwYXJ0c1swXSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocGFydHMubGVuZ3RoIDwgMikgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggY29tcG9uZW50cyBvZiB0aGUgdGVtcGxhdGUgJyR7cmVNYXRjaFswXX0nYCk7XG4gICAgICAgIGlmICghIXBhcnRzWzBdICYmICFjZWxsUmVmKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHJlZmVyZW5jZSBwYXNzZWQ6ICcke3BhcnRzWzBdfSdgKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVmZXJlbmNlOiBjZWxsUmVmLFxuICAgICAgICAgICAgaXRlcmF0b3JzOiBwYXJ0c1sxXS5zcGxpdCgveHxcXCovKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGV4dHJhY3RvcjogZXh0cmFjdG9yLFxuICAgICAgICAgICAgZm9ybXVsYTogZXh0cmFjdG9yLnN0YXJ0c1dpdGgoXCI9XCIpLFxuICAgICAgICAgICAgY2VsbDogY2VsbCxcbiAgICAgICAgICAgIGNlbGxTaXplOiB0aGlzLl9hY2Nlc3MuY2VsbFNpemUoY2VsbCksXG4gICAgICAgICAgICBwYWRkaW5nOiAocGFydHNbM10gfHwgXCJcIikuc3BsaXQoLzp8LHx4fFxcKi8pLm1hcCh2ID0+IHBhcnNlSW50KHYpIHx8IDApLFxuICAgICAgICAgICAgc3R5bGVzOiAhc3R5bGVzID8gbnVsbCA6IF8ubWFwKHN0eWxlcywgcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFpciA9IF8udHJpbShzKS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXy50cmltKHBhaXJbMF0pLCBleHRyYWN0b3I6IF8udHJpbShwYWlyWzFdKSB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgd2hvbGUgd29ya2Jvb2sgZm9yIHRlbXBsYXRlIHBhdHRlcm4gYW5kIGNvbnN0cnVjdHMgdGhlIHRlbXBsYXRlcyBmb3IgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBvbiBlYWNoIHRlbXBsYXRlZCwgYWZ0ZXIgdGhleSBhcmUgc29ydGVkLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZW1wbGF0ZXMgY29sbGVjdGVkIGFyZSBzb3J0ZWQsIGJhc2VkIG9uIHRoZSBpbnRyYS10ZW1wbGF0ZSByZWZlcmVuY2UgLSBpZiBvbmUgdGVtcGxhdGVcbiAgICAgKiBpcyByZWZlcnJpbmcgYW5vdGhlciBvbmUsIGl0J2xsIGFwcGVhciBfbGF0ZXJfIGluIHRoZSByZXR1cm5lZCBhcnJheSwgdGhhbiB0aGUgcmVmZXJyZWQgdGVtcGxhdGUuXG4gICAgICogVGhpcyBpcyB0aGUgb3JkZXIgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGludm9rZWQgb24uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYWxsVGVtcGxhdGVzXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYi5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYS5jZWxsKSB8fCAhYS5yZWZlcmVuY2UgPyAtMSA6IDEpXG4gICAgICAgICAgICAuZm9yRWFjaChjYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgdGhlIHZhbHVlKHMpIGZyb20gdGhlIHByb3ZpZGVkIGRhdGEgYHJvb3RgIHRvIGJlIHNldCBpbiB0aGUgcHJvdmlkZWQgYGNlbGxgLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSBleHRyYWN0ZWQgdmFsdWVzIGZyb20uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgZXh0cmFjdGlvbiBzdHJpbmcgcHJvdmlkZWQgYnkgdGhlIHRlbXBsYXRlLiBVc3VhbGx5IGEgSlNPTiBwYXRoIHdpdGhpbiB0aGUgZGF0YSBgcm9vdGAuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgcmVmZXJlbmNlIGNlbGwsIGlmIHN1Y2ggZXhpc3RzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVtYmVyfERhdGV8QXJyYXl8QXJyYXkuPEFycmF5LjwqPj59IFRoZSB2YWx1ZSB0byBiZSB1c2VkLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBpcyB1c2VkIGV2ZW4gd2hlbiBhIHdob2xlIC0gcG9zc2libHkgcmVjdGFuZ3VsYXIgLSByYW5nZSBpcyBhYm91dCB0byBiZSBzZXQsIHNvIGl0IGNhblxuICAgICAqIHJldHVybiBhbiBhcnJheSBvZiBhcnJheXMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGV4dHJhY3RWYWx1ZXMocm9vdCwgZXh0cmFjdG9yLCBjZWxsKSB7XG4gICAgICAgIGNvbnN0IHsgcGF0aCwgaGFuZGxlciB9ID0gdGhpcy5wYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShyb290KSlcbiAgICAgICAgICAgIHJvb3QgPSBfLmdldChyb290LCBwYXRoLCByb290KTtcbiAgICAgICAgZWxzZSBpZiAocm9vdC5zaXplcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcm9vdCA9ICFleHRyYWN0b3IgPyByb290IDogXy5tYXAocm9vdCwgZW50cnkgPT4gdGhpcy5leHRyYWN0VmFsdWVzKGVudHJ5LCBleHRyYWN0b3IsIGNlbGwpKTtcbiAgICAgICAgZWxzZSBpZiAoIWhhbmRsZXIpXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5qb2luKHRoaXMuX29wdHMuam9pblRleHQgfHwgXCIsXCIpO1xuXG4gICAgICAgIHJldHVybiAhaGFuZGxlciA/IHJvb3QgOiBoYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgcm9vdCwgY2VsbCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgYW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBkYXRhIGZvciB0aGUgZ2l2ZW4gZmlsbCwgYmFzZWQgb24gdGhlIGdpdmVuXG4gICAgICogcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgbWFpbiByZWZlcmVuY2Ugb2JqZWN0IHRvIGFwcGx5IGl0ZXJhdG9ycyB0by5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpdGVyYXRvcnMgTGlzdCBvZiBpdGVyYXRvcnMgLSBzdHJpbmcgSlNPTiBwYXRocyBpbnNpZGUgdGhlIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggVGhlIGluZGV4IGluIHRoZSBpdGVyYXRvcnMgYXJyYXkgdG8gd29yayBvbi5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8QXJyYXkuPEFycmF5Pn0gQW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBleHRyYWN0ZWQgZGF0YS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdERhdGEocm9vdCwgaXRlcmF0b3JzLCBpZHgpIHtcbiAgICAgICAgbGV0IGl0ZXIgPSBpdGVyYXRvcnNbaWR4XSxcbiAgICAgICAgICAgIHNpemVzID0gW10sXG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gZmFsc2UsXG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoaXRlciA9PSAnMScpIHtcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgaXRlciA9IGl0ZXJhdG9yc1srK2lkeF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWl0ZXIpIHJldHVybiByb290O1xuXG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBwYXJzZWRJdGVyID0gdGhpcy5wYXJzZUV4dHJhY3RvcihpdGVyKTtcblxuICAgICAgICBkYXRhID0gXy5nZXQocm9vdCwgcGFyc2VkSXRlci5wYXRoLCByb290KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcGFyc2VkSXRlci5oYW5kbGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgZGF0YSA9IHBhcnNlZEl0ZXIuaGFuZGxlci5jYWxsKHRoaXMuX29wdHMsIGRhdGEpO1xuXG4gICAgICAgIGlmIChpZHggPCBpdGVyYXRvcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgZGF0YSA9IF8ubWFwKGRhdGEsIGluUm9vdCA9PiB0aGlzLmV4dHJhY3REYXRhKGluUm9vdCwgaXRlcmF0b3JzLCBpZHggKyAxKSk7XG4gICAgICAgICAgICBzaXplcyA9IGRhdGFbMF0uc2l6ZXM7XG4gICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgZGF0YSA9IF8udmFsdWVzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNvbWUgZGF0YSBzYW5pdHkgY2hlY2tzLlxuICAgICAgICBpZiAoIWRhdGEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBpdGVyYXRvciAnJHtpdGVyfScgZXh0cmFjdGVkIG5vIGRhdGEhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGRhdGEgZXh0cmFjdGVkIGZyb20gaXRlcmF0b3IgJyR7aXRlcn0nIGlzIG5laXRoZXIgYW4gYXJyYXksIG5vciBvYmplY3QhYCk7XG5cbiAgICAgICAgc2l6ZXMudW5zaGlmdCh0cmFuc3Bvc2VkID8gLWRhdGEubGVuZ3RoIDogZGF0YS5sZW5ndGgpO1xuICAgICAgICBkYXRhLnNpemVzID0gc2l6ZXM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1dCB0aGUgZGF0YSB2YWx1ZXMgaW50byB0aGUgcHJvcGVyIGNlbGxzLCB3aXRoIGNvcnJlY3QgZXh0cmFjdGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciB0aGUgZGF0YSB0byBiZSBwdXQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSBUaGUgYWN0dWFsIGRhdGEgdG8gYmUgcHV0LiBUaGUgdmFsdWVzIHdpbGwgYmUgX2V4dHJhY3RlZF8gZnJvbSBoZXJlIGZpcnN0LlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0aGF0IGlzIGJlaW5nIGltcGxlbWVudGVkIHdpdGggdGhhdCBkYXRhIGZpbGwuXG4gICAgICogQHJldHVybnMge0FycmF5fSBNYXRyaXggc2l6ZSB0aGF0IHRoaXMgZGF0YSBoYXMgb2NjdXBpZWQgb24gdGhlIHNoZWV0IFtyb3dzLCBjb2xzXS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcHV0VmFsdWVzKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGlmICghY2VsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ3Jhc2ghIE51bGwgcmVmZXJlbmNlIGNlbGwgaW4gJ3B1dFZhbHVlcygpJyFcIik7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG5cbiAgICAgICAgLy8gbWFrZSBzdXJlLCB0aGUgXG4gICAgICAgIGlmICghZW50cnlTaXplIHx8ICFlbnRyeVNpemUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAuY2VsbFZhbHVlKGNlbGwsIHZhbHVlKVxuICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBfLmNodW5rKGRhdGEsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAuY2VsbFZhbHVlKGNlbGwsIHZhbHVlW3JpXVtjaV0pXG4gICAgICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAgICAgLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YVtyaV1bY2ldLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlYWwgd2l0aCBtb3JlIHRoYW4gMyBkaW1lbnNpb25zIGNhc2UuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlcyBleHRyYWN0ZWQgd2l0aCAnJHt0ZW1wbGF0ZS5leHRyYWN0b3J9IGFyZSBtb3JlIHRoYW4gMiBkaW1lbnNpb24hJ2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZmlsdGVyIG9udG8gdGhlIHNoZWV0IC0gZXh0cmFjdGluZyB0aGUgcHJvcGVyIGRhdGEsIGZvbGxvd2luZyBkZXBlbmRlbnQgZmlsbHMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RmlsbChhRmlsbCwgcm9vdCwgbWFpbkNlbGwpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHRoZURhdGEgPSB0aGlzLmV4dHJhY3REYXRhKHJvb3QsIHRlbXBsYXRlLml0ZXJhdG9ycywgMCk7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IFsxLCAxXTtcblxuICAgICAgICBpZiAoIWFGaWxsLmRlcGVuZGVudHMgfHwgIWFGaWxsLmRlcGVuZGVudHMubGVuZ3RoKVxuICAgICAgICAgICAgZW50cnlTaXplID0gdGhpcy5wdXRWYWx1ZXMobWFpbkNlbGwsIHRoZURhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV4dENlbGwgPSBtYWluQ2VsbDtcbiAgICAgICAgICAgIGNvbnN0IHNpemVNYXh4ZXIgPSAodmFsLCBpZHgpID0+IGVudHJ5U2l6ZVtpZHhdID0gTWF0aC5tYXgoZW50cnlTaXplW2lkeF0sIHZhbCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgdGhlRGF0YS5sZW5ndGg7ICsrZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluUm9vdCA9IHRoZURhdGFbZF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmID0gMDsgZiA8IGFGaWxsLmRlcGVuZGVudHMubGVuZ3RoOyArK2YpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5GaWxsID0gYUZpbGwuZGVwZW5kZW50c1tmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluQ2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCBpbkZpbGwub2Zmc2V0WzBdLCBpbkZpbGwub2Zmc2V0WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVswXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJvd09mZnNldCA+IDEgfHwgY29sT2Zmc2V0ID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKG5leHRDZWxsLCBNYXRoLm1heChyb3dPZmZzZXQgLSAxLCAwKSwgTWF0aC5tYXgoY29sT2Zmc2V0IC0gMSwgMCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09IHRydWUgfHwgdGhpcy5fb3B0cy5tZXJnZUNlbGwgPT09ICdib3RoJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfHwgcm93T2Zmc2V0ID4gMSAmJiB0aGlzLl9vcHRzLm1lcmdlQ2VsbHMgPT09ICd2ZXJ0aWNhbCcgXG4gICAgICAgICAgICAgICAgICAgICAgICB8fCBjb2xPZmZzZXQgPiAxICYmIHRoaXMuX29wdHMubWVyZ2VDZWxscyA9PT0gJ2hvcml6b250YWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnJhbmdlTWVyZ2VkKHJuZywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcm5nLmZvckVhY2goY2VsbCA9PiB0aGlzLl9hY2Nlc3MuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArICh0ZW1wbGF0ZS5wYWRkaW5nWzBdIHx8IDApLCBjb2xPZmZzZXQgKyAodGVtcGxhdGUucGFkZGluZ1sxXSB8fCAwKSk7XHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHJlY2FsYyBjb21iaW5lZCBlbnRyeSBzaXplLlxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UobWFpbkNlbGwsIG5leHRDZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goYUZpbGwuZm9ybXVsYXMsIGYgPT4gdGhpcy5hcHBseUZvcm11bGEoZiwgZW50cnlTaXplLCBtYWluQ2VsbCkpO1xuXG4gICAgICAgIGFGaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBhIGZvcm11bGEgYmUgc2hpZnRpbmcgYWxsIHRoZSBmaXhlZCBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZvcm11bGEgVGhlIGZvcm11bGEgdG8gYmUgc2hpZnRlZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcixOdW1iZXI+fSBvZmZzZXQgVGhlIG9mZnNldCBvZiB0aGUgcmVmZXJlbmNlZCB0ZW1wbGF0ZSB0byB0aGUgZm9ybXVsYSBvbmUuXG4gICAgICogQHBhcmFtIHtBcnJheTxOdW1iZXIsTnVtYmVyPn0gc2l6ZSBUaGUgc2l6ZSBvZiB0aGUgcmFuZ2VzIGFzIHRoZXkgc2hvdWxkIGJlLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwcm9jZXNzZWQgdGV4dC5cbiAgICAgKi9cbiAgICBzaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBzaXplKSB7XG4gICAgICAgIGxldCBuZXdGb3JtdWxhID0gJyc7XG5cbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmb3JtdWxhLm1hdGNoKHJlZlJlZ0V4cCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKSBicmVhaztcblxuICAgICAgICAgICAgbGV0IGZyb20gPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbChtYXRjaFszXSwgbWF0Y2hbMl0pLFxuICAgICAgICAgICAgICAgIG5ld1JlZiA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChvZmZzZXRbMF0gPiAwIHx8IG9mZnNldFsxXSA+IDApXG4gICAgICAgICAgICAgICAgZnJvbSA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKGZyb20sIG9mZnNldFswXSwgb2Zmc2V0WzFdKTtcblxuICAgICAgICAgICAgbmV3UmVmID0gIW1hdGNoWzVdXG4gICAgICAgICAgICAgICAgPyB0aGlzLl9hY2Nlc3MuY2VsbFJlZihmcm9tLCAhIW1hdGNoWzJdKVxuICAgICAgICAgICAgICAgIDogdGhpcy5fYWNjZXNzLnJhbmdlUmVmKHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoZnJvbSwgc2l6ZVswXSwgc2l6ZVsxXSksICEhbWF0Y2hbMl0pO1xuXG4gICAgICAgICAgICBuZXdGb3JtdWxhICs9IGZvcm11bGEuc3Vic3RyKDAsIG1hdGNoLmluZGV4KSArIG5ld1JlZjtcbiAgICAgICAgICAgIGZvcm11bGEgPSBmb3JtdWxhLnN1YnN0cihtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdGb3JtdWxhICs9IGZvcm11bGE7XG4gICAgICAgIHJldHVybiBuZXdGb3JtdWxhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHRoZSBnaXZlbiBmb3JtdWxhIGluIHRoZSBzaGVldCwgaS5lLiBjaGFuZ2luZyBpdCB0byBtYXRjaCB0aGUgXG4gICAgICogc2l6ZXMgb2YgdGhlIHJlZmVyZW5jZXMgdGVtcGxhdGVzLlxuICAgICAqIEBwYXJhbSB7e319IGFGaWxsIFRoZSBmaWxsIHRvIGJlIGFwcGxpZWQsIGFzIGNvbnN0cnVjdGVkIGluIHRoZSB7QGxpbmsgZmlsbERhdGF9IG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge0FycmF5PE51bWJlcj59IGVudHJ5U2l6ZSBUaGUgZmlsbC10by1zaXplIG1hcCwgYXMgY29uc3RydWN0ZWQgc28gZmFyXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIHB1dC9zdGFydCB0aGlzIGZvcm11bGEgaW50b1xuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5Rm9ybXVsYShhRmlsbCwgZW50cnlTaXplLCBjZWxsKSB7XG4gICAgICAgIGNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChjZWxsLCBhRmlsbC5vZmZzZXRbMF0sIGFGaWxsLm9mZnNldFsxXSk7XG5cbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIGl0ZXIgPSBfLnRyaW0odGVtcGxhdGUuaXRlcmF0b3JzWzBdKSxcbiAgICAgICAgICAgIG9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UodGVtcGxhdGUuY2VsbCwgY2VsbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgbGV0IGZvcm11bGEgPSB0ZW1wbGF0ZS5leHRyYWN0b3IsIFxuICAgICAgICAgICAgcm5nO1xuICAgICAgICAgICAgXG4gICAgICAgIGFGaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2FjY2Vzcy5jZWxsVmFsdWUoY2VsbCwgbnVsbCk7XG5cbiAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDIgJiYgZW50cnlTaXplWzFdIDwgMiB8fCBpdGVyID09PSAnYWxsJykge1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgWzAsIDBdKTtcbiAgICAgICAgICAgIHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlciA9PT0gJ2NvbHMnKSB7XG4gICAgICAgICAgICBmb3JtdWxhID0gdGhpcy5zaGlmdEZvcm11bGEoZm9ybXVsYSwgb2Zmc2V0LCBbZW50cnlTaXplWzBdIC0gMSwgMF0pO1xuICAgICAgICAgICAgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCAwLCBlbnRyeVNpemVbMV0gLSAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVyID09PSAncm93cycpIHtcbiAgICAgICAgICAgIGZvcm11bGEgPSB0aGlzLnNoaWZ0Rm9ybXVsYShmb3JtdWxhLCBvZmZzZXQsIFswLCBlbnRyeVNpemVbMV0gLSAxXSk7XG4gICAgICAgICAgICBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIDApO1xuICAgICAgICB9IGVsc2UgeyAvLyBpLmUuICdub25lJ1xuICAgICAgICAgICAgZm9ybXVsYSA9IHRoaXMuc2hpZnRGb3JtdWxhKGZvcm11bGEsIG9mZnNldCwgW2VudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDFdKTtcbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5jZWxsRm9ybXVsYShjZWxsLCBmb3JtdWxhKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5yYW5nZUZvcm11bGEocm5nLCBmb3JtdWxhKTtcbiAgICB9XG59XG5cbi8qKlxuICogVGhlIGJ1aWx0LWluIGFjY2Vzc29yIGJhc2VkIG9uIHhsc3gtcG9wdWxhdGUgbnBtIG1vZHVsZVxuICogQHR5cGUge1hsc3hQb3B1bGF0ZUFjY2Vzc31cbiAqL1xuWGxzeERhdGFGaWxsLlhsc3hQb3B1bGF0ZUFjY2VzcyA9IHJlcXVpcmUoJy4vWGxzeFBvcHVsYXRlQWNjZXNzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuLy8gY29uc3QgYWxsU3R5bGVzID0gW1xuLy8gICAgIFwiYm9sZFwiLCBcbi8vICAgICBcIml0YWxpY1wiLCBcbi8vICAgICBcInVuZGVybGluZVwiLCBcbi8vICAgICBcInN0cmlrZXRocm91Z2hcIiwgXG4vLyAgICAgXCJzdWJzY3JpcHRcIiwgXG4vLyAgICAgXCJzdXBlcnNjcmlwdFwiLCBcbi8vICAgICBcImZvbnRTaXplXCIsIFxuLy8gICAgIFwiZm9udEZhbWlseVwiLCBcbi8vICAgICBcImZvbnRHZW5lcmljRmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udFNjaGVtZVwiLCBcbi8vICAgICBcImZvbnRDb2xvclwiLCBcbi8vICAgICBcImhvcml6b250YWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJqdXN0aWZ5TGFzdExpbmVcIiwgXG4vLyAgICAgXCJpbmRlbnRcIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbEFsaWdubWVudFwiLCBcbi8vICAgICBcIndyYXBUZXh0XCIsIFxuLy8gICAgIFwic2hyaW5rVG9GaXRcIiwgXG4vLyAgICAgXCJ0ZXh0RGlyZWN0aW9uXCIsIFxuLy8gICAgIFwidGV4dFJvdGF0aW9uXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q291bnRlcmNsb2Nrd2lzZVwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENsb2Nrd2lzZVwiLCBcbi8vICAgICBcInJvdGF0ZVRleHRVcFwiLCBcbi8vICAgICBcInJvdGF0ZVRleHREb3duXCIsIFxuLy8gICAgIFwidmVydGljYWxUZXh0XCIsIFxuLy8gICAgIFwiZmlsbFwiLCBcbi8vICAgICBcImJvcmRlclwiLCBcbi8vICAgICBcImJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwiYm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyXCIsIFwicmlnaHRCb3JkZXJcIiwgXCJ0b3BCb3JkZXJcIiwgXCJib3R0b21Cb3JkZXJcIiwgXCJkaWFnb25hbEJvcmRlclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJDb2xvclwiLCBcInJpZ2h0Qm9yZGVyQ29sb3JcIiwgXCJ0b3BCb3JkZXJDb2xvclwiLCBcImJvdHRvbUJvcmRlckNvbG9yXCIsIFwiZGlhZ29uYWxCb3JkZXJDb2xvclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJTdHlsZVwiLCBcInJpZ2h0Qm9yZGVyU3R5bGVcIiwgXCJ0b3BCb3JkZXJTdHlsZVwiLCBcImJvdHRvbUJvcmRlclN0eWxlXCIsIFwiZGlhZ29uYWxCb3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImRpYWdvbmFsQm9yZGVyRGlyZWN0aW9uXCIsIFxuLy8gICAgIFwibnVtYmVyRm9ybWF0XCJcbi8vIF07XG5cbmxldCBfUmljaFRleHQgPSBudWxsO1xuXG4vKipcbiAqIGB4c2x4LXBvcHVsYXRlYCBsaWJyYXJ5IGJhc2VkIGFjY2Vzc29yIHRvIGEgZ2l2ZW4gRXhjZWwgd29ya2Jvb2suIEFsbCB0aGVzZSBtZXRob2RzIGFyZSBpbnRlcm5hbGx5IHVzZWQgYnkge0BsaW5rIFhsc3hEYXRhRmlsbH0sIFxuICogYnV0IGNhbiBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciBpbXBsZW1lbnRpbmcgY3VzdG9tIHNwcmVhZHNoZWV0IGFjY2Vzc29ycy5cbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIHRodXNcbiAgICAgKiBhdm9pZGluZyBtYWtpbmcgdGhlIGB4bHN4LWRhdGFmaWxsYCBwYWNrYWdlIGEgZGVwZW5kZW5jeS5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3b3JrYm9vaywgWGxzeFBvcHVsYXRlKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rID0gd29ya2Jvb2s7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgXG4gICAgICAgIF9SaWNoVGV4dCA9IFhsc3hQb3B1bGF0ZS5SaWNoVGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb25maWd1cmVkIHdvcmtib29rIGZvciBkaXJlY3QgWGxzeFBvcHVsYXRlIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7V29ya2Jvb2t9IFRoZSB3b3JrYm9vayBpbnZvbHZlZC5cbiAgICAgKi9cbiAgICB3b3JrYm9vaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtib29rOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzL1NldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSAtIFRoZSByZXF1ZXN0ZWQgdmFsdWUgZm9yIHNldHRpbmcuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgY2VsbCdzIGNvbnRlbnRzLlxuICAgICAqIEByZXR1cm5zIHsqfFhsc3hQb3B1bGF0ZUFjY2Vzc30gRWl0aGVyIHRoZSByZXF1ZXN0ZWQgdmFsdWUgb3IgY2hhaW5hYmxlIHRoaXMuXG4gICAgICovXG4gICAgY2VsbFZhbHVlKGNlbGwsIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjZWxsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhlVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQgPyB0aGVWYWx1ZS50ZXh0KCkgOiB0aGVWYWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHR5cGUgb2YgdGhlIGNlbGwgLSAnZm9ybXVsYScsICdyaWNodGV4dCcsIFxuICAgICAqICd0ZXh0JywgJ251bWJlcicsICdkYXRlJywgJ2h5cGVybGluaycsIG9yICd1bmtub3duJztcbiAgICAgKi9cbiAgICBjZWxsVHlwZShjZWxsKSB7XG4gICAgICAgIGlmIChjZWxsLmZvcm11bGEoKSlcbiAgICAgICAgICAgIHJldHVybiAnZm9ybXVsYSc7XG4gICAgICAgIGVsc2UgaWYgKGNlbGwuaHlwZXJsaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2h5cGVybGluayc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0KVxuICAgICAgICAgICAgcmV0dXJuICdyaWNodGV4dCc7XG4gICAgICAgIGVsc2UgaWYgKHRoZVZhbHVlIGluc3RhbmNlb2YgRGF0ZSlcbiAgICAgICAgICAgIHJldHVybiAnZGF0ZSc7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZvcm11bGEgZnJvbSB0aGUgY2VsbCBvciBudWxsLCBpZiB0aGVyZSBpc24ndCBhbnlcbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybXVsYSAtIHRoZSB0ZXh0IG9mIHRoZSBmb3JtdWxhIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybXVsYSBpbnNpZGUgdGhlIGNlbGwgb3IgdGhpcyBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgY2VsbEZvcm11bGEoY2VsbCwgZm9ybXVsYSkge1xuICAgICAgICBpZiAoZm9ybXVsYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjZWxsLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGNlbGwuZm9ybXVsYSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lYXN1cmVzIHRoZSBkaXN0YW5jZSwgYXMgYSB2ZWN0b3IgYmV0d2VlbiB0d28gZ2l2ZW4gY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBmcm9tIFRoZSBmaXJzdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gdG8gVGhlIHNlY29uZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIGNlbGxzLlxuICAgICAqL1xuICAgIGNlbGxEaXN0YW5jZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgdG8ucm93TnVtYmVyKCkgLSBmcm9tLnJvd051bWJlcigpLFxuICAgICAgICAgICAgdG8uY29sdW1uTnVtYmVyKCkgLSBmcm9tLmNvbHVtbk51bWJlcigpXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiBjZWxsLCB0YWtpbmcgaW50byBhY2NvdW50IGlmIGl0IGlzIHBhcnQgb2YgYSBtZXJnZWQgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIG9jY3VwaWVkIHNpemUuXG4gICAgICovXG4gICAgY2VsbFNpemUoY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsQWRkciA9IGNlbGwuYWRkcmVzcygpO1xuICAgICAgICBsZXQgdGhlU2l6ZSA9IFsxLCAxXTtcbiAgICBcbiAgICAgICAgXy5mb3JFYWNoKGNlbGwuc2hlZXQoKS5fbWVyZ2VDZWxscywgcmFuZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VBZGRyID0gcmFuZ2UuYXR0cmlidXRlcy5yZWYuc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKHJhbmdlQWRkclswXSA9PSBjZWxsQWRkcikge1xuICAgICAgICAgICAgICAgIHRoZVNpemUgPSB0aGlzLmNlbGxEaXN0YW5jZShjZWxsLCBjZWxsLnNoZWV0KCkuY2VsbChyYW5nZUFkZHJbMV0pKTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMF07XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGVTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBuYW1lZCBzdHlsZSBvZiBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIG9wZXJhdGVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBzdHlsZSBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB2YWx1ZSBUaGUgdmFsdWUgZm9yIHRoaXMgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNlbGxTdHlsZShjZWxsLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjZWxsLnN0eWxlKG5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlZmVyZW5jZSBJZCBmb3IgYSBnaXZlbiBjZWxsLCBiYXNlZCBvbiBpdHMgc2hlZXQgYW5kIGFkZHJlc3MuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGNyZWF0ZSBhIHJlZmVyZW5jZSBJZCB0by5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgdGhlIHNoZWV0IG5hbWUgaW4gdGhlIHJlZmVyZW5jZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgaWQgdG8gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgdGhpcyBjZWxsLlxuICAgICAqL1xuICAgIGNlbGxSZWYoY2VsbCwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiBjZWxsLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYSByZWZlcmVuY2Ugc3RyaW5nIGZvciBhIGNlbGwgaWRlbnRpZmllZCBieSBAcGFyYW0gYWRyLCBmcm9tIHRoZSBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSBjZWxsIHRoYXQgaXMgYSBiYXNlIG9mIHRoZSByZWZlcmVuY2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkciBUaGUgYWRkcmVzcyBvZiB0aGUgdGFyZ2V0IGNlbGwsIGFzIG1lbnRpb25lZCBpbiBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhTaGVldCBXaGV0aGVyIHRvIGluY2x1ZGUgdGhlIHNoZWV0IG5hbWUgaW4gdGhlIHJlZmVyZW5jZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIHJlZmVyZW5jZSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHRhcmdldCBjZWxsIHVuaXF1ZWx5LlxuICAgICAqL1xuICAgIGJ1aWxkUmVmKGNlbGwsIGFkciwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiBhZHIgPyBjZWxsLnNoZWV0KCkuY2VsbChhZHIpLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB3aXRoU2hlZXQgfSkgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhIGdpdmVuIGNlbGwgZnJvbSBhIGdpdmVuIHNoZWV0IChvciBhbiBhY3RpdmUgb25lKS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IGFkZHJlc3MgVGhlIGNlbGwgYWRyZXNzIHRvIGJlIHVzZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xpZHh9IHNoZWV0SWQgVGhlIGlkL25hbWUgb2YgdGhlIHNoZWV0IHRvIHJldHJpZXZlIHRoZSBjZWxsIGZyb20uIERlZmF1bHRzIHRvIGFuIGFjdGl2ZSBvbmUuXG4gICAgICogQHJldHVybnMge0NlbGx9IEEgcmVmZXJlbmNlIHRvIHRoZSByZXF1aXJlZCBjZWxsLlxuICAgICAqL1xuICAgIGdldENlbGwoYWRkcmVzcywgc2hlZXRJZCkge1xuICAgICAgICBjb25zdCB0aGVTaGVldCA9IHNoZWV0SWQgPT0gbnVsbCA/IHRoaXMuX3dvcmtib29rLmFjdGl2ZVNoZWV0KCkgOiB0aGlzLl93b3JrYm9vay5zaGVldChzaGVldElkKTtcbiAgICAgICAgcmV0dXJuIHRoZVNoZWV0LmNlbGwoYWRkcmVzcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhbmQgcmV0dXJucyB0aGUgcmFuZ2Ugc3RhcnRpbmcgZnJvbSB0aGUgZ2l2ZW4gY2VsbCBhbmQgc3Bhd25pbmcgZ2l2ZW4gcm93cyBhbmQgY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIG9mIHRoZSByYW5nZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcm93T2Zmc2V0IE51bWJlciBvZiByb3dzIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIHJvdy5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gY29sT2Zmc2V0IE51bWJlciBvZiBjb2x1bW5zIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIGNvbHVtbi5cbiAgICAgKiBAcmV0dXJucyB7UmFuZ2V9IFRoZSBjb25zdHJ1Y3RlZCByYW5nZS5cbiAgICAgKi9cbiAgICBnZXRDZWxsUmFuZ2UoY2VsbCwgcm93T2Zmc2V0LCBjb2xPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmFuZ2VUbyhjZWxsLnJlbGF0aXZlQ2VsbChyb3dPZmZzZXQsIGNvbE9mZnNldCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGNlbGwgYXQgYSBjZXJ0YWluIG9mZnNldCBmcm9tIGEgZ2l2ZW4gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgcmVmZXJlbmNlIGNlbGwgdG8gbWFrZSB0aGUgb2Zmc2V0IGZyb20uXG4gICAgICogQHBhcmFtIHtpbnR9IHJvd3MgTnVtYmVyIG9mIHJvd3MgdG8gb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7aW50fSBjb2xzIE51bWJlciBvZiBjb2x1bW5zIHRvIG9mZnNldC5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gVGhlIHJlc3VsdGluZyBjZWxsLlxuICAgICAqL1xuICAgIG9mZnNldENlbGwoY2VsbCwgcm93cywgY29scykge1xuICAgICAgICByZXR1cm4gY2VsbC5yZWxhdGl2ZUNlbGwocm93cywgY29scyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVyZ2Ugb3Igc3BsaXQgcmFuZ2Ugb2YgY2VsbHMuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdGF0dXMgVGhlIG1lcmdlZCBzdGF0dXMgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHJhbmdlTWVyZ2VkKHJhbmdlLCBzdGF0dXMpIHtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHJhbmdlLm1lcmdlZCgpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJhbmdlLm1lcmdlZChzdGF0dXMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgZm9ybXVsYSBmb3IgdGhlIHdob2xlIHJhbmdlLiBJZiBpdCBjb250YWlucyBvbmx5IG9uZSAtIGl0IGlzIHNldCBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZm9ybXVsYSBUaGUgZm9ybXVsYSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgcmFuZ2VGb3JtdWxhKHJhbmdlLCBmb3JtdWxhKSB7XG4gICAgICAgIGlmIChmb3JtdWxhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJhbmdlLmZvcm11bGEoXy50cmltU3RhcnQoZm9ybXVsYSwgJyA9JykpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcmFuZ2UuZm9ybXVsYSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBnaXZlbiByYW5nZS5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2Ugd2hpY2ggYWRkcmVzcyB3ZSdyZSBpbnRlcmVzdGVkIGluLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aFNoZWV0IFdoZXRoZXIgdG8gaW5jbHVkZSBzaGVldCBuYW1lIGluIHRoZSBhZGRyZXNzLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZywgcmVwcmVzZW50aW5nIHRoZSBnaXZlbiByYW5nZS5cbiAgICAgKi9cbiAgICByYW5nZVJlZihyYW5nZSwgd2l0aFNoZWV0KSB7XG4gICAgICAgIGlmICh3aXRoU2hlZXQgPT0gbnVsbClcbiAgICAgICAgICAgIHdpdGhTaGVldCA9IHRydWU7XG4gICAgICAgIHJldHVybiByYW5nZS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogd2l0aFNoZWV0IH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGhlUmFuZ2UgPSBzaGVldC51c2VkUmFuZ2UoKTtcbiAgICAgICAgICAgIGlmICh0aGVSYW5nZSkgXG4gICAgICAgICAgICAgICAgdGhlUmFuZ2UuZm9yRWFjaChjYik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmIChzcmMgPT0gZGVzdCkgcmV0dXJuIHRoaXM7XG4gICAgICAgIGlmICghc3JjIHx8ICFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoXCJDcmFzaCEgTnVsbCAnc3JjJyBvciAnZGVzdCcgZm9yIGNvcHlTdHlsZSgpIVwiKTtcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemUgdGhlIGNvbHVtbiBhbmQgcm93IG9mIHRoZSBkZXN0aW5hdGlvbiBjZWxsLCBpZiBub3QgY2hhbmdlZCBhbHJlYWR5LlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBUaGUgZGVzdGluYXRpb24gY2VsbCB3aGljaCByb3cgYW5kIGNvbHVtbiB0byByZXNpemUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgVGhlIHNvdXJjZSAodGVtcGxhdGUpIGNlbGwgdG8gdGFrZSB0aGUgc2l6ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTaXplKGRlc3QsIHNyYykge1xuICAgICAgICBjb25zdCByb3cgPSBkZXN0LnJvd051bWJlcigpLFxuICAgICAgICAgICAgY29sID0gZGVzdC5jb2x1bW5OdW1iZXIoKTtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93XSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
