(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

var XlsxDataFill =
/*#__PURE__*/
function () {
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
            _this2.getHandler(pair.name.substr(1))(data, cell, _this2._opts);
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
      return !handler ? root : handler(root, cell, this._opts);
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
      if (typeof parsedIter.handler === 'function') data = parsedIter.handler.call(null, data, null, this._opts);

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
        } else if (entrySize.length == 1) {
          entrySize = entrySize.concat([1]);
          value = _2.chunk(value, 1);
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


          nextCell = this._access.offsetCell(nextCell, rowOffset + template.padding[0], colOffset + template.padding[1] || 0);
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

var XlsxPopulateAccess =
/*#__PURE__*/
function () {
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTs7Ozs7Ozs7OztBQUVBLElBQU0sRUFBQyxHQUFHLE9BQU8sQ0FBQyxRQUFELENBQWpCOztBQUVBLElBQU0sV0FBVyxHQUFHO0FBQ2hCLEVBQUEsY0FBYyxFQUFFLElBQUksTUFBSixDQUFXLGlCQUFYLENBREE7QUFFaEIsRUFBQSxhQUFhLEVBQUUsR0FGQztBQUdoQixFQUFBLFFBQVEsRUFBRSxHQUhNO0FBSWhCLEVBQUEsWUFBWSxFQUFFO0FBQ1YsUUFBSSxXQUFBLElBQUk7QUFBQSxhQUFJLEVBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxDQUFKO0FBQUE7QUFERTtBQUpFLENBQXBCO0FBU0E7Ozs7SUFHTSxZOzs7QUFDRjs7Ozs7Ozs7Ozs7O0FBWUEsd0JBQVksUUFBWixFQUFzQixJQUF0QixFQUE0QjtBQUFBOztBQUN4QixTQUFLLEtBQUwsR0FBYSxFQUFDLENBQUMsWUFBRixDQUFlLEVBQWYsRUFBbUIsSUFBbkIsRUFBeUIsV0FBekIsQ0FBYjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssU0FBTCxHQUFpQixFQUFqQjtBQUNBLFNBQUssT0FBTCxHQUFlLFFBQWY7QUFDSDtBQUVEOzs7Ozs7Ozs7OzRCQU1RLE8sRUFBUztBQUNiLFVBQUksT0FBTyxLQUFLLElBQWhCLEVBQXNCO0FBQ2xCLFFBQUEsRUFBQyxDQUFDLEtBQUYsQ0FBUSxLQUFLLEtBQWIsRUFBb0IsT0FBcEI7O0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FIRCxNQUlJLE9BQU8sS0FBSyxLQUFaO0FBQ1A7QUFFRDs7Ozs7Ozs7NkJBS1MsSSxFQUFNO0FBQUE7O0FBQ1gsVUFBTSxTQUFTLEdBQUcsRUFBbEIsQ0FEVyxDQUdYOztBQUNBLFdBQUssZ0JBQUws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OiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxuY29uc3QgZGVmYXVsdE9wdHMgPSB7XG4gICAgdGVtcGxhdGVSZWdFeHA6IG5ldyBSZWdFeHAoL1xce1xceyhbXn1dKilcXH1cXH0vKSxcbiAgICBmaWVsZFNwbGl0dGVyOiBcInxcIixcbiAgICBqb2luVGV4dDogXCIsXCIsXG4gICAgY2FsbGJhY2tzTWFwOiB7XG4gICAgICAgIFwiXCI6IGRhdGEgPT4gXy5rZXlzKGRhdGEpXG4gICAgfVxufTtcblxuLyoqXG4gKiBEYXRhIGZpbGwgZW5naW5lLCB0YWtpbmcgYW4gaW5zdGFuY2Ugb2YgRXhjZWwgc2hlZXQgYWNjZXNzb3IgYW5kIGEgSlNPTiBvYmplY3QgYXMgZGF0YSwgYW5kIGZpbGxpbmcgdGhlIHZhbHVlcyBmcm9tIHRoZSBsYXR0ZXIgaW50byB0aGUgZm9ybWVyLlxuICovXG5jbGFzcyBYbHN4RGF0YUZpbGwge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeERhdGFGaWxsIHdpdGggZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYWNjZXNzb3IgQW4gaW5zdGFuY2Ugb2YgWExTWCBzcHJlYWRzaGVldCBhY2Nlc3NpbmcgY2xhc3MuXG4gICAgICogQHBhcmFtIHt7fX0gb3B0cyBPcHRpb25zIHRvIGJlIHVzZWQgZHVyaW5nIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IG9wdHMudGVtcGxhdGVSZWdFeHAgVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB1c2VkIGZvciB0ZW1wbGF0ZSByZWNvZ25pemluZy4gXG4gICAgICogRGVmYXVsdCBpcyBgL1xce1xceyhbXn1dKilcXH1cXH0vYCwgaS5lLiBNdXN0YWNoZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5maWVsZFNwbGl0dGVyIFRoZSBzdHJpbmcgdG8gYmUgZXhwZWN0ZWQgYXMgdGVtcGxhdGUgZmllbGQgc3BsaXR0ZXIuIERlZmF1bHQgaXMgYHxgLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmpvaW5UZXh0IFRoZSBzdHJpbmcgdG8gYmUgdXNlZCB3aGVuIHRoZSBleHRyYWN0ZWQgdmFsdWUgZm9yIGEgc2luZ2xlIGNlbGwgaXMgYW4gYXJyYXksIFxuICAgICAqIGFuZCBpdCBuZWVkcyB0byBiZSBqb2luZWQuIERlZmF1bHQgaXMgYCxgLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gb3B0cy5jYWxsYmFja3NNYXAgQSBtYXAgb2YgaGFuZGxlcnMgdG8gYmUgdXNlZCBmb3IgZGF0YSBhbmQgdmFsdWUgZXh0cmFjdGlvbi5cbiAgICAgKiBUaGVyZSBpcyBvbmUgZGVmYXVsdCAtIHRoZSBlbXB0eSBvbmUsIGZvciBvYmplY3Qga2V5IGV4dHJhY3Rpb24uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYWNjZXNzb3IsIG9wdHMpIHtcbiAgICAgICAgdGhpcy5fb3B0cyA9IF8uZGVmYXVsdHNEZWVwKHt9LCBvcHRzLCBkZWZhdWx0T3B0cyk7XG4gICAgICAgIHRoaXMuX3Jvd1NpemVzID0ge307XG4gICAgICAgIHRoaXMuX2NvbFNpemVzID0ge307XG4gICAgICAgIHRoaXMuX2FjY2VzcyA9IGFjY2Vzc29yO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHRlci9nZXR0ZXIgZm9yIFhsc3hEYXRhRmlsbCdzIG9wdGlvbnMgYXMgc2V0IGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAgICogQHBhcmFtIHt7fXxudWxsfSBuZXdPcHRzIElmIHNldCAtIHRoZSBuZXcgb3B0aW9ucyB0byBiZSB1c2VkLiBcbiAgICAgKiBAc2VlIHtAY29uc3RydWN0b3J9LlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx8e319IFRoZSByZXF1aXJlZCBvcHRpb25zIChpbiBnZXR0ZXIgbW9kZSkgb3IgWGxzeERhdGFGaWxsIChpbiBzZXR0ZXIgbW9kZSkgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIG9wdGlvbnMobmV3T3B0cykge1xuICAgICAgICBpZiAobmV3T3B0cyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXy5tZXJnZSh0aGlzLl9vcHRzLCBuZXdPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB3aG9sZSBkYXRhIHBvcHVsYXRpb24gbWVjaGFuaXNtLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgdG8gYmUgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBmaWxsRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGRhdGFGaWxscyA9IHt9O1xuXHRcbiAgICAgICAgLy8gQnVpbGQgdGhlIGRlcGVuZGVuY3kgY29ubmVjdGlvbnMgYmV0d2VlbiB0ZW1wbGF0ZXMuXG4gICAgICAgIHRoaXMuY29sbGVjdFRlbXBsYXRlcyh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhRmlsbCA9IHsgIFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSwgXG4gICAgICAgICAgICAgICAgZGVwZW5kZW50czogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICBcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWZGaWxsID0gZGF0YUZpbGxzW3RlbXBsYXRlLnJlZmVyZW5jZV07XG4gICAgICAgICAgICAgICAgaWYgKCFyZWZGaWxsKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGEgcmVmZXJlbmNlICcke3RlbXBsYXRlLnJlZmVyZW5jZX0nIWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlZkZpbGwuZGVwZW5kZW50cy5wdXNoKGFGaWxsKTtcbiAgICAgICAgICAgICAgICBhRmlsbC5vZmZzZXQgPSB0aGlzLl9hY2Nlc3MuY2VsbERpc3RhbmNlKHJlZkZpbGwudGVtcGxhdGUuY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICBkYXRhRmlsbHNbdGhpcy5fYWNjZXNzLmNlbGxSZWYodGVtcGxhdGUuY2VsbCldID0gYUZpbGw7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvLyBBcHBseSBlYWNoIGZpbGwgb250byB0aGUgc2hlZXQuXG4gICAgICAgIF8uZWFjaChkYXRhRmlsbHMsIGZpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKCFmaWxsLnByb2Nlc3NlZClcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RmlsbChmaWxsLCBkYXRhLCBmaWxsLnRlbXBsYXRlLmNlbGwpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHByb3ZpZGVkIGhhbmRsZXIgZnJvbSB0aGUgbWFwLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoYW5kbGVyTmFtZSBUaGUgbmFtZSBvZiB0aGUgaGFuZGxlci5cbiAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb259IFRoZSBoYW5kbGVyIGZ1bmN0aW9uIGl0c2VsZi5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSkge1xuICAgICAgICBjb25zdCBoYW5kbGVyRm4gPSB0aGlzLl9vcHRzLmNhbGxiYWNrc01hcFtoYW5kbGVyTmFtZV07XG5cbiAgICAgICAgaWYgKCFoYW5kbGVyRm4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBjYW5ub3QgYmUgZm91bmQhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyRm4gIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEhhbmRsZXIgJyR7aGFuZGxlck5hbWV9JyBpcyBub3QgYSBmdW5jdGlvbiFgKTtcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyRm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBwcm92aWRlZCBleHRyYWN0b3IgKG90IGl0ZXJhdG9yKSBzdHJpbmcgdG8gZmluZCBhIGNhbGxiYWNrIGlkIGluc2lkZSwgaWYgcHJlc2VudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBpdGVyYXRvci9leHRyYWN0b3Igc3RyaW5nIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gQSB7IGBwYXRoYCwgYGhhbmRsZXJgIH0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgSlNPTiBwYXRoXG4gICAgICogcmVhZHkgZm9yIHVzZSBhbmQgdGhlIHByb3ZpZGVkIGBoYW5kbGVyYCBfZnVuY3Rpb25fIC0gcmVhZHkgZm9yIGludm9raW5nLCBpZiBzdWNoIGlzIHByb3ZpZGVkLlxuICAgICAqIElmIG5vdCAtIHRoZSBgcGF0aGAgcHJvcGVydHkgY29udGFpbnMgdGhlIHByb3ZpZGVkIGBleHRyYWN0b3JgLCBhbmQgdGhlIGBoYW5kbGVyYCBpcyBgbnVsbGAuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcikge1xuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgZXh0cmFjdFBhcnRzID0gZXh0cmFjdG9yLnNwbGl0KFwiOlwiKSxcbiAgICAgICAgICAgIGhhbmRsZXJOYW1lID0gZXh0cmFjdFBhcnRzWzFdO1xuXG4gICAgICAgIHJldHVybiBleHRyYWN0UGFydHMubGVuZ3RoID09IDFcbiAgICAgICAgICAgID8geyBwYXRoOiBleHRyYWN0b3IsIGhhbmRsZXI6IG51bGwgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgcGF0aDogZXh0cmFjdFBhcnRzWzBdLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IHRoaXMuZ2V0SGFuZGxlcihoYW5kbGVyTmFtZSlcbiAgICAgICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyB0aGUgc3R5bGUgcGFydCBvZiB0aGUgdGVtcGxhdGUgb250byBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBkZXN0aW5hdGlvbiBjZWxsIHRvIGFwcGx5IHN0eWxpbmcgdG8uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSBjaHVuayBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byBiZSB1c2VkIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHJldHVybnMge0RhdGFGaWxsZXJ9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3R5bGVzICYmIGRhdGEpIHtcbiAgICAgICAgICAgIF8uZWFjaChzdHlsZXMsIHBhaXIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIjpcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRIYW5kbGVyKHBhaXIubmFtZS5zdWJzdHIoMSkpKGRhdGEsIGNlbGwsIHRoaXMuX29wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0U3R5bGUoY2VsbCwgcGFpci5uYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBjb250ZW50cyBvZiB0aGUgY2VsbCBpbnRvIGEgdmFsaWQgdGVtcGxhdGUgaW5mby5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgY29udGFpbmluZyB0aGUgdGVtcGxhdGUgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHt7fX0gVGhlIHBhcnNlZCB0ZW1wbGF0ZS5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgYnVpbGRzIHRlbXBsYXRlIGluZm8sIHRha2luZyBpbnRvIGFjY291bnQgdGhlIHN1cHBsaWVkIG9wdGlvbnMuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIHBhcnNlVGVtcGxhdGUoY2VsbCkge1xuICAgICAgICAvLyBUaGUgb3B0aW9ucyBhcmUgaW4gYHRoaXNgIGFyZ3VtZW50LlxuICAgICAgICBjb25zdCByZU1hdGNoID0gKHRoaXMuX2FjY2Vzcy5jZWxsVmFsdWUoY2VsbCkgfHwgJycpLm1hdGNoKHRoaXMuX29wdHMudGVtcGxhdGVSZWdFeHApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZU1hdGNoKSByZXR1cm4gbnVsbDtcbiAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSByZU1hdGNoWzFdLnNwbGl0KHRoaXMuX29wdHMuZmllbGRTcGxpdHRlcikubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgZW5vdWdoIGNvbXBvbmVudHMgb2YgdGhlIHRlbXBsYXRlICR7cmVNYXRjaFswXX1gKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVmZXJlbmNlOiB0aGlzLl9hY2Nlc3MuYnVpbGRSZWYoY2VsbCwgcGFydHNbMF0pLFxuICAgICAgICAgICAgaXRlcmF0b3JzOiBwYXJ0c1sxXS5zcGxpdCgveHxcXCovKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGV4dHJhY3RvcjogcGFydHNbMl0gfHwgXCJcIixcbiAgICAgICAgICAgIGNlbGw6IGNlbGwsXG4gICAgICAgICAgICBjZWxsU2l6ZTogdGhpcy5fYWNjZXNzLmNlbGxTaXplKGNlbGwpLFxuICAgICAgICAgICAgcGFkZGluZzogKHBhcnRzWzNdIHx8IFwiXCIpLnNwbGl0KC86fCx8eHxcXCovKS5tYXAodiA9PiBwYXJzZUludCh2KSB8fCAwKSxcbiAgICAgICAgICAgIHN0eWxlczogIXN0eWxlcyA/IG51bGwgOiBfLm1hcChzdHlsZXMsIHMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhaXIgPSBfLnRyaW0ocykuc3BsaXQoXCI9XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IF8udHJpbShwYWlyWzBdKSwgZXh0cmFjdG9yOiBfLnRyaW0ocGFpclsxXSkgfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VhcmNoZXMgdGhlIHdob2xlIHdvcmtib29rIGZvciB0ZW1wbGF0ZSBwYXR0ZXJuIGFuZCBjb25zdHJ1Y3RzIHRoZSB0ZW1wbGF0ZXMgZm9yIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCB0ZW1wbGF0ZWQsIGFmdGVyIHRoZXkgYXJlIHNvcnRlZC5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGUgdGVtcGxhdGVzIGNvbGxlY3RlZCBhcmUgc29ydGVkLCBiYXNlZCBvbiB0aGUgaW50cmEtdGVtcGxhdGUgcmVmZXJlbmNlIC0gaWYgb25lIHRlbXBsYXRlXG4gICAgICogaXMgcmVmZXJyaW5nIGFub3RoZXIgb25lLCBpdCdsbCBhcHBlYXIgX2xhdGVyXyBpbiB0aGUgcmV0dXJuZWQgYXJyYXksIHRoYW4gdGhlIHJlZmVycmVkIHRlbXBsYXRlLlxuICAgICAqIFRoaXMgaXMgdGhlIG9yZGVyIHRoZSBjYWxsYmFjayBpcyBiZWluZyBpbnZva2VkIG9uLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFsbFRlbXBsYXRlc1xuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGIuY2VsbCkgPyAxIDogYi5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYS5jZWxsKSA/IC0xIDogMClcbiAgICAgICAgICAgIC5mb3JFYWNoKGNiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyB0aGUgdmFsdWUocykgZnJvbSB0aGUgcHJvdmlkZWQgZGF0YSBgcm9vdGAgdG8gYmUgc2V0IGluIHRoZSBwcm92aWRlZCBgY2VsbGAuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIGV4dHJhY3RlZCB2YWx1ZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBleHRyYWN0aW9uIHN0cmluZyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuIFVzdWFsbHkgYSBKU09OIHBhdGggd2l0aGluIHRoZSBkYXRhIGByb290YC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSByZWZlcmVuY2UgY2VsbCwgaWYgc3VjaCBleGlzdHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xBcnJheXxBcnJheS48QXJyYXkuPCo+Pn0gVGhlIHZhbHVlIHRvIGJlIHVzZWQuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGlzIHVzZWQgZXZlbiB3aGVuIGEgd2hvbGUgLSBwb3NzaWJseSByZWN0YW5ndWxhciAtIHJhbmdlIGlzIGFib3V0IHRvIGJlIHNldCwgc28gaXQgY2FuXG4gICAgICogcmV0dXJuIGFuIGFycmF5IG9mIGFycmF5cy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdFZhbHVlcyhyb290LCBleHRyYWN0b3IsIGNlbGwpIHtcbiAgICAgICAgY29uc3QgeyBwYXRoLCBoYW5kbGVyIH0gPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcik7XG5cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJvb3QpKVxuICAgICAgICAgICAgcm9vdCA9IF8uZ2V0KHJvb3QsIHBhdGgsIHJvb3QpO1xuICAgICAgICBlbHNlIGlmIChyb290LnNpemVzICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByb290ID0gIWV4dHJhY3RvciA/IHJvb3QgOiBfLm1hcChyb290LCBlbnRyeSA9PiB0aGlzLmV4dHJhY3RWYWx1ZXMoZW50cnksIGV4dHJhY3RvciwgY2VsbCkpO1xuICAgICAgICBlbHNlIGlmICghaGFuZGxlcilcbiAgICAgICAgICAgIHJldHVybiByb290LmpvaW4odGhpcy5fb3B0cy5qb2luVGV4dCB8fCBcIixcIik7XG5cbiAgICAgICAgcmV0dXJuICFoYW5kbGVyID8gcm9vdCA6IGhhbmRsZXIocm9vdCwgY2VsbCwgdGhpcy5fb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgYW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBkYXRhIGZvciB0aGUgZ2l2ZW4gZmlsbCwgYmFzZWQgb24gdGhlIGdpdmVuXG4gICAgICogcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgbWFpbiByZWZlcmVuY2Ugb2JqZWN0IHRvIGFwcGx5IGl0ZXJhdG9ycyB0by5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBpdGVyYXRvcnMgTGlzdCBvZiBpdGVyYXRvcnMgLSBzdHJpbmcgSlNPTiBwYXRocyBpbnNpZGUgdGhlIHJvb3Qgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggVGhlIGluZGV4IGluIHRoZSBpdGVyYXRvcnMgYXJyYXkgdG8gd29yayBvbi5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl8QXJyYXkuPEFycmF5Pn0gQW4gYXJyYXkgKHBvc3NpYmx5IG9mIGFycmF5cykgd2l0aCBleHRyYWN0ZWQgZGF0YS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgZXh0cmFjdERhdGEocm9vdCwgaXRlcmF0b3JzLCBpZHgpIHtcbiAgICAgICAgbGV0IGl0ZXIgPSBpdGVyYXRvcnNbaWR4XSxcbiAgICAgICAgICAgIHNpemVzID0gW10sXG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gZmFsc2UsXG4gICAgICAgICAgICBkYXRhID0gbnVsbDtcblxuICAgICAgICBpZiAoaXRlciA9PSAnMScpIHtcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgaXRlciA9IGl0ZXJhdG9yc1srK2lkeF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWl0ZXIpIHJldHVybiByb290O1xuXG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBwYXJzZWRJdGVyID0gdGhpcy5wYXJzZUV4dHJhY3RvcihpdGVyKTtcblxuICAgICAgICBkYXRhID0gXy5nZXQocm9vdCwgcGFyc2VkSXRlci5wYXRoLCByb290KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcGFyc2VkSXRlci5oYW5kbGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgZGF0YSA9IHBhcnNlZEl0ZXIuaGFuZGxlci5jYWxsKG51bGwsIGRhdGEsIG51bGwsIHRoaXMuX29wdHMpO1xuXG4gICAgICAgIGlmIChpZHggPCBpdGVyYXRvcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgZGF0YSA9IF8ubWFwKGRhdGEsIGluUm9vdCA9PiB0aGlzLmV4dHJhY3REYXRhKGluUm9vdCwgaXRlcmF0b3JzLCBpZHggKyAxKSk7XG4gICAgICAgICAgICBzaXplcyA9IGRhdGFbMF0uc2l6ZXM7XG4gICAgICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YSkgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgICAgICAgZGF0YSA9IF8udmFsdWVzKGRhdGEpO1xuXG4gICAgICAgIC8vIFNvbWUgZGF0YSBzYW5pdHkgY2hlY2tzLlxuICAgICAgICBpZiAoIWRhdGEpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBpdGVyYXRvciAnJHtpdGVyfScgZXh0cmFjdGVkIG5vIGRhdGEhYCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGRhdGEgZXh0cmFjdGVkIGZyb20gaXRlcmF0b3IgJyR7aXRlcn0nIGlzIG5laXRoZXIgYW4gYXJyYXksIG5vciBvYmplY3QhYCk7XG5cbiAgICAgICAgc2l6ZXMudW5zaGlmdCh0cmFuc3Bvc2VkID8gLWRhdGEubGVuZ3RoIDogZGF0YS5sZW5ndGgpO1xuICAgICAgICBkYXRhLnNpemVzID0gc2l6ZXM7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1dCB0aGUgZGF0YSB2YWx1ZXMgaW50byB0aGUgcHJvcGVyIGNlbGxzLCB3aXRoIGNvcnJlY3QgZXh0cmFjdGVkIHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciB0aGUgZGF0YSB0byBiZSBwdXQuXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSBUaGUgYWN0dWFsIGRhdGEgdG8gYmUgcHV0LiBUaGUgdmFsdWVzIHdpbGwgYmUgX2V4dHJhY3RlZF8gZnJvbSBoZXJlIGZpcnN0LlxuICAgICAqIEBwYXJhbSB7e319IHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0aGF0IGlzIGJlaW5nIGltcGxlbWVudGVkIHdpdGggdGhhdCBkYXRhIGZpbGwuXG4gICAgICogQHJldHVybnMge0FycmF5fSBNYXRyaXggc2l6ZSB0aGF0IHRoaXMgZGF0YSBoYXMgb2NjdXBpZWQgb24gdGhlIHNoZWV0IFtyb3dzLCBjb2xzXS5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcHV0VmFsdWVzKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBkYXRhLnNpemVzLFxuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmV4dHJhY3RWYWx1ZXMoZGF0YSwgdGVtcGxhdGUuZXh0cmFjdG9yLCBjZWxsKTtcblxuICAgICAgICAvLyBtYWtlIHN1cmUsIHRoZSBcbiAgICAgICAgaWYgKCFlbnRyeVNpemUgfHwgIWVudHJ5U2l6ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzc1xuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShjZWxsLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpXG4gICAgICAgICAgICAgICAgLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICBlbnRyeVNpemUgPSB0ZW1wbGF0ZS5jZWxsU2l6ZTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgc2l6ZSBhbmQgZGF0YS5cbiAgICAgICAgICAgIGlmIChlbnRyeVNpemVbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gWzEsIC1lbnRyeVNpemVbMF1dO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgZW50cnlTaXplID0gZW50cnlTaXplLmNvbmNhdChbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gXy5jaHVuayh2YWx1ZSwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UoY2VsbCwgZW50cnlTaXplWzBdIC0gMSwgZW50cnlTaXplWzFdIC0gMSkuZm9yRWFjaCgoY2VsbCwgcmksIGNpKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShjZWxsLCB2YWx1ZVtyaV1bY2ldKVxuICAgICAgICAgICAgICAgICAgICAuY29weVN0eWxlKGNlbGwsIHRlbXBsYXRlLmNlbGwpXG4gICAgICAgICAgICAgICAgICAgIC5jb3B5U2l6ZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGFbcmldW2NpXSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBEZWFsIHdpdGggbW9yZSB0aGFuIDMgZGltZW5zaW9ucyBjYXNlLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZXMgZXh0cmFjdGVkIHdpdGggJyR7dGVtcGxhdGUuZXh0cmFjdG9yfSBhcmUgbW9yZSB0aGFuIDIgZGltZW5zaW9uISdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIHtAbGluayBmaWxsRGF0YX0gbWV0aG9kLlxuICAgICAqIEBwYXJhbSB7e319IHJvb3QgVGhlIGRhdGEgcm9vdCB0byBiZSB1c2VkIGZvciBkYXRhIGV4dHJhY3Rpb24uXG4gICAgICogQHBhcmFtIHtDZWxsfSBtYWluQ2VsbCBUaGUgc3RhcnRpbmcgY2VsbCBmb3IgZGF0YSBwbGFjZW1lbnQgcHJvY2VkdXJlLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHNpemUgb2YgdGhlIGRhdGEgcHV0IGluIFtyb3csIGNvbF0gZm9ybWF0LlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBpbm5lclNpemUgPSB0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goaW5uZXJTaXplLCBzaXplTWF4eGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaW5GaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVswXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJvd09mZnNldCA+IDEgfHwgY29sT2Zmc2V0ID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKG5leHRDZWxsLCBNYXRoLm1heChyb3dPZmZzZXQgLSAxLCAwKSwgTWF0aC5tYXgoY29sT2Zmc2V0IC0gMSwgMCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0UmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcm5nLmZvckVhY2goY2VsbCA9PiB0aGlzLl9hY2Nlc3MuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArIHRlbXBsYXRlLnBhZGRpbmdbMF0sIGNvbE9mZnNldCArIHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMCk7XHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHJlY2FsYyBjb21iaW5lZCBlbnRyeSBzaXplLlxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UobWFpbkNlbGwsIG5leHRDZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaGUgYnVpbHQtaW4gYWNjZXNzb3IgYmFzZWQgb24geGxzeC1wb3B1bGF0ZSBucG0gbW9kdWxlXG4gKiBAdHlwZSB7WGxzeFBvcHVsYXRlQWNjZXNzfVxuICovXG5YbHN4RGF0YUZpbGwuWGxzeFBvcHVsYXRlQWNjZXNzID0gcmVxdWlyZSgnLi9YbHN4UG9wdWxhdGVBY2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4RGF0YUZpbGw7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vLyBjb25zdCBhbGxTdHlsZXMgPSBbXG4vLyAgICAgXCJib2xkXCIsIFxuLy8gICAgIFwiaXRhbGljXCIsIFxuLy8gICAgIFwidW5kZXJsaW5lXCIsIFxuLy8gICAgIFwic3RyaWtldGhyb3VnaFwiLCBcbi8vICAgICBcInN1YnNjcmlwdFwiLCBcbi8vICAgICBcInN1cGVyc2NyaXB0XCIsIFxuLy8gICAgIFwiZm9udFNpemVcIiwgXG4vLyAgICAgXCJmb250RmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udEdlbmVyaWNGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250U2NoZW1lXCIsIFxuLy8gICAgIFwiZm9udENvbG9yXCIsIFxuLy8gICAgIFwiaG9yaXpvbnRhbEFsaWdubWVudFwiLCBcbi8vICAgICBcImp1c3RpZnlMYXN0TGluZVwiLCBcbi8vICAgICBcImluZGVudFwiLCBcbi8vICAgICBcInZlcnRpY2FsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwid3JhcFRleHRcIiwgXG4vLyAgICAgXCJzaHJpbmtUb0ZpdFwiLCBcbi8vICAgICBcInRleHREaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJ0ZXh0Um90YXRpb25cIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDb3VudGVyY2xvY2t3aXNlXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q2xvY2t3aXNlXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dFVwXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dERvd25cIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbFRleHRcIiwgXG4vLyAgICAgXCJmaWxsXCIsIFxuLy8gICAgIFwiYm9yZGVyXCIsIFxuLy8gICAgIFwiYm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJib3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJcIiwgXCJyaWdodEJvcmRlclwiLCBcInRvcEJvcmRlclwiLCBcImJvdHRvbUJvcmRlclwiLCBcImRpYWdvbmFsQm9yZGVyXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlckNvbG9yXCIsIFwicmlnaHRCb3JkZXJDb2xvclwiLCBcInRvcEJvcmRlckNvbG9yXCIsIFwiYm90dG9tQm9yZGVyQ29sb3JcIiwgXCJkaWFnb25hbEJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclN0eWxlXCIsIFwicmlnaHRCb3JkZXJTdHlsZVwiLCBcInRvcEJvcmRlclN0eWxlXCIsIFwiYm90dG9tQm9yZGVyU3R5bGVcIiwgXCJkaWFnb25hbEJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwiZGlhZ29uYWxCb3JkZXJEaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJudW1iZXJGb3JtYXRcIlxuLy8gXTtcblxubGV0IF9SaWNoVGV4dCA9IG51bGw7XG5cbi8qKlxuICogYHhzbHgtcG9wdWxhdGVgIGxpYnJhcnkgYmFzZWQgYWNjZXNzb3IgdG8gYSBnaXZlbiBFeGNlbCB3b3JrYm9vay4gQWxsIHRoZXNlIG1ldGhvZHMgYXJlIGludGVybmFsbHkgdXNlZCBieSB7QGxpbmsgWGxzeERhdGFGaWxsfSwgXG4gKiBidXQgY2FuIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIGltcGxlbWVudGluZyBjdXN0b20gc3ByZWFkc2hlZXQgYWNjZXNzb3JzLlxuICovXG5jbGFzcyBYbHN4UG9wdWxhdGVBY2Nlc3Mge1xuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgaW5zdGFuY2Ugb2YgWGxzeFNtYXJ0VGVtcGxhdGUgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7V29ya2Jvb2t9IHdvcmtib29rIC0gVGhlIHdvcmtib29rIHRvIGJlIGFjY2Vzc2VkLlxuICAgICAqIEBwYXJhbSB7WGxzeFBvcHVsYXRlfSBYbHN4UG9wdWxhdGUgLSBUaGUgYWN0dWFsIHhsc3gtcG9wdWxhdGUgbGlicmFyeSBvYmplY3QuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBgWGxzeFBvcHVsYXRlYCBvYmplY3QgbmVlZCB0byBiZSBwYXNzZWQgaW4gb3JkZXIgdG8gZXh0cmFjdFxuICAgICAqIGNlcnRhaW4gaW5mb3JtYXRpb24gZnJvbSBpdCwgX3dpdGhvdXRfIHJlZmVycmluZyB0aGUgd2hvbGUgbGlicmFyeSwgdGh1c1xuICAgICAqIGF2b2lkaW5nIG1ha2luZyB0aGUgYHhsc3gtZGF0YWZpbGxgIHBhY2thZ2UgYSBkZXBlbmRlbmN5LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdvcmtib29rLCBYbHN4UG9wdWxhdGUpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2sgPSB3b3JrYm9vaztcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICBcbiAgICAgICAgX1JpY2hUZXh0ID0gWGxzeFBvcHVsYXRlLlJpY2hUZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvbmZpZ3VyZWQgd29ya2Jvb2sgZm9yIGRpcmVjdCBYbHN4UG9wdWxhdGUgbWFuaXB1bGF0aW9uLlxuICAgICAqIEByZXR1cm5zIHtXb3JrYm9va30gVGhlIHdvcmtib29rIGludm9sdmVkLlxuICAgICAqL1xuICAgIHdvcmtib29rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd29ya2Jvb2s7IFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgY2VsbCdzIGNvbnRlbnRzLlxuICAgICAqL1xuICAgIGNlbGxWYWx1ZShjZWxsKSB7XG4gICAgICAgIGNvbnN0IHRoZVZhbHVlID0gY2VsbC52YWx1ZSgpO1xuICAgICAgICByZXR1cm4gdGhlVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQgPyB0aGVWYWx1ZS50ZXh0KCkgOiB0aGVWYWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZWFzdXJlcyB0aGUgZGlzdGFuY2UsIGFzIGEgdmVjdG9yIGJldHdlZW4gdHdvIGdpdmVuIGNlbGxzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZnJvbSBUaGUgZmlyc3QgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHRvIFRoZSBzZWNvbmQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIHR3byBjZWxscy5cbiAgICAgKi9cbiAgICBjZWxsRGlzdGFuY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRvLnJvd051bWJlcigpIC0gZnJvbS5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIHRvLmNvbHVtbk51bWJlcigpIC0gZnJvbS5jb2x1bW5OdW1iZXIoKVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgdGhlIHNpemUgb2YgY2VsbCwgdGFraW5nIGludG8gYWNjb3VudCBpZiBpdCBpcyBwYXJ0IG9mIGEgbWVyZ2VkIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge0FycmF5LjxOdW1iZXI+fSBBbiBhcnJheSB3aXRoIHR3byB2YWx1ZXMgWzxyb3dzPiwgPGNvbHM+XSwgcmVwcmVzZW50aW5nIHRoZSBvY2N1cGllZCBzaXplLlxuICAgICAqL1xuICAgIGNlbGxTaXplKGNlbGwpIHtcbiAgICAgICAgY29uc3QgY2VsbEFkZHIgPSBjZWxsLmFkZHJlc3MoKTtcbiAgICAgICAgbGV0IHRoZVNpemUgPSBbMSwgMV07XG4gICAgXG4gICAgICAgIF8uZm9yRWFjaChjZWxsLnNoZWV0KCkuX21lcmdlQ2VsbHMsIHJhbmdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhbmdlQWRkciA9IHJhbmdlLmF0dHJpYnV0ZXMucmVmLnNwbGl0KFwiOlwiKTtcbiAgICAgICAgICAgIGlmIChyYW5nZUFkZHJbMF0gPT0gY2VsbEFkZHIpIHtcbiAgICAgICAgICAgICAgICB0aGVTaXplID0gdGhpcy5jZWxsRGlzdGFuY2UoY2VsbCwgY2VsbC5zaGVldCgpLmNlbGwocmFuZ2VBZGRyWzFdKSk7XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzBdO1xuICAgICAgICAgICAgICAgICsrdGhlU2l6ZVsxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICByZXR1cm4gdGhlU2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVmZXJlbmNlIElkIGZvciBhIGdpdmVuIGNlbGwsIGJhc2VkIG9uIGl0cyBzaGVldCBhbmQgYWRkcmVzcy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gY3JlYXRlIGEgcmVmZXJlbmNlIElkIHRvLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBpZCB0byBiZSB1c2VkIGFzIGEgcmVmZXJlbmNlIGZvciB0aGlzIGNlbGwuXG4gICAgICovXG4gICAgY2VsbFJlZihjZWxsKSB7XG4gICAgICAgIHJldHVybiBjZWxsLmFkZHJlc3MoeyBpbmNsdWRlU2hlZXROYW1lOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGEgcmVmZXJlbmNlIHN0cmluZyBmb3IgYSBjZWxsIGlkZW50aWZpZWQgYnkgQHBhcmFtIGFkciwgZnJvbSB0aGUgQHBhcmFtIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIEEgY2VsbCB0aGF0IGlzIGEgYmFzZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZHIgVGhlIGFkZHJlc3Mgb2YgdGhlIHRhcmdldCBjZWxsLCBhcyBtZW50aW9uZWQgaW4gQHBhcmFtIGNlbGwuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQSByZWZlcmVuY2Ugc3RyaW5nIGlkZW50aWZ5aW5nIHRoZSB0YXJnZXQgY2VsbCB1bmlxdWVseS5cbiAgICAgKi9cbiAgICBidWlsZFJlZihjZWxsLCBhZHIpIHtcbiAgICAgICAgcmV0dXJuIGFkciA/IGNlbGwuc2hlZXQoKS5jZWxsKGFkcikuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHRydWUgfSkgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhIGdpdmVuIGNlbGwgZnJvbSBhIGdpdmVuIHNoZWV0IChvciBhbiBhY3RpdmUgb25lKS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R8YXJyYXl9IGFkZHJlc3MgVGhlIGNlbGwgYWRyZXNzIHRvIGJlIHVzZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xpZHh9IHNoZWV0SWQgVGhlIGlkL25hbWUgb2YgdGhlIHNoZWV0IHRvIHJldHJpZXZlIHRoZSBjZWxsIGZyb20uIERlZmF1bHRzIHRvIGFuIGFjdGl2ZSBvbmUuXG4gICAgICogQHJldHVybnMge0NlbGx9IEEgcmVmZXJlbmNlIHRvIHRoZSByZXF1aXJlZCBjZWxsLlxuICAgICAqL1xuICAgIGdldENlbGwoYWRkcmVzcywgc2hlZXRJZCkge1xuICAgICAgICBjb25zdCB0aGVTaGVldCA9IHNoZWV0SWQgPT0gbnVsbCA/IHRoaXMuX3dvcmtib29rLmFjdGl2ZVNoZWV0KCkgOiB0aGlzLl93b3JrYm9vay5zaGVldChzaGVldElkKTtcbiAgICAgICAgcmV0dXJuIHRoZVNoZWV0LmNlbGwoYWRkcmVzcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhbmQgcmV0dXJucyB0aGUgcmFuZ2Ugc3RhcnRpbmcgZnJvbSB0aGUgZ2l2ZW4gY2VsbCBhbmQgc3Bhd25pbmcgZ2l2ZW4gcm93cyBhbmQgY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBzdGFydGluZyBjZWxsIG9mIHRoZSByYW5nZS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gcm93T2Zmc2V0IE51bWJlciBvZiByb3dzIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIHJvdy5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gY29sT2Zmc2V0IE51bWJlciBvZiBjb2x1bW5zIGF3YXkgZnJvbSB0aGUgc3RhcnRpbmcgY2VsbC4gMCBtZWFucyBzYW1lIGNvbHVtbi5cbiAgICAgKiBAcmV0dXJucyB7UmFuZ2V9IFRoZSBjb25zdHJ1Y3RlZCByYW5nZS5cbiAgICAgKi9cbiAgICBnZXRDZWxsUmFuZ2UoY2VsbCwgcm93T2Zmc2V0LCBjb2xPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwucmFuZ2VUbyhjZWxsLnJlbGF0aXZlQ2VsbChyb3dPZmZzZXQsIGNvbE9mZnNldCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGNlbGwgYXQgYSBjZXJ0YWluIG9mZnNldCBmcm9tIGEgZ2l2ZW4gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgcmVmZXJlbmNlIGNlbGwgdG8gbWFrZSB0aGUgb2Zmc2V0IGZyb20uXG4gICAgICogQHBhcmFtIHtpbnR9IHJvd3MgTnVtYmVyIG9mIHJvd3MgdG8gb2Zmc2V0LlxuICAgICAqIEBwYXJhbSB7aW50fSBjb2xzIE51bWJlciBvZiBjb2x1bW5zIHRvIG9mZnNldC5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gVGhlIHJlc3VsdGluZyBjZWxsLlxuICAgICAqL1xuICAgIG9mZnNldENlbGwoY2VsbCwgcm93cywgY29scykge1xuICAgICAgICByZXR1cm4gY2VsbC5yZWxhdGl2ZUNlbGwocm93cywgY29scyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWVyZ2Ugb3Igc3BsaXQgcmFuZ2Ugb2YgY2VsbHMuXG4gICAgICogQHBhcmFtIHtSYW5nZX0gcmFuZ2UgVGhlIHJhbmdlLCBhcyByZXR1cm5lZCBmcm9tIHtAbGluayBnZXRDZWxsUmFuZ2V9XG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdGF0dXMgVGhlIG1lcmdlZCBzdGF0dXMgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIHNldFJhbmdlTWVyZ2VkKHJhbmdlLCBzdGF0dXMpIHtcbiAgICAgICAgcmFuZ2UubWVyZ2VkKHN0YXR1cyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEl0ZXJhdGUgb3ZlciBhbGwgdXNlZCBjZWxscyBvZiB0aGUgZ2l2ZW4gd29ya2Jvb2suXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2IgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCBgY2VsbGAgYXJndW1lbnQgZm9yIGVhY2ggdXNlZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBjaGFpbiBpbnZva2VzLlxuICAgICAqL1xuICAgIGZvckFsbENlbGxzKGNiKSB7XG4gICAgICAgIHRoaXMuX3dvcmtib29rLnNoZWV0cygpLmZvckVhY2goc2hlZXQgPT4gc2hlZXQudXNlZFJhbmdlKCkuZm9yRWFjaChjYikpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb3BpZXMgdGhlIHN0eWxlcyBmcm9tIGBzcmNgIGNlbGwgdG8gdGhlIGBkZXN0YC1pbmF0aW9uIG9uZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgRGVzdGluYXRpb24gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IHNyYyBTb3VyY2UgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U3R5bGUoZGVzdCwgc3JjKSB7XG4gICAgICAgIGlmIChzcmMgPT0gZGVzdCkgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHNyYy5fc3R5bGUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Quc3R5bGUoc3JjLl9zdHlsZSk7XG4gICAgICAgIGVsc2UgaWYgKHNyYy5fc3R5bGVJZCA+IDApXG4gICAgICAgICAgICBkZXN0Ll9zdHlsZUlkID0gc3JjLl9zdHlsZUlkO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzaXplIHRoZSBjb2x1bW4gYW5kIHJvdyBvZiB0aGUgZGVzdGluYXRpb24gY2VsbCwgaWYgbm90IGNoYW5nZWQgYWxyZWFkeS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGRlc3QgVGhlIGRlc3RpbmF0aW9uIGNlbGwgd2hpY2ggcm93IGFuZCBjb2x1bW4gdG8gcmVzaXplLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gc3JjIFRoZSBzb3VyY2UgKHRlbXBsYXRlKSBjZWxsIHRvIHRha2UgdGhlIHNpemUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBjb3B5U2l6ZShkZXN0LCBzcmMpIHtcbiAgICAgICAgY29uc3Qgcm93ID0gZGVzdC5yb3dOdW1iZXIoKSxcbiAgICAgICAgICAgIGNvbCA9IGRlc3QuY29sdW1uTnVtYmVyKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3Jvd1NpemVzW3Jvd10gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3Qucm93KCkuaGVpZ2h0KHRoaXMuX3Jvd1NpemVzW3Jvd10gPSBzcmMucm93KCkuaGVpZ2h0KCkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuX2NvbFNpemVzW2NvbF0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGRlc3QuY29sdW1uKCkud2lkdGgodGhpcy5fY29sU2l6ZXNbY29sXSA9IHNyYy5jb2x1bW4oKS53aWR0aCgpKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgdmFsdWUgaW4gdGhlIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIG9wZXJhdGVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBUaGUgc3RyaW5nIHZhbHVlIHRvIGJlIHNldCBpbnNpZGUuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0VmFsdWUoY2VsbCwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC52YWx1ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSBuYW1lZCBzdHlsZSBvZiBhIGdpdmVuIGNlbGwuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIG9wZXJhdGVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBzdHlsZSBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB2YWx1ZSBUaGUgdmFsdWUgZm9yIHRoaXMgcHJvcGVydHkgdG8gYmUgc2V0LlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHNldFN0eWxlKGNlbGwsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNlbGwuc3R5bGUobmFtZSwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWGxzeFBvcHVsYXRlQWNjZXNzO1xuIl19
