(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _2 = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var defaultOpts = {
  templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
  fieldSplitter: "|",
  joinText: ",",
  callbacksMap: {
    "": function _(data) {
      return _2.keys(data);
    }
  }
};
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
          processed: false
        };

        if (template.reference) {
          var refFill = dataFills[template.reference];
          if (!refFill) throw new Error("Unable to find a reference '".concat(template.reference, "'!"));
          refFill.dependents.push(aFill);
          aFill.offset = _this._access.cellDistance(refFill.template.cell, template.cell);
        }

        dataFills[_this._access.cellRef(template.cell)] = aFill;
      }); // Apply each fill onto the sheet.

      _2.each(dataFills, function (fill) {
        if (!fill.processed) _this.applyFill(fill, data, fill.template.cell);
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

            if (val) _this2._access.setStyle(cell, pair.name, val);
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
      // The options are in `this` argument.
      var reMatch = (this._access.cellValue(cell) || '').match(this._opts.templateRegExp);
      if (!reMatch) return null;
      var parts = reMatch[1].split(this._opts.fieldSplitter).map(_2.trim),
          styles = !parts[4] ? null : parts[4].split(",");
      if (parts.length < 2) throw new Error("Not enough components of the template ".concat(reMatch[0]));
      return {
        reference: this._access.buildRef(cell, parts[0]),
        iterators: parts[1].split(/x|\*/).map(_2.trim),
        extractor: parts[2] || "",
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
        return a.reference == _this3._access.cellRef(b.cell) ? 1 : b.reference == _this3._access.cellRef(a.cell) ? -1 : 0;
      }).forEach(cb);
    }
    /**
     * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
     * @param {{}} root The data root to be extracted values from.
     * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
     * @param {Cell} cell A reference cell, if such exists.
     * @returns {string|Array|Array.<Array.<*>>} The value to be used.
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
        this._access.setValue(cell, value).copyStyle(cell, template.cell).copySize(cell, template.cell);

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
          _this6._access.setValue(cell, value[ri][ci]).copyStyle(cell, template.cell).copySize(cell, template.cell);

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
                inCell = this._access.offsetCell(nextCell, inFill.offset[0], inFill.offset[1]),
                innerSize = this.applyFill(inFill, inRoot, inCell);

            _2.forEach(innerSize, sizeMaxxer);

            inFill.processed = true;
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

            this._access.setRangeMerged(rng, true);

            rng.forEach(function (cell) {
              return _this7._access.copySize(cell, template.cell);
            });
          } // Finally, calculate the next cell.


          nextCell = this._access.offsetCell(nextCell, rowOffset + (template.padding[0] || 0), colOffset + (template.padding[1] || 0));
        } // Now recalc combined entry size.


        _2.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
      }
      return entrySize;
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
     * Creates a reference Id for a given cell, based on its sheet and address.
     * @param {Cell} cell The cell to create a reference Id to.
     * @returns {string} The id to be used as a reference for this cell.
     */

  }, {
    key: "cellRef",
    value: function cellRef(cell) {
      return cell.address({
        includeSheetName: true
      });
    }
    /**
     * Build a reference string for a cell identified by @param adr, from the @param cell.
     * @param {Cell} cell A cell that is a base of the reference.
     * @param {string} adr The address of the target cell, as mentioned in @param cell.
     * @returns {string} A reference string identifying the target cell uniquely.
     */

  }, {
    key: "buildRef",
    value: function buildRef(cell, adr) {
      return adr ? cell.sheet().cell(adr).address({
        includeSheetName: true
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
    key: "setRangeMerged",
    value: function setRangeMerged(range, status) {
      range.merged(status);
      return this;
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
        return sheet.usedRange().forEach(cb);
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
    /**
     * Sets a value in the cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} value The string value to be set inside.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "setValue",
    value: function setValue(cell, value) {
      cell.value(value);
      return this;
    }
    /**
     * Sets a named style of a given cell.
     * @param {Cell} cell The cell to be operated.
     * @param {string} name The name of the style property to be set.
     * @param {string|object} value The value for this property to be set.
     * @returns {XlsxPopulateAccess} For invocation chaining.
     */

  }, {
    key: "setStyle",
    value: function setStyle(cell, name, value) {
      cell.style(name, value);
      return this;
    }
  }]);

  return XlsxPopulateAccess;
}();

module.exports = XlsxPopulateAccess;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLElBQUksTUFBSixDQUFXLGlCQUFYLENBREE7QUFFaEIsRUFBQSxhQUFhLEVBQUUsR0FGQztBQUdoQixFQUFBLFFBQVEsRUFBRSxHQUhNO0FBSWhCLEVBQUEsWUFBWSxFQUFFO0FBQ1YsUUFBSSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxDQUFKO0FBQUE7QUFERTtBQUpFLENBQXBCO0FBU0E7Ozs7SUFHTSxZO0FBQ0Y7Ozs7Ozs7Ozs7OztBQVlBLHdCQUFZLFFBQVosRUFBc0IsSUFBdEIsRUFBNEI7QUFBQTs7QUFDeEIsU0FBSyxLQUFMLEdBQWEsRUFBQyxDQUFDLFlBQUYsQ0FBZSxFQUFmLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLENBQWI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsRUFBakI7QUFDQSxTQUFLLE9BQUwsR0FBZSxRQUFmO0FBQ0g7QUFFRDs7Ozs7Ozs7Ozs0QkFNUSxPLEVBQVM7QUFDYixVQUFJLE9BQU8sS0FBSyxJQUFoQixFQUFzQjtBQUNsQixRQUFBLEVBQUMsQ0FBQyxLQUFGLENBQVEsS0FBSyxLQUFiLEVBQW9CLE9BQXBCOztBQUNBLGVBQU8sSUFBUDtBQUNILE9BSEQsTUFJSSxPQUFPLEtBQUssS0FBWjtBQUNQO0FBRUQ7Ozs7Ozs7OzZCQUtTLEksRUFBTTtBQUFBOztBQUNYLFVBQU0sU0FBUyxHQUFHLEVBQWxCLENBRFcsQ0FHWDs7QUFDQSxXQUFLLGdCQUFMLENB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LEVBQWlCLEtBQWpCO0FBQ0EsYUFBTyxJQUFQO0FBQ0g7Ozs7OztBQUdMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLGtCQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiBuZXcgUmVnRXhwKC9cXHtcXHsoW159XSopXFx9XFx9LyksXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICBcIlwiOiBkYXRhID0+IF8ua2V5cyhkYXRhKVxuICAgIH1cbn07XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZSwgdGFraW5nIGFuIGluc3RhbmNlIG9mIEV4Y2VsIHNoZWV0IGFjY2Vzc29yIGFuZCBhIEpTT04gb2JqZWN0IGFzIGRhdGEsIGFuZCBmaWxsaW5nIHRoZSB2YWx1ZXMgZnJvbSB0aGUgbGF0dGVyIGludG8gdGhlIGZvcm1lci5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggc3ByZWFkc2hlZXQgYWNjZXNzaW5nIGNsYXNzLlxuICAgICAqIEBwYXJhbSB7e319IG9wdHMgT3B0aW9ucyB0byBiZSB1c2VkIGR1cmluZyBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSBvcHRzLnRlbXBsYXRlUmVnRXhwIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCBmb3IgdGVtcGxhdGUgcmVjb2duaXppbmcuIFxuICAgICAqIERlZmF1bHQgaXMgYC9cXHtcXHsoW159XSopXFx9XFx9L2AsIGkuZS4gTXVzdGFjaGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuZmllbGRTcGxpdHRlciBUaGUgc3RyaW5nIHRvIGJlIGV4cGVjdGVkIGFzIHRlbXBsYXRlIGZpZWxkIHNwbGl0dGVyLiBEZWZhdWx0IGlzIGB8YC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5qb2luVGV4dCBUaGUgc3RyaW5nIHRvIGJlIHVzZWQgd2hlbiB0aGUgZXh0cmFjdGVkIHZhbHVlIGZvciBhIHNpbmdsZSBjZWxsIGlzIGFuIGFycmF5LCBcbiAgICAgKiBhbmQgaXQgbmVlZHMgdG8gYmUgam9pbmVkLiBEZWZhdWx0IGlzIGAsYC5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgYW5kIHZhbHVlIGV4dHJhY3Rpb24uXG4gICAgICogVGhlcmUgaXMgb25lIGRlZmF1bHQgLSB0aGUgZW1wdHkgb25lLCBmb3Igb2JqZWN0IGtleSBleHRyYWN0aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFjY2Vzc29yLCBvcHRzKSB7XG4gICAgICAgIHRoaXMuX29wdHMgPSBfLmRlZmF1bHRzRGVlcCh7fSwgb3B0cywgZGVmYXVsdE9wdHMpO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9hY2Nlc3MgPSBhY2Nlc3NvcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXR0ZXIvZ2V0dGVyIGZvciBYbHN4RGF0YUZpbGwncyBvcHRpb25zIGFzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uLlxuICAgICAqIEBwYXJhbSB7e318bnVsbH0gbmV3T3B0cyBJZiBzZXQgLSB0aGUgbmV3IG9wdGlvbnMgdG8gYmUgdXNlZC4gXG4gICAgICogQHNlZSB7QGNvbnN0cnVjdG9yfS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfHt9fSBUaGUgcmVxdWlyZWQgb3B0aW9ucyAoaW4gZ2V0dGVyIG1vZGUpIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0dGVyIG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWFpbiBlbnRyeSBwb2ludCBmb3Igd2hvbGUgZGF0YSBwb3B1bGF0aW9uIG1lY2hhbmlzbS5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIHRvIGJlIGFwcGxpZWQuXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbH0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgZmlsbERhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBkYXRhRmlsbHMgPSB7fTtcblx0XG4gICAgICAgIC8vIEJ1aWxkIHRoZSBkZXBlbmRlbmN5IGNvbm5lY3Rpb25zIGJldHdlZW4gdGVtcGxhdGVzLlxuICAgICAgICB0aGlzLmNvbGxlY3RUZW1wbGF0ZXModGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYUZpbGwgPSB7ICBcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUsIFxuICAgICAgICAgICAgICAgIGRlcGVuZGVudHM6IFtdLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUucmVmZXJlbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmRmlsbCA9IGRhdGFGaWxsc1t0ZW1wbGF0ZS5yZWZlcmVuY2VdO1xuICAgICAgICAgICAgICAgIGlmICghcmVmRmlsbClcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBhIHJlZmVyZW5jZSAnJHt0ZW1wbGF0ZS5yZWZlcmVuY2V9JyFgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZWZGaWxsLmRlcGVuZGVudHMucHVzaChhRmlsbCk7XG4gICAgICAgICAgICAgICAgYUZpbGwub2Zmc2V0ID0gdGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZShyZWZGaWxsLnRlbXBsYXRlLmNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgZGF0YUZpbGxzW3RoaXMuX2FjY2Vzcy5jZWxsUmVmKHRlbXBsYXRlLmNlbGwpXSA9IGFGaWxsO1xuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLy8gQXBwbHkgZWFjaCBmaWxsIG9udG8gdGhlIHNoZWV0LlxuICAgICAgICBfLmVhY2goZGF0YUZpbGxzLCBmaWxsID0+IHtcbiAgICAgICAgICAgIGlmICghZmlsbC5wcm9jZXNzZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUZpbGwoZmlsbCwgZGF0YSwgZmlsbC50ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBwcm92aWRlZCBoYW5kbGVyIGZyb20gdGhlIG1hcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGFuZGxlck5hbWUgVGhlIG5hbWUgb2YgdGhlIGhhbmRsZXIuXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufSBUaGUgaGFuZGxlciBmdW5jdGlvbiBpdHNlbGYuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGdldEhhbmRsZXIoaGFuZGxlck5hbWUpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlckZuID0gdGhpcy5fb3B0cy5jYWxsYmFja3NNYXBbaGFuZGxlck5hbWVdO1xuXG4gICAgICAgIGlmICghaGFuZGxlckZuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgY2Fubm90IGJlIGZvdW5kIWApO1xuICAgICAgICBlbHNlIGlmICh0eXBlb2YgaGFuZGxlckZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIYW5kbGVyICcke2hhbmRsZXJOYW1lfScgaXMgbm90IGEgZnVuY3Rpb24hYCk7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlckZuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwYXJzZUV4dHJhY3RvcihleHRyYWN0b3IpIHtcbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IGV4dHJhY3RQYXJ0cyA9IGV4dHJhY3Rvci5zcGxpdChcIjpcIiksXG4gICAgICAgICAgICBoYW5kbGVyTmFtZSA9IGV4dHJhY3RQYXJ0c1sxXTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dHJhY3RQYXJ0c1swXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiB0aGlzLmdldEhhbmRsZXIoaGFuZGxlck5hbWUpXG4gICAgICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIHN0eWxlIHBhcnQgb2YgdGhlIHRlbXBsYXRlIG9udG8gYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgZGVzdGluYXRpb24gY2VsbCB0byBhcHBseSBzdHlsaW5nIHRvLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgY2h1bmsgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gYmUgdXNlZCBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtEYXRhRmlsbGVyfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gdGVtcGxhdGUuc3R5bGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0eWxlcyAmJiBkYXRhKSB7XG4gICAgICAgICAgICBfLmVhY2goc3R5bGVzLCBwYWlyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoXy5zdGFydHNXaXRoKHBhaXIubmFtZSwgXCI6XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SGFuZGxlcihwYWlyLm5hbWUuc3Vic3RyKDEpKS5jYWxsKHRoaXMuX29wdHMsIGRhdGEsIGNlbGwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0U3R5bGUoY2VsbCwgcGFpci5uYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBjb250ZW50cyBvZiB0aGUgY2VsbCBpbnRvIGEgdmFsaWQgdGVtcGxhdGUgaW5mby5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgY29udGFpbmluZyB0aGUgdGVtcGxhdGUgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHt7fX0gVGhlIHBhcnNlZCB0ZW1wbGF0ZS5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgYnVpbGRzIHRlbXBsYXRlIGluZm8sIHRha2luZyBpbnRvIGFjY291bnQgdGhlIHN1cHBsaWVkIG9wdGlvbnMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlVGVtcGxhdGUoY2VsbCkge1xuICAgICAgICAvLyBUaGUgb3B0aW9ucyBhcmUgaW4gYHRoaXNgIGFyZ3VtZW50LlxuICAgICAgICBjb25zdCByZU1hdGNoID0gKHRoaXMuX2FjY2Vzcy5jZWxsVmFsdWUoY2VsbCkgfHwgJycpLm1hdGNoKHRoaXMuX29wdHMudGVtcGxhdGVSZWdFeHApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZU1hdGNoKSByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICR7cmVNYXRjaFswXX1gKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVmZXJlbmNlOiB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pLFxuICAgICAgICAgICAgaXRlcmF0b3JzOiBwYXJ0c1sxXS5zcGxpdCgveHxcXCovKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGV4dHJhY3RvcjogcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFsbFRlbXBsYXRlc1xuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGIuY2VsbCkgPyAxIDogYi5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYS5jZWxsKSA/IC0xIDogMClcbiAgICAgICAgICAgIC5mb3JFYWNoKGNiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyB0aGUgdmFsdWUocykgZnJvbSB0aGUgcHJvdmlkZWQgZGF0YSBgcm9vdGAgdG8gYmUgc2V0IGluIHRoZSBwcm92aWRlZCBgY2VsbGAuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIGV4dHJhY3RlZCB2YWx1ZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBleHRyYWN0aW9uIHN0cmluZyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuIFVzdWFsbHkgYSBKU09OIHBhdGggd2l0aGluIHRoZSBkYXRhIGByb290YC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSByZWZlcmVuY2UgY2VsbCwgaWYgc3VjaCBleGlzdHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xBcnJheXxBcnJheS48QXJyYXkuPCo+Pn0gVGhlIHZhbHVlIHRvIGJlIHVzZWQuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGlzIHVzZWQgZXZlbiB3aGVuIGEgd2hvbGUgLSBwb3NzaWJseSByZWN0YW5ndWxhciAtIHJhbmdlIGlzIGFib3V0IHRvIGJlIHNldCwgc28gaXQgY2FuXG4gICAgICogcmV0dXJuIGFuIGFycmF5IG9mIGFycmF5cy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdFZhbHVlcyhyb290LCBleHRyYWN0b3IsIGNlbGwpIHtcbiAgICAgICAgY29uc3QgeyBwYXRoLCBoYW5kbGVyIH0gPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcik7XG5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJvb3QpKVxuICAgICAgICAgICAgcm9vdCA9IF8uZ2V0KHJvb3QsIHBhdGgsIHJvb3QpO1xuICAgICAgICBlbHNlIGlmIChyb290LnNpemVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByb290ID0gIWV4dHJhY3RvciA/IHJvb3QgOiBfLm1hcChyb290LCBlbnRyeSA9PiB0aGlzLmV4dHJhY3RWYWx1ZXMoZW50cnksIGV4dHJhY3RvciwgY2VsbCkpO1xuICAgICAgICBlbHNlIGlmICghaGFuZGxlcilcbiAgICAgICAgICAgIHJldHVybiByb290LmpvaW4odGhpcy5fb3B0cy5qb2luVGV4dCB8fCBcIixcIik7XG5cbiAgICAgICAgcmV0dXJuICFoYW5kbGVyID8gcm9vdCA6IGhhbmRsZXIuY2FsbCh0aGlzLl9vcHRzLCByb290LCBjZWxsKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBhbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGRhdGEgZm9yIHRoZSBnaXZlbiBmaWxsLCBiYXNlZCBvbiB0aGUgZ2l2ZW5cbiAgICAgKiByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBtYWluIHJlZmVyZW5jZSBvYmplY3QgdG8gYXBwbHkgaXRlcmF0b3JzIHRvLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGl0ZXJhdG9ycyBMaXN0IG9mIGl0ZXJhdG9ycyAtIHN0cmluZyBKU09OIHBhdGhzIGluc2lkZSB0aGUgcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCBUaGUgaW5kZXggaW4gdGhlIGl0ZXJhdG9ycyBhcnJheSB0byB3b3JrIG9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxBcnJheS48QXJyYXk+fSBBbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGV4dHJhY3RlZCBkYXRhLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0RGF0YShyb290LCBpdGVyYXRvcnMsIGlkeCkge1xuICAgICAgICBsZXQgaXRlciA9IGl0ZXJhdG9yc1tpZHhdLFxuICAgICAgICAgICAgc2l6ZXMgPSBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSBmYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuXG4gICAgICAgIGlmIChpdGVyID09ICcxJykge1xuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBpdGVyID0gaXRlcmF0b3JzWysraWR4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXRlcikgcmV0dXJuIHJvb3Q7XG5cbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IHBhcnNlZEl0ZXIgPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGl0ZXIpO1xuXG4gICAgICAgIGRhdGEgPSBfLmdldChyb290LCBwYXJzZWRJdGVyLnBhdGgsIHJvb3QpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRJdGVyLmhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICBkYXRhID0gcGFyc2VkSXRlci5oYW5kbGVyLmNhbGwodGhpcy5fb3B0cywgZGF0YSk7XG5cbiAgICAgICAgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcztcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKGNlbGwsIHZhbHVlKVxuICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBfLmNodW5rKGRhdGEsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoY2VsbCwgdmFsdWVbcmldW2NpXSlcbiAgICAgICAgICAgICAgICAgICAgLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKVxuICAgICAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhW3JpXVtjaV0sIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogRGVhbCB3aXRoIG1vcmUgdGhhbiAzIGRpbWVuc2lvbnMgY2FzZS5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWVzIGV4dHJhY3RlZCB3aXRoICcke3RlbXBsYXRlLmV4dHJhY3Rvcn0gYXJlIG1vcmUgdGhhbiAyIGRpbWVuc2lvbiEnYCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHRoZSBnaXZlbiBmaWx0ZXIgb250byB0aGUgc2hlZXQgLSBleHRyYWN0aW5nIHRoZSBwcm9wZXIgZGF0YSwgZm9sbG93aW5nIGRlcGVuZGVudCBmaWxscywgZXRjLlxuICAgICAqIEBwYXJhbSB7e319IGFGaWxsIFRoZSBmaWxsIHRvIGJlIGFwcGxpZWQsIGFzIGNvbnN0cnVjdGVkIGluIHRoZSB7QGxpbmsgZmlsbERhdGF9IG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgdXNlZCBmb3IgZGF0YSBleHRyYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gbWFpbkNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIGRhdGEgcGxhY2VtZW50IHByb2NlZHVyZS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBzaXplIG9mIHRoZSBkYXRhIHB1dCBpbiBbcm93LCBjb2xdIGZvcm1hdC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgYXBwbHlGaWxsKGFGaWxsLCByb290LCBtYWluQ2VsbCkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGFGaWxsLnRlbXBsYXRlLFxuICAgICAgICAgICAgdGhlRGF0YSA9IHRoaXMuZXh0cmFjdERhdGEocm9vdCwgdGVtcGxhdGUuaXRlcmF0b3JzLCAwKTtcblxuICAgICAgICBsZXQgZW50cnlTaXplID0gWzEsIDFdO1xuXG4gICAgICAgIGlmICghYUZpbGwuZGVwZW5kZW50cyB8fCAhYUZpbGwuZGVwZW5kZW50cy5sZW5ndGgpXG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0aGlzLnB1dFZhbHVlcyhtYWluQ2VsbCwgdGhlRGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXh0Q2VsbCA9IG1haW5DZWxsO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZU1heHhlciA9ICh2YWwsIGlkeCkgPT4gZW50cnlTaXplW2lkeF0gPSBNYXRoLm1heChlbnRyeVNpemVbaWR4XSwgdmFsKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCB0aGVEYXRhLmxlbmd0aDsgKytkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5Sb290ID0gdGhlRGF0YVtkXTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYUZpbGwuZGVwZW5kZW50cy5sZW5ndGg7ICsrZikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbkZpbGwgPSBhRmlsbC5kZXBlbmRlbnRzW2ZdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5DZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIGluRmlsbC5vZmZzZXRbMF0sIGluRmlsbC5vZmZzZXRbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5uZXJTaXplID0gdGhpcy5hcHBseUZpbGwoaW5GaWxsLCBpblJvb3QsIGluQ2VsbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKGlubmVyU2l6ZSwgc2l6ZU1heHhlcik7XG4gICAgICAgICAgICAgICAgICAgIGluRmlsbC5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRoZSBpbm5lciBkYXRhIHB1dCBhbmQgdGhlIHNpemUgY2FsY3VsYXRlZC5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2godGhpcy5wdXRWYWx1ZXMobmV4dENlbGwsIGluUm9vdCwgdGVtcGxhdGUpLCBzaXplTWF4eGVyKTtcblxuICAgICAgICAgICAgICAgIGxldCByb3dPZmZzZXQgPSBlbnRyeVNpemVbMF0sXG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IGVudHJ5U2l6ZVsxXTtcblxuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBncm93IG9ubHkgb24gb25lIGRpbWVuc2lvbi5cbiAgICAgICAgICAgICAgICBpZiAodGhlRGF0YS5zaXplc1swXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcm93T2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzFdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMF0gPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyb3dPZmZzZXQgPiAxIHx8IGNvbE9mZnNldCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm5nID0gdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShuZXh0Q2VsbCwgTWF0aC5tYXgocm93T2Zmc2V0IC0gMSwgMCksIE1hdGgubWF4KGNvbE9mZnNldCAtIDEsIDApKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzLnNldFJhbmdlTWVyZ2VkKHJuZywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJuZy5mb3JFYWNoKGNlbGwgPT4gdGhpcy5fYWNjZXNzLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGaW5hbGx5LCBjYWxjdWxhdGUgdGhlIG5leHQgY2VsbC5cbiAgICAgICAgICAgICAgICBuZXh0Q2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCByb3dPZmZzZXQgKyAodGVtcGxhdGUucGFkZGluZ1swXSB8fCAwKSwgY29sT2Zmc2V0ICsgKHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMCkpO1x0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5vdyByZWNhbGMgY29tYmluZWQgZW50cnkgc2l6ZS5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKG1haW5DZWxsLCBuZXh0Q2VsbCksIHNpemVNYXh4ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG59XG5cbi8qKlxuICogVGhlIGJ1aWx0LWluIGFjY2Vzc29yIGJhc2VkIG9uIHhsc3gtcG9wdWxhdGUgbnBtIG1vZHVsZVxuICogQHR5cGUge1hsc3hQb3B1bGF0ZUFjY2Vzc31cbiAqL1xuWGxzeERhdGFGaWxsLlhsc3hQb3B1bGF0ZUFjY2VzcyA9IHJlcXVpcmUoJy4vWGxzeFBvcHVsYXRlQWNjZXNzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeERhdGFGaWxsO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuLy8gY29uc3QgYWxsU3R5bGVzID0gW1xuLy8gICAgIFwiYm9sZFwiLCBcbi8vICAgICBcIml0YWxpY1wiLCBcbi8vICAgICBcInVuZGVybGluZVwiLCBcbi8vICAgICBcInN0cmlrZXRocm91Z2hcIiwgXG4vLyAgICAgXCJzdWJzY3JpcHRcIiwgXG4vLyAgICAgXCJzdXBlcnNjcmlwdFwiLCBcbi8vICAgICBcImZvbnRTaXplXCIsIFxuLy8gICAgIFwiZm9udEZhbWlseVwiLCBcbi8vICAgICBcImZvbnRHZW5lcmljRmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udFNjaGVtZVwiLCBcbi8vICAgICBcImZvbnRDb2xvclwiLCBcbi8vICAgICBcImhvcml6b250YWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJqdXN0aWZ5TGFzdExpbmVcIiwgXG4vLyAgICAgXCJpbmRlbnRcIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbEFsaWdubWVudFwiLCBcbi8vICAgICBcIndyYXBUZXh0XCIsIFxuLy8gICAgIFwic2hyaW5rVG9GaXRcIiwgXG4vLyAgICAgXCJ0ZXh0RGlyZWN0aW9uXCIsIFxuLy8gICAgIFwidGV4dFJvdGF0aW9uXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q291bnRlcmNsb2Nrd2lzZVwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENsb2Nrd2lzZVwiLCBcbi8vICAgICBcInJvdGF0ZVRleHRVcFwiLCBcbi8vICAgICBcInJvdGF0ZVRleHREb3duXCIsIFxuLy8gICAgIFwidmVydGljYWxUZXh0XCIsIFxuLy8gICAgIFwiZmlsbFwiLCBcbi8vICAgICBcImJvcmRlclwiLCBcbi8vICAgICBcImJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwiYm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyXCIsIFwicmlnaHRCb3JkZXJcIiwgXCJ0b3BCb3JkZXJcIiwgXCJib3R0b21Cb3JkZXJcIiwgXCJkaWFnb25hbEJvcmRlclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJDb2xvclwiLCBcInJpZ2h0Qm9yZGVyQ29sb3JcIiwgXCJ0b3BCb3JkZXJDb2xvclwiLCBcImJvdHRvbUJvcmRlckNvbG9yXCIsIFwiZGlhZ29uYWxCb3JkZXJDb2xvclwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJTdHlsZVwiLCBcInJpZ2h0Qm9yZGVyU3R5bGVcIiwgXCJ0b3BCb3JkZXJTdHlsZVwiLCBcImJvdHRvbUJvcmRlclN0eWxlXCIsIFwiZGlhZ29uYWxCb3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImRpYWdvbmFsQm9yZGVyRGlyZWN0aW9uXCIsIFxuLy8gICAgIFwibnVtYmVyRm9ybWF0XCJcbi8vIF07XG5cbmxldCBfUmljaFRleHQgPSBudWxsO1xuXG4vKipcbiAqIGB4c2x4LXBvcHVsYXRlYCBsaWJyYXJ5IGJhc2VkIGFjY2Vzc29yIHRvIGEgZ2l2ZW4gRXhjZWwgd29ya2Jvb2suIEFsbCB0aGVzZSBtZXRob2RzIGFyZSBpbnRlcm5hbGx5IHVzZWQgYnkge0BsaW5rIFhsc3hEYXRhRmlsbH0sIFxuICogYnV0IGNhbiBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciBpbXBsZW1lbnRpbmcgY3VzdG9tIHNwcmVhZHNoZWV0IGFjY2Vzc29ycy5cbiAqL1xuY2xhc3MgWGxzeFBvcHVsYXRlQWNjZXNzIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hTbWFydFRlbXBsYXRlIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge1dvcmtib29rfSB3b3JrYm9vayAtIFRoZSB3b3JrYm9vayB0byBiZSBhY2Nlc3NlZC5cbiAgICAgKiBAcGFyYW0ge1hsc3hQb3B1bGF0ZX0gWGxzeFBvcHVsYXRlIC0gVGhlIGFjdHVhbCB4bHN4LXBvcHVsYXRlIGxpYnJhcnkgb2JqZWN0LlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgYFhsc3hQb3B1bGF0ZWAgb2JqZWN0IG5lZWQgdG8gYmUgcGFzc2VkIGluIG9yZGVyIHRvIGV4dHJhY3RcbiAgICAgKiBjZXJ0YWluIGluZm9ybWF0aW9uIGZyb20gaXQsIF93aXRob3V0XyByZWZlcnJpbmcgdGhlIHdob2xlIGxpYnJhcnksIHRodXNcbiAgICAgKiBhdm9pZGluZyBtYWtpbmcgdGhlIGB4bHN4LWRhdGFmaWxsYCBwYWNrYWdlIGEgZGVwZW5kZW5jeS5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3b3JrYm9vaywgWGxzeFBvcHVsYXRlKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rID0gd29ya2Jvb2s7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgXG4gICAgICAgIF9SaWNoVGV4dCA9IFhsc3hQb3B1bGF0ZS5SaWNoVGV4dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb25maWd1cmVkIHdvcmtib29rIGZvciBkaXJlY3QgWGxzeFBvcHVsYXRlIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7V29ya2Jvb2t9IFRoZSB3b3JrYm9vayBpbnZvbHZlZC5cbiAgICAgKi9cbiAgICB3b3JrYm9vaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmtib29rOyBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjZWxsIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCAtIFRoZSBjZWxsIHRvIHJldHJpZXZlIHRoZSB2YWx1ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIGNlbGwncyBjb250ZW50cy5cbiAgICAgKi9cbiAgICBjZWxsVmFsdWUoY2VsbCkge1xuICAgICAgICBjb25zdCB0aGVWYWx1ZSA9IGNlbGwudmFsdWUoKTtcbiAgICAgICAgcmV0dXJuIHRoZVZhbHVlIGluc3RhbmNlb2YgX1JpY2hUZXh0ID8gdGhlVmFsdWUudGV4dCgpIDogdGhlVmFsdWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVhc3VyZXMgdGhlIGRpc3RhbmNlLCBhcyBhIHZlY3RvciBiZXR3ZWVuIHR3byBnaXZlbiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGZyb20gVGhlIGZpcnN0IGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSB0byBUaGUgc2Vjb25kIGNlbGwuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSB0d28gY2VsbHMuXG4gICAgICovXG4gICAgY2VsbERpc3RhbmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB0by5yb3dOdW1iZXIoKSAtIGZyb20ucm93TnVtYmVyKCksXG4gICAgICAgICAgICB0by5jb2x1bW5OdW1iZXIoKSAtIGZyb20uY29sdW1uTnVtYmVyKClcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIGNlbGwsIHRha2luZyBpbnRvIGFjY291bnQgaWYgaXQgaXMgcGFydCBvZiBhIG1lcmdlZCByYW5nZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgb2NjdXBpZWQgc2l6ZS5cbiAgICAgKi9cbiAgICBjZWxsU2l6ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IGNlbGxBZGRyID0gY2VsbC5hZGRyZXNzKCk7XG4gICAgICAgIGxldCB0aGVTaXplID0gWzEsIDFdO1xuICAgIFxuICAgICAgICBfLmZvckVhY2goY2VsbC5zaGVldCgpLl9tZXJnZUNlbGxzLCByYW5nZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByYW5nZUFkZHIgPSByYW5nZS5hdHRyaWJ1dGVzLnJlZi5zcGxpdChcIjpcIik7XG4gICAgICAgICAgICBpZiAocmFuZ2VBZGRyWzBdID09IGNlbGxBZGRyKSB7XG4gICAgICAgICAgICAgICAgdGhlU2l6ZSA9IHRoaXMuY2VsbERpc3RhbmNlKGNlbGwsIGNlbGwuc2hlZXQoKS5jZWxsKHJhbmdlQWRkclsxXSkpO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVswXTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgcmV0dXJuIHRoZVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlZmVyZW5jZSBJZCBmb3IgYSBnaXZlbiBjZWxsLCBiYXNlZCBvbiBpdHMgc2hlZXQgYW5kIGFkZHJlc3MuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGNyZWF0ZSBhIHJlZmVyZW5jZSBJZCB0by5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgaWQgdG8gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgdGhpcyBjZWxsLlxuICAgICAqL1xuICAgIGNlbGxSZWYoY2VsbCkge1xuICAgICAgICByZXR1cm4gY2VsbC5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhIHJlZmVyZW5jZSBzdHJpbmcgZm9yIGEgY2VsbCBpZGVudGlmaWVkIGJ5IEBwYXJhbSBhZHIsIGZyb20gdGhlIEBwYXJhbSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIGNlbGwgdGhhdCBpcyBhIGJhc2Ugb2YgdGhlIHJlZmVyZW5jZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRyIFRoZSBhZGRyZXNzIG9mIHRoZSB0YXJnZXQgY2VsbCwgYXMgbWVudGlvbmVkIGluIEBwYXJhbSBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEEgcmVmZXJlbmNlIHN0cmluZyBpZGVudGlmeWluZyB0aGUgdGFyZ2V0IGNlbGwgdW5pcXVlbHkuXG4gICAgICovXG4gICAgYnVpbGRSZWYoY2VsbCwgYWRyKSB7XG4gICAgICAgIHJldHVybiBhZHIgPyBjZWxsLnNoZWV0KCkuY2VsbChhZHIpLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB0cnVlIH0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYSBnaXZlbiBjZWxsIGZyb20gYSBnaXZlbiBzaGVldCAob3IgYW4gYWN0aXZlIG9uZSkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fGFycmF5fSBhZGRyZXNzIFRoZSBjZWxsIGFkcmVzcyB0byBiZSB1c2VkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8aWR4fSBzaGVldElkIFRoZSBpZC9uYW1lIG9mIHRoZSBzaGVldCB0byByZXRyaWV2ZSB0aGUgY2VsbCBmcm9tLiBEZWZhdWx0cyB0byBhbiBhY3RpdmUgb25lLlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBBIHJlZmVyZW5jZSB0byB0aGUgcmVxdWlyZWQgY2VsbC5cbiAgICAgKi9cbiAgICBnZXRDZWxsKGFkZHJlc3MsIHNoZWV0SWQpIHtcbiAgICAgICAgY29uc3QgdGhlU2hlZXQgPSBzaGVldElkID09IG51bGwgPyB0aGlzLl93b3JrYm9vay5hY3RpdmVTaGVldCgpIDogdGhpcy5fd29ya2Jvb2suc2hlZXQoc2hlZXRJZCk7XG4gICAgICAgIHJldHVybiB0aGVTaGVldC5jZWxsKGFkZHJlc3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYW5kIHJldHVybnMgdGhlIHJhbmdlIHN0YXJ0aW5nIGZyb20gdGhlIGdpdmVuIGNlbGwgYW5kIHNwYXduaW5nIGdpdmVuIHJvd3MgYW5kIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBvZiB0aGUgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHJvd09mZnNldCBOdW1iZXIgb2Ygcm93cyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSByb3cuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvbE9mZnNldCBOdW1iZXIgb2YgY29sdW1ucyBhd2F5IGZyb20gdGhlIHN0YXJ0aW5nIGNlbGwuIDAgbWVhbnMgc2FtZSBjb2x1bW4uXG4gICAgICogQHJldHVybnMge1JhbmdlfSBUaGUgY29uc3RydWN0ZWQgcmFuZ2UuXG4gICAgICovXG4gICAgZ2V0Q2VsbFJhbmdlKGNlbGwsIHJvd09mZnNldCwgY29sT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJhbmdlVG8oY2VsbC5yZWxhdGl2ZUNlbGwocm93T2Zmc2V0LCBjb2xPZmZzZXQpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBjZWxsIGF0IGEgY2VydGFpbiBvZmZzZXQgZnJvbSBhIGdpdmVuIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHJlZmVyZW5jZSBjZWxsIHRvIG1ha2UgdGhlIG9mZnNldCBmcm9tLlxuICAgICAqIEBwYXJhbSB7aW50fSByb3dzIE51bWJlciBvZiByb3dzIHRvIG9mZnNldC5cbiAgICAgKiBAcGFyYW0ge2ludH0gY29scyBOdW1iZXIgb2YgY29sdW1ucyB0byBvZmZzZXQuXG4gICAgICogQHJldHVybnMge0NlbGx9IFRoZSByZXN1bHRpbmcgY2VsbC5cbiAgICAgKi9cbiAgICBvZmZzZXRDZWxsKGNlbGwsIHJvd3MsIGNvbHMpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmVsYXRpdmVDZWxsKHJvd3MsIGNvbHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lcmdlIG9yIHNwbGl0IHJhbmdlIG9mIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7UmFuZ2V9IHJhbmdlIFRoZSByYW5nZSwgYXMgcmV0dXJuZWQgZnJvbSB7QGxpbmsgZ2V0Q2VsbFJhbmdlfVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdHVzIFRoZSBtZXJnZWQgc3RhdHVzIHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBzZXRSYW5nZU1lcmdlZChyYW5nZSwgc3RhdHVzKSB7XG4gICAgICAgIHJhbmdlLm1lcmdlZChzdGF0dXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJdGVyYXRlIG92ZXIgYWxsIHVzZWQgY2VsbHMgb2YgdGhlIGdpdmVuIHdvcmtib29rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggYGNlbGxgIGFyZ3VtZW50IGZvciBlYWNoIHVzZWQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgY2hhaW4gaW52b2tlcy5cbiAgICAgKi9cbiAgICBmb3JBbGxDZWxscyhjYikge1xuICAgICAgICB0aGlzLl93b3JrYm9vay5zaGVldHMoKS5mb3JFYWNoKHNoZWV0ID0+IHNoZWV0LnVzZWRSYW5nZSgpLmZvckVhY2goY2IpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29waWVzIHRoZSBzdHlsZXMgZnJvbSBgc3JjYCBjZWxsIHRvIHRoZSBgZGVzdGAtaW5hdGlvbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IERlc3RpbmF0aW9uIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgU291cmNlIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVN0eWxlKGRlc3QsIHNyYykge1xuICAgICAgICBpZiAoc3JjID09IGRlc3QpIHJldHVybiB0aGlzO1xuXG4gICAgICAgIGlmIChzcmMuX3N0eWxlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnN0eWxlKHNyYy5fc3R5bGUpO1xuICAgICAgICBlbHNlIGlmIChzcmMuX3N0eWxlSWQgPiAwKVxuICAgICAgICAgICAgZGVzdC5fc3R5bGVJZCA9IHNyYy5fc3R5bGVJZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2l6ZSB0aGUgY29sdW1uIGFuZCByb3cgb2YgdGhlIGRlc3RpbmF0aW9uIGNlbGwsIGlmIG5vdCBjaGFuZ2VkIGFscmVhZHkuXG4gICAgICogQHBhcmFtIHtDZWxsfSBkZXN0IFRoZSBkZXN0aW5hdGlvbiBjZWxsIHdoaWNoIHJvdyBhbmQgY29sdW1uIHRvIHJlc2l6ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBUaGUgc291cmNlICh0ZW1wbGF0ZSkgY2VsbCB0byB0YWtlIHRoZSBzaXplIGZyb20uXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgY29weVNpemUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGRlc3Qucm93TnVtYmVyKCksXG4gICAgICAgICAgICBjb2wgPSBkZXN0LmNvbHVtbk51bWJlcigpO1xuXG4gICAgICAgIGlmICh0aGlzLl9yb3dTaXplc1tyb3ddID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LnJvdygpLmhlaWdodCh0aGlzLl9yb3dTaXplc1tyb3ddID0gc3JjLnJvdygpLmhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLl9jb2xTaXplc1tjb2xdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkZXN0LmNvbHVtbigpLndpZHRoKHRoaXMuX2NvbFNpemVzW2NvbF0gPSBzcmMuY29sdW1uKCkud2lkdGgoKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIHZhbHVlIGluIHRoZSBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVGhlIHN0cmluZyB2YWx1ZSB0byBiZSBzZXQgaW5zaWRlLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHNldFZhbHVlKGNlbGwsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwudmFsdWUodmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbmFtZWQgc3R5bGUgb2YgYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBvcGVyYXRlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgc3R5bGUgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIGZvciB0aGlzIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRTdHlsZShjZWxsLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnN0eWxlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hQb3B1bGF0ZUFjY2VzcztcbiJdfQ==
