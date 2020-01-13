(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.XlsxDataFill = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _2 = require('lodash');

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

},{"./XlsxPopulateAccess":2,"lodash":undefined}],2:[function(require,module,exports){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _ = require('lodash'); // const allStyles = [
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

},{"lodash":undefined}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakI7O0FBRUEsSUFBTSxXQUFXLEdBQUc7QUFDaEIsRUFBQSxjQUFjLEVBQUUsSUFBSSxNQUFKLENBQVcsaUJBQVgsQ0FEQTtBQUVoQixFQUFBLGFBQWEsRUFBRSxHQUZDO0FBR2hCLEVBQUEsUUFBUSxFQUFFLEdBSE07QUFJaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBSkUsQ0FBcEI7QUFTQTs7OztJQUdNLFk7OztBQUNGOzs7Ozs7Ozs7Ozs7QUFZQSx3QkFBWSxRQUFaLEVBQXNCLElBQXRCLEVBQTRCO0FBQUE7O0FBQ3hCLFNBQUssS0FBTCxHQUFhLEVBQUMsQ0FBQyxZQUFGLENBQWUsRUFBZixFQUFtQixJQUFuQixFQUF5QixXQUF6QixDQUFiO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsUUFBZjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7NEJBTVEsTyxFQUFTO0FBQ2IsVUFBSSxPQUFPLEtBQUssSUFBaEIsRUFBc0I7QUFDbEIsUUFBQSxFQUFDLENBQUMsS0FBRixDQUFRLEtBQUssS0FBYixFQUFvQixPQUFwQjs7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUhELE1BSUksT0FBTyxLQUFLLEtBQVo7QUFDUDtBQUVEOzs7Ozs7Ozs2QkFLUyxJLEVBQU07QUFBQTs7QUFDWCxVQUFNLFNBQVMsR0FBRyxFQUFsQixDQURXLENBR1g7O0FBQ0EsV0FBSyxnQkFBTCxD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InNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG5jb25zdCBkZWZhdWx0T3B0cyA9IHtcbiAgICB0ZW1wbGF0ZVJlZ0V4cDogbmV3IFJlZ0V4cCgvXFx7XFx7KFtefV0qKVxcfVxcfS8pLFxuICAgIGZpZWxkU3BsaXR0ZXI6IFwifFwiLFxuICAgIGpvaW5UZXh0OiBcIixcIixcbiAgICBjYWxsYmFja3NNYXA6IHtcbiAgICAgICAgXCJcIjogZGF0YSA9PiBfLmtleXMoZGF0YSlcbiAgICB9XG59O1xuXG4vKipcbiAqIERhdGEgZmlsbCBlbmdpbmUsIHRha2luZyBhbiBpbnN0YW5jZSBvZiBFeGNlbCBzaGVldCBhY2Nlc3NvciBhbmQgYSBKU09OIG9iamVjdCBhcyBkYXRhLCBhbmQgZmlsbGluZyB0aGUgdmFsdWVzIGZyb20gdGhlIGxhdHRlciBpbnRvIHRoZSBmb3JtZXIuXG4gKi9cbmNsYXNzIFhsc3hEYXRhRmlsbCB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4RGF0YUZpbGwgd2l0aCBnaXZlbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBhY2Nlc3NvciBBbiBpbnN0YW5jZSBvZiBYTFNYIHNwcmVhZHNoZWV0IGFjY2Vzc2luZyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3t9fSBvcHRzIE9wdGlvbnMgdG8gYmUgdXNlZCBkdXJpbmcgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gb3B0cy50ZW1wbGF0ZVJlZ0V4cCBUaGUgcmVndWxhciBleHByZXNzaW9uIHRvIGJlIHVzZWQgZm9yIHRlbXBsYXRlIHJlY29nbml6aW5nLiBcbiAgICAgKiBEZWZhdWx0IGlzIGAvXFx7XFx7KFtefV0qKVxcfVxcfS9gLCBpLmUuIE11c3RhY2hlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci4gRGVmYXVsdCBpcyBgfGAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMuam9pblRleHQgVGhlIHN0cmluZyB0byBiZSB1c2VkIHdoZW4gdGhlIGV4dHJhY3RlZCB2YWx1ZSBmb3IgYSBzaW5nbGUgY2VsbCBpcyBhbiBhcnJheSwgXG4gICAgICogYW5kIGl0IG5lZWRzIHRvIGJlIGpvaW5lZC4gRGVmYXVsdCBpcyBgLGAuXG4gICAgICogQHBhcmFtIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBvcHRzLmNhbGxiYWNrc01hcCBBIG1hcCBvZiBoYW5kbGVycyB0byBiZSB1c2VkIGZvciBkYXRhIGFuZCB2YWx1ZSBleHRyYWN0aW9uLlxuICAgICAqIFRoZXJlIGlzIG9uZSBkZWZhdWx0IC0gdGhlIGVtcHR5IG9uZSwgZm9yIG9iamVjdCBrZXkgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ldyBvcHRpb25zIHRvIGJlIHVzZWQuIFxuICAgICAqIEBzZWUge0Bjb25zdHJ1Y3Rvcn0uXG4gICAgICogQHJldHVybnMge1hsc3hEYXRhRmlsbHx7fX0gVGhlIHJlcXVpcmVkIG9wdGlvbnMgKGluIGdldHRlciBtb2RlKSBvciBYbHN4RGF0YUZpbGwgKGluIHNldHRlciBtb2RlKSBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgICAgIGlmIChuZXdPcHRzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLm1lcmdlKHRoaXMuX29wdHMsIG5ld09wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1haW4gZW50cnkgcG9pbnQgZm9yIHdob2xlIGRhdGEgcG9wdWxhdGlvbiBtZWNoYW5pc20uXG4gICAgICogQHBhcmFtIHt7fX0gZGF0YSBUaGUgZGF0YSB0byBiZSBhcHBsaWVkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGZpbGxEYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZGF0YUZpbGxzID0ge307XG5cdFxuICAgICAgICAvLyBCdWlsZCB0aGUgZGVwZW5kZW5jeSBjb25uZWN0aW9ucyBiZXR3ZWVuIHRlbXBsYXRlcy5cbiAgICAgICAgdGhpcy5jb2xsZWN0VGVtcGxhdGVzKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFGaWxsID0geyAgXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLCBcbiAgICAgICAgICAgICAgICBkZXBlbmRlbnRzOiBbXSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgIFxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlLnJlZmVyZW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZkZpbGwgPSBkYXRhRmlsbHNbdGVtcGxhdGUucmVmZXJlbmNlXTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZkZpbGwpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSByZWZlcmVuY2UgJyR7dGVtcGxhdGUucmVmZXJlbmNlfSchYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIGRhdGFGaWxsc1t0aGlzLl9hY2Nlc3MuY2VsbFJlZih0ZW1wbGF0ZS5jZWxsKV0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoIWZpbGwucHJvY2Vzc2VkKVxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWxsKGZpbGwsIGRhdGEsIGZpbGwudGVtcGxhdGUuY2VsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgcHJvdmlkZWQgaGFuZGxlciBmcm9tIHRoZSBtYXAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhhbmRsZXJOYW1lIFRoZSBuYW1lIG9mIHRoZSBoYW5kbGVyLlxuICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gaXRzZWxmLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBnZXRIYW5kbGVyKGhhbmRsZXJOYW1lKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXJGbiA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW2hhbmRsZXJOYW1lXTtcblxuICAgICAgICBpZiAoIWhhbmRsZXJGbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGNhbm5vdCBiZSBmb3VuZCFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGhhbmRsZXJGbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSGFuZGxlciAnJHtoYW5kbGVyTmFtZX0nIGlzIG5vdCBhIGZ1bmN0aW9uIWApO1xuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJGbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHByb3ZpZGVkIGV4dHJhY3RvciAob3QgaXRlcmF0b3IpIHN0cmluZyB0byBmaW5kIGEgY2FsbGJhY2sgaWQgaW5zaWRlLCBpZiBwcmVzZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGl0ZXJhdG9yL2V4dHJhY3RvciBzdHJpbmcgdG8gYmUgaW52ZXN0aWdhdGVkLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3QuPHN0cmluZywgZnVuY3Rpb24+fSBBIHsgYHBhdGhgLCBgaGFuZGxlcmAgfSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBKU09OIHBhdGhcbiAgICAgKiByZWFkeSBmb3IgdXNlIGFuZCB0aGUgcHJvdmlkZWQgYGhhbmRsZXJgIF9mdW5jdGlvbl8gLSByZWFkeSBmb3IgaW52b2tpbmcsIGlmIHN1Y2ggaXMgcHJvdmlkZWQuXG4gICAgICogSWYgbm90IC0gdGhlIGBwYXRoYCBwcm9wZXJ0eSBjb250YWlucyB0aGUgcHJvdmlkZWQgYGV4dHJhY3RvcmAsIGFuZCB0aGUgYGhhbmRsZXJgIGlzIGBudWxsYC5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKSB7XG4gICAgICAgIC8vIEEgc3BlY2lmaWMgZXh0cmFjdG9yIGNhbiBiZSBzcGVjaWZpZWQgYWZ0ZXIgc2VtaWxvbiAtIGZpbmQgYW5kIHJlbWVtYmVyIGl0LlxuICAgICAgICBjb25zdCBleHRyYWN0UGFydHMgPSBleHRyYWN0b3Iuc3BsaXQoXCI6XCIpLFxuICAgICAgICAgICAgaGFuZGxlck5hbWUgPSBleHRyYWN0UGFydHNbMV07XG5cbiAgICAgICAgcmV0dXJuIGV4dHJhY3RQYXJ0cy5sZW5ndGggPT0gMVxuICAgICAgICAgICAgPyB7IHBhdGg6IGV4dHJhY3RvciwgaGFuZGxlcjogbnVsbCB9XG4gICAgICAgICAgICA6IHtcbiAgICAgICAgICAgICAgICBwYXRoOiBleHRyYWN0UGFydHNbMF0sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogdGhpcy5nZXRIYW5kbGVyKGhhbmRsZXJOYW1lKVxuICAgICAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBzdHlsZSBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSBvbnRvIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGRlc3RpbmF0aW9uIGNlbGwgdG8gYXBwbHkgc3R5bGluZyB0by5cbiAgICAgKiBAcGFyYW0ge3t9fSBkYXRhIFRoZSBkYXRhIGNodW5rIGZvciB0aGF0IGNlbGwuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRvIGJlIHVzZWQgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7RGF0YUZpbGxlcn0gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcbiAgICAgICAgXG4gICAgICAgIGlmIChzdHlsZXMgJiYgZGF0YSkge1xuICAgICAgICAgICAgXy5lYWNoKHN0eWxlcywgcGFpciA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChwYWlyLm5hbWUsIFwiOlwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEhhbmRsZXIocGFpci5uYW1lLnN1YnN0cigxKSkoZGF0YSwgY2VsbCwgdGhpcy5fb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHBhaXIuZXh0cmFjdG9yLCBjZWxsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRTdHlsZShjZWxsLCBwYWlyLm5hbWUsIHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKiBAaWdub3JlXG4gICAgICovXG4gICAgcGFyc2VUZW1wbGF0ZShjZWxsKSB7XG4gICAgICAgIC8vIFRoZSBvcHRpb25zIGFyZSBpbiBgdGhpc2AgYXJndW1lbnQuXG4gICAgICAgIGNvbnN0IHJlTWF0Y2ggPSAodGhpcy5fYWNjZXNzLmNlbGxWYWx1ZShjZWxsKSB8fCAnJykubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXJlTWF0Y2gpIHJldHVybiBudWxsO1xuICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IHJlTWF0Y2hbMV0uc3BsaXQodGhpcy5fb3B0cy5maWVsZFNwbGl0dGVyKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIHN0eWxlcyA9ICFwYXJ0c1s0XSA/IG51bGwgOiBwYXJ0c1s0XS5zcGxpdChcIixcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAocGFydHMubGVuZ3RoIDwgMikgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBlbm91Z2ggY29tcG9uZW50cyBvZiB0aGUgdGVtcGxhdGUgJHtyZU1hdGNoWzBdfWApO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZWZlcmVuY2U6IHRoaXMuX2FjY2Vzcy5idWlsZFJlZihjZWxsLCBwYXJ0c1swXSksXG4gICAgICAgICAgICBpdGVyYXRvcnM6IHBhcnRzWzFdLnNwbGl0KC94fFxcKi8pLm1hcChfLnRyaW0pLFxuICAgICAgICAgICAgZXh0cmFjdG9yOiBwYXJ0c1syXSB8fCBcIlwiLFxuICAgICAgICAgICAgY2VsbDogY2VsbCxcbiAgICAgICAgICAgIGNlbGxTaXplOiB0aGlzLl9hY2Nlc3MuY2VsbFNpemUoY2VsbCksXG4gICAgICAgICAgICBwYWRkaW5nOiAocGFydHNbM10gfHwgXCJcIikuc3BsaXQoLzp8LHx4fFxcKi8pLm1hcCh2ID0+IHBhcnNlSW50KHYpIHx8IDApLFxuICAgICAgICAgICAgc3R5bGVzOiAhc3R5bGVzID8gbnVsbCA6IF8ubWFwKHN0eWxlcywgcyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFpciA9IF8udHJpbShzKS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXy50cmltKHBhaXJbMF0pLCBleHRyYWN0b3I6IF8udHJpbShwYWlyWzFdKSB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgd2hvbGUgd29ya2Jvb2sgZm9yIHRlbXBsYXRlIHBhdHRlcm4gYW5kIGNvbnN0cnVjdHMgdGhlIHRlbXBsYXRlcyBmb3IgcHJvY2Vzc2luZy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBvbiBlYWNoIHRlbXBsYXRlZCwgYWZ0ZXIgdGhleSBhcmUgc29ydGVkLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSB0ZW1wbGF0ZXMgY29sbGVjdGVkIGFyZSBzb3J0ZWQsIGJhc2VkIG9uIHRoZSBpbnRyYS10ZW1wbGF0ZSByZWZlcmVuY2UgLSBpZiBvbmUgdGVtcGxhdGVcbiAgICAgKiBpcyByZWZlcnJpbmcgYW5vdGhlciBvbmUsIGl0J2xsIGFwcGVhciBfbGF0ZXJfIGluIHRoZSByZXR1cm5lZCBhcnJheSwgdGhhbiB0aGUgcmVmZXJyZWQgdGVtcGxhdGUuXG4gICAgICogVGhpcyBpcyB0aGUgb3JkZXIgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGludm9rZWQgb24uXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGNvbGxlY3RUZW1wbGF0ZXMoY2IpIHtcbiAgICAgICAgY29uc3QgYWxsVGVtcGxhdGVzID0gW107XG4gICAgXG4gICAgICAgIHRoaXMuX2FjY2Vzcy5mb3JBbGxDZWxscyhjZWxsID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5wYXJzZVRlbXBsYXRlKGNlbGwpO1xuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxuICAgICAgICAgICAgICAgIGFsbFRlbXBsYXRlcy5wdXNoKHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYWxsVGVtcGxhdGVzXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYi5jZWxsKSA/IDEgOiBiLnJlZmVyZW5jZSA9PSB0aGlzLl9hY2Nlc3MuY2VsbFJlZihhLmNlbGwpID8gLTEgOiAwKVxuICAgICAgICAgICAgLmZvckVhY2goY2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHRoZSB2YWx1ZShzKSBmcm9tIHRoZSBwcm92aWRlZCBkYXRhIGByb290YCB0byBiZSBzZXQgaW4gdGhlIHByb3ZpZGVkIGBjZWxsYC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgZXh0cmFjdGVkIHZhbHVlcyBmcm9tLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRyYWN0b3IgVGhlIGV4dHJhY3Rpb24gc3RyaW5nIHByb3ZpZGVkIGJ5IHRoZSB0ZW1wbGF0ZS4gVXN1YWxseSBhIEpTT04gcGF0aCB3aXRoaW4gdGhlIGRhdGEgYHJvb3RgLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBBIHJlZmVyZW5jZSBjZWxsLCBpZiBzdWNoIGV4aXN0cy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfEFycmF5fEFycmF5LjxBcnJheS48Kj4+fSBUaGUgdmFsdWUgdG8gYmUgdXNlZC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhpcyBtZXRob2QgaXMgdXNlZCBldmVuIHdoZW4gYSB3aG9sZSAtIHBvc3NpYmx5IHJlY3Rhbmd1bGFyIC0gcmFuZ2UgaXMgYWJvdXQgdG8gYmUgc2V0LCBzbyBpdCBjYW5cbiAgICAgKiByZXR1cm4gYW4gYXJyYXkgb2YgYXJyYXlzLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlcihyb290LCBjZWxsLCB0aGlzLl9vcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBhbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGRhdGEgZm9yIHRoZSBnaXZlbiBmaWxsLCBiYXNlZCBvbiB0aGUgZ2l2ZW5cbiAgICAgKiByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBtYWluIHJlZmVyZW5jZSBvYmplY3QgdG8gYXBwbHkgaXRlcmF0b3JzIHRvLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGl0ZXJhdG9ycyBMaXN0IG9mIGl0ZXJhdG9ycyAtIHN0cmluZyBKU09OIHBhdGhzIGluc2lkZSB0aGUgcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCBUaGUgaW5kZXggaW4gdGhlIGl0ZXJhdG9ycyBhcnJheSB0byB3b3JrIG9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxBcnJheS48QXJyYXk+fSBBbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGV4dHJhY3RlZCBkYXRhLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBleHRyYWN0RGF0YShyb290LCBpdGVyYXRvcnMsIGlkeCkge1xuICAgICAgICBsZXQgaXRlciA9IGl0ZXJhdG9yc1tpZHhdLFxuICAgICAgICAgICAgc2l6ZXMgPSBbXSxcbiAgICAgICAgICAgIHRyYW5zcG9zZWQgPSBmYWxzZSxcbiAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuXG4gICAgICAgIGlmIChpdGVyID09ICcxJykge1xuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IHRydWU7XG4gICAgICAgICAgICBpdGVyID0gaXRlcmF0b3JzWysraWR4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXRlcikgcmV0dXJuIHJvb3Q7XG5cbiAgICAgICAgLy8gQSBzcGVjaWZpYyBleHRyYWN0b3IgY2FuIGJlIHNwZWNpZmllZCBhZnRlciBzZW1pbG9uIC0gZmluZCBhbmQgcmVtZW1iZXIgaXQuXG4gICAgICAgIGNvbnN0IHBhcnNlZEl0ZXIgPSB0aGlzLnBhcnNlRXh0cmFjdG9yKGl0ZXIpO1xuXG4gICAgICAgIGRhdGEgPSBfLmdldChyb290LCBwYXJzZWRJdGVyLnBhdGgsIHJvb3QpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRJdGVyLmhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICBkYXRhID0gcGFyc2VkSXRlci5oYW5kbGVyLmNhbGwobnVsbCwgZGF0YSwgbnVsbCwgdGhpcy5fb3B0cyk7XG5cbiAgICAgICAgaWYgKGlkeCA8IGl0ZXJhdG9ycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkYXRhID0gXy5tYXAoZGF0YSwgaW5Sb290ID0+IHRoaXMuZXh0cmFjdERhdGEoaW5Sb290LCBpdGVyYXRvcnMsIGlkeCArIDEpKTtcbiAgICAgICAgICAgIHNpemVzID0gZGF0YVswXS5zaXplcztcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSAmJiB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgICBkYXRhID0gXy52YWx1ZXMoZGF0YSk7XG5cbiAgICAgICAgLy8gU29tZSBkYXRhIHNhbml0eSBjaGVja3MuXG4gICAgICAgIGlmICghZGF0YSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGl0ZXJhdG9yICcke2l0ZXJ9JyBleHRyYWN0ZWQgbm8gZGF0YSFgKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBleHRyYWN0ZWQgZnJvbSBpdGVyYXRvciAnJHtpdGVyfScgaXMgbmVpdGhlciBhbiBhcnJheSwgbm9yIG9iamVjdCFgKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqIEBpZ25vcmVcbiAgICAgKi9cbiAgICBwdXRWYWx1ZXMoY2VsbCwgZGF0YSwgdGVtcGxhdGUpIHtcbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IGRhdGEuc2l6ZXMsXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCB0ZW1wbGF0ZS5leHRyYWN0b3IsIGNlbGwpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3VyZSwgdGhlIFxuICAgICAgICBpZiAoIWVudHJ5U2l6ZSB8fCAhZW50cnlTaXplLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fYWNjZXNzXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKGNlbGwsIHZhbHVlKVxuICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICB0aGlzLmFwcGx5RGF0YVN0eWxlKGNlbGwsIGRhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRlbXBsYXRlLmNlbGxTaXplO1xuICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBzaXplIGFuZCBkYXRhLlxuICAgICAgICAgICAgaWYgKGVudHJ5U2l6ZVswXSA8IDApIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBbMSwgLWVudHJ5U2l6ZVswXV07XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeVNpemUubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBlbnRyeVNpemUgPSBlbnRyeVNpemUuY29uY2F0KFsxXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBfLmNodW5rKHZhbHVlLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYWNjZXNzLmdldENlbGxSYW5nZShjZWxsLCBlbnRyeVNpemVbMF0gLSAxLCBlbnRyeVNpemVbMV0gLSAxKS5mb3JFYWNoKChjZWxsLCByaSwgY2kpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKGNlbGwsIHZhbHVlW3JpXVtjaV0pXG4gICAgICAgICAgICAgICAgICAgIC5jb3B5U3R5bGUoY2VsbCwgdGVtcGxhdGUuY2VsbClcbiAgICAgICAgICAgICAgICAgICAgLmNvcHlTaXplKGNlbGwsIHRlbXBsYXRlLmNlbGwpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YVtyaV1bY2ldLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlYWwgd2l0aCBtb3JlIHRoYW4gMyBkaW1lbnNpb25zIGNhc2UuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlcyBleHRyYWN0ZWQgd2l0aCAnJHt0ZW1wbGF0ZS5leHRyYWN0b3J9IGFyZSBtb3JlIHRoYW4gMiBkaW1lbnNpb24hJ2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5U2l6ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSB0aGUgZ2l2ZW4gZmlsdGVyIG9udG8gdGhlIHNoZWV0IC0gZXh0cmFjdGluZyB0aGUgcHJvcGVyIGRhdGEsIGZvbGxvd2luZyBkZXBlbmRlbnQgZmlsbHMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3t9fSBhRmlsbCBUaGUgZmlsbCB0byBiZSBhcHBsaWVkLCBhcyBjb25zdHJ1Y3RlZCBpbiB0aGUge0BsaW5rIGZpbGxEYXRhfSBtZXRob2QuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IG1haW5DZWxsIFRoZSBzdGFydGluZyBjZWxsIGZvciBkYXRhIHBsYWNlbWVudCBwcm9jZWR1cmUuXG4gICAgICogQHJldHVybnMge0FycmF5fSBUaGUgc2l6ZSBvZiB0aGUgZGF0YSBwdXQgaW4gW3JvdywgY29sXSBmb3JtYXQuXG4gICAgICogQGlnbm9yZVxuICAgICAqL1xuICAgIGFwcGx5RmlsbChhRmlsbCwgcm9vdCwgbWFpbkNlbGwpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBhRmlsbC50ZW1wbGF0ZSxcbiAgICAgICAgICAgIHRoZURhdGEgPSB0aGlzLmV4dHJhY3REYXRhKHJvb3QsIHRlbXBsYXRlLml0ZXJhdG9ycywgMCk7XG5cbiAgICAgICAgbGV0IGVudHJ5U2l6ZSA9IFsxLCAxXTtcblxuICAgICAgICBpZiAoIWFGaWxsLmRlcGVuZGVudHMgfHwgIWFGaWxsLmRlcGVuZGVudHMubGVuZ3RoKVxuICAgICAgICAgICAgZW50cnlTaXplID0gdGhpcy5wdXRWYWx1ZXMobWFpbkNlbGwsIHRoZURhdGEsIHRlbXBsYXRlKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV4dENlbGwgPSBtYWluQ2VsbDtcbiAgICAgICAgICAgIGNvbnN0IHNpemVNYXh4ZXIgPSAodmFsLCBpZHgpID0+IGVudHJ5U2l6ZVtpZHhdID0gTWF0aC5tYXgoZW50cnlTaXplW2lkeF0sIHZhbCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgdGhlRGF0YS5sZW5ndGg7ICsrZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluUm9vdCA9IHRoZURhdGFbZF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBmID0gMDsgZiA8IGFGaWxsLmRlcGVuZGVudHMubGVuZ3RoOyArK2YpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5GaWxsID0gYUZpbGwuZGVwZW5kZW50c1tmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluQ2VsbCA9IHRoaXMuX2FjY2Vzcy5vZmZzZXRDZWxsKG5leHRDZWxsLCBpbkZpbGwub2Zmc2V0WzBdLCBpbkZpbGwub2Zmc2V0WzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlubmVyU2l6ZSA9IHRoaXMuYXBwbHlGaWxsKGluRmlsbCwgaW5Sb290LCBpbkNlbGwpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChpbm5lclNpemUsIHNpemVNYXh4ZXIpO1xuICAgICAgICAgICAgICAgICAgICBpbkZpbGwucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBOb3cgd2UgaGF2ZSB0aGUgaW5uZXIgZGF0YSBwdXQgYW5kIHRoZSBzaXplIGNhbGN1bGF0ZWQuXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMucHV0VmFsdWVzKG5leHRDZWxsLCBpblJvb3QsIHRlbXBsYXRlKSwgc2l6ZU1heHhlcik7XG5cbiAgICAgICAgICAgICAgICBsZXQgcm93T2Zmc2V0ID0gZW50cnlTaXplWzBdLFxuICAgICAgICAgICAgICAgICAgICBjb2xPZmZzZXQgPSBlbnRyeVNpemVbMV07XG5cbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgd2UgZ3JvdyBvbmx5IG9uIG9uZSBkaW1lbnNpb24uXG4gICAgICAgICAgICAgICAgaWYgKHRoZURhdGEuc2l6ZXNbMF0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvd09mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVsxXSA9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZW50cnlTaXplWzBdID0gMTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocm93T2Zmc2V0ID4gMSB8fCBjb2xPZmZzZXQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJuZyA9IHRoaXMuX2FjY2Vzcy5nZXRDZWxsUmFuZ2UobmV4dENlbGwsIE1hdGgubWF4KHJvd09mZnNldCAtIDEsIDApLCBNYXRoLm1heChjb2xPZmZzZXQgLSAxLCAwKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzcy5zZXRSYW5nZU1lcmdlZChybmcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBybmcuZm9yRWFjaChjZWxsID0+IHRoaXMuX2FjY2Vzcy5jb3B5U2l6ZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRmluYWxseSwgY2FsY3VsYXRlIHRoZSBuZXh0IGNlbGwuXG4gICAgICAgICAgICAgICAgbmV4dENlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgcm93T2Zmc2V0ICsgdGVtcGxhdGUucGFkZGluZ1swXSwgY29sT2Zmc2V0ICsgdGVtcGxhdGUucGFkZGluZ1sxXSB8fCAwKTtcdFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOb3cgcmVjYWxjIGNvbWJpbmVkIGVudHJ5IHNpemUuXG4gICAgICAgICAgICBfLmZvckVhY2godGhpcy5fYWNjZXNzLmNlbGxEaXN0YW5jZShtYWluQ2VsbCwgbmV4dENlbGwpLCBzaXplTWF4eGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxufVxuXG4vKipcbiAqIFRoZSBidWlsdC1pbiBhY2Nlc3NvciBiYXNlZCBvbiB4bHN4LXBvcHVsYXRlIG5wbSBtb2R1bGVcbiAqIEB0eXBlIHtYbHN4UG9wdWxhdGVBY2Nlc3N9XG4gKi9cblhsc3hEYXRhRmlsbC5YbHN4UG9wdWxhdGVBY2Nlc3MgPSByZXF1aXJlKCcuL1hsc3hQb3B1bGF0ZUFjY2VzcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhsc3hEYXRhRmlsbDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8vIGNvbnN0IGFsbFN0eWxlcyA9IFtcbi8vICAgICBcImJvbGRcIiwgXG4vLyAgICAgXCJpdGFsaWNcIiwgXG4vLyAgICAgXCJ1bmRlcmxpbmVcIiwgXG4vLyAgICAgXCJzdHJpa2V0aHJvdWdoXCIsIFxuLy8gICAgIFwic3Vic2NyaXB0XCIsIFxuLy8gICAgIFwic3VwZXJzY3JpcHRcIiwgXG4vLyAgICAgXCJmb250U2l6ZVwiLCBcbi8vICAgICBcImZvbnRGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250R2VuZXJpY0ZhbWlseVwiLCBcbi8vICAgICBcImZvbnRTY2hlbWVcIiwgXG4vLyAgICAgXCJmb250Q29sb3JcIiwgXG4vLyAgICAgXCJob3Jpem9udGFsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwianVzdGlmeUxhc3RMaW5lXCIsIFxuLy8gICAgIFwiaW5kZW50XCIsIFxuLy8gICAgIFwidmVydGljYWxBbGlnbm1lbnRcIiwgXG4vLyAgICAgXCJ3cmFwVGV4dFwiLCBcbi8vICAgICBcInNocmlua1RvRml0XCIsIFxuLy8gICAgIFwidGV4dERpcmVjdGlvblwiLCBcbi8vICAgICBcInRleHRSb3RhdGlvblwiLCBcbi8vICAgICBcImFuZ2xlVGV4dENvdW50ZXJjbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDbG9ja3dpc2VcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0VXBcIiwgXG4vLyAgICAgXCJyb3RhdGVUZXh0RG93blwiLCBcbi8vICAgICBcInZlcnRpY2FsVGV4dFwiLCBcbi8vICAgICBcImZpbGxcIiwgXG4vLyAgICAgXCJib3JkZXJcIiwgXG4vLyAgICAgXCJib3JkZXJDb2xvclwiLCBcbi8vICAgICBcImJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclwiLCBcInJpZ2h0Qm9yZGVyXCIsIFwidG9wQm9yZGVyXCIsIFwiYm90dG9tQm9yZGVyXCIsIFwiZGlhZ29uYWxCb3JkZXJcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyQ29sb3JcIiwgXCJyaWdodEJvcmRlckNvbG9yXCIsIFwidG9wQm9yZGVyQ29sb3JcIiwgXCJib3R0b21Cb3JkZXJDb2xvclwiLCBcImRpYWdvbmFsQm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJsZWZ0Qm9yZGVyU3R5bGVcIiwgXCJyaWdodEJvcmRlclN0eWxlXCIsIFwidG9wQm9yZGVyU3R5bGVcIiwgXCJib3R0b21Cb3JkZXJTdHlsZVwiLCBcImRpYWdvbmFsQm9yZGVyU3R5bGVcIiwgXG4vLyAgICAgXCJkaWFnb25hbEJvcmRlckRpcmVjdGlvblwiLCBcbi8vICAgICBcIm51bWJlckZvcm1hdFwiXG4vLyBdO1xuXG5sZXQgX1JpY2hUZXh0ID0gbnVsbDtcblxuLyoqXG4gKiBgeHNseC1wb3B1bGF0ZWAgbGlicmFyeSBiYXNlZCBhY2Nlc3NvciB0byBhIGdpdmVuIEV4Y2VsIHdvcmtib29rLiBBbGwgdGhlc2UgbWV0aG9kcyBhcmUgaW50ZXJuYWxseSB1c2VkIGJ5IHtAbGluayBYbHN4RGF0YUZpbGx9LCBcbiAqIGJ1dCBjYW4gYmUgdXNlZCBhcyBhIHJlZmVyZW5jZSBmb3IgaW1wbGVtZW50aW5nIGN1c3RvbSBzcHJlYWRzaGVldCBhY2Nlc3NvcnMuXG4gKi9cbmNsYXNzIFhsc3hQb3B1bGF0ZUFjY2VzcyB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4U21hcnRUZW1wbGF0ZSB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtXb3JrYm9va30gd29ya2Jvb2sgLSBUaGUgd29ya2Jvb2sgdG8gYmUgYWNjZXNzZWQuXG4gICAgICogQHBhcmFtIHtYbHN4UG9wdWxhdGV9IFhsc3hQb3B1bGF0ZSAtIFRoZSBhY3R1YWwgeGxzeC1wb3B1bGF0ZSBsaWJyYXJ5IG9iamVjdC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGBYbHN4UG9wdWxhdGVgIG9iamVjdCBuZWVkIHRvIGJlIHBhc3NlZCBpbiBvcmRlciB0byBleHRyYWN0XG4gICAgICogY2VydGFpbiBpbmZvcm1hdGlvbiBmcm9tIGl0LCBfd2l0aG91dF8gcmVmZXJyaW5nIHRoZSB3aG9sZSBsaWJyYXJ5LCB0aHVzXG4gICAgICogYXZvaWRpbmcgbWFraW5nIHRoZSBgeGxzeC1kYXRhZmlsbGAgcGFja2FnZSBhIGRlcGVuZGVuY3kuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod29ya2Jvb2ssIFhsc3hQb3B1bGF0ZSkge1xuICAgICAgICB0aGlzLl93b3JrYm9vayA9IHdvcmtib29rO1xuICAgICAgICB0aGlzLl9yb3dTaXplcyA9IHt9O1xuICAgICAgICB0aGlzLl9jb2xTaXplcyA9IHt9O1xuICAgIFxuICAgICAgICBfUmljaFRleHQgPSBYbHN4UG9wdWxhdGUuUmljaFRleHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCB3b3JrYm9vayBmb3IgZGlyZWN0IFhsc3hQb3B1bGF0ZSBtYW5pcHVsYXRpb24uXG4gICAgICogQHJldHVybnMge1dvcmtib29rfSBUaGUgd29ya2Jvb2sgaW52b2x2ZWQuXG4gICAgICovXG4gICAgd29ya2Jvb2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl93b3JrYm9vazsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2VsbCB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgLSBUaGUgY2VsbCB0byByZXRyaWV2ZSB0aGUgdmFsdWUgZnJvbS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdGV4dHVhbCByZXByZXNlbnRhdGlvbiBvZiBjZWxsJ3MgY29udGVudHMuXG4gICAgICovXG4gICAgY2VsbFZhbHVlKGNlbGwpIHtcbiAgICAgICAgY29uc3QgdGhlVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIHJldHVybiB0aGVWYWx1ZSBpbnN0YW5jZW9mIF9SaWNoVGV4dCA/IHRoZVZhbHVlLnRleHQoKSA6IHRoZVZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lYXN1cmVzIHRoZSBkaXN0YW5jZSwgYXMgYSB2ZWN0b3IgYmV0d2VlbiB0d28gZ2l2ZW4gY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBmcm9tIFRoZSBmaXJzdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gdG8gVGhlIHNlY29uZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIGNlbGxzLlxuICAgICAqL1xuICAgIGNlbGxEaXN0YW5jZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgdG8ucm93TnVtYmVyKCkgLSBmcm9tLnJvd051bWJlcigpLFxuICAgICAgICAgICAgdG8uY29sdW1uTnVtYmVyKCkgLSBmcm9tLmNvbHVtbk51bWJlcigpXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiBjZWxsLCB0YWtpbmcgaW50byBhY2NvdW50IGlmIGl0IGlzIHBhcnQgb2YgYSBtZXJnZWQgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIG9jY3VwaWVkIHNpemUuXG4gICAgICovXG4gICAgY2VsbFNpemUoY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsQWRkciA9IGNlbGwuYWRkcmVzcygpO1xuICAgICAgICBsZXQgdGhlU2l6ZSA9IFsxLCAxXTtcbiAgICBcbiAgICAgICAgXy5mb3JFYWNoKGNlbGwuc2hlZXQoKS5fbWVyZ2VDZWxscywgcmFuZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VBZGRyID0gcmFuZ2UuYXR0cmlidXRlcy5yZWYuc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKHJhbmdlQWRkclswXSA9PSBjZWxsQWRkcikge1xuICAgICAgICAgICAgICAgIHRoZVNpemUgPSB0aGlzLmNlbGxEaXN0YW5jZShjZWxsLCBjZWxsLnNoZWV0KCkuY2VsbChyYW5nZUFkZHJbMV0pKTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMF07XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGVTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYSByZWZlcmVuY2Ugc3RyaW5nIGZvciBhIGNlbGwgaWRlbnRpZmllZCBieSBAcGFyYW0gYWRyLCBmcm9tIHRoZSBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSBjZWxsIHRoYXQgaXMgYSBiYXNlIG9mIHRoZSByZWZlcmVuY2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkciBUaGUgYWRkcmVzcyBvZiB0aGUgdGFyZ2V0IGNlbGwsIGFzIG1lbnRpb25lZCBpbiBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIHJlZmVyZW5jZSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHRhcmdldCBjZWxsIHVuaXF1ZWx5LlxuICAgICAqL1xuICAgIGJ1aWxkUmVmKGNlbGwsIGFkcikge1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogdHJ1ZSB9KSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgY2VsbCBhdCBhIGNlcnRhaW4gb2Zmc2V0IGZyb20gYSBnaXZlbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSByZWZlcmVuY2UgY2VsbCB0byBtYWtlIHRoZSBvZmZzZXQgZnJvbS5cbiAgICAgKiBAcGFyYW0ge2ludH0gcm93cyBOdW1iZXIgb2Ygcm93cyB0byBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtpbnR9IGNvbHMgTnVtYmVyIG9mIGNvbHVtbnMgdG8gb2Zmc2V0LlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBUaGUgcmVzdWx0aW5nIGNlbGwuXG4gICAgICovXG4gICAgb2Zmc2V0Q2VsbChjZWxsLCByb3dzLCBjb2xzKSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJlbGF0aXZlQ2VsbChyb3dzLCBjb2xzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBvciBzcGxpdCByYW5nZSBvZiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20ge0BsaW5rIGdldENlbGxSYW5nZX1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXR1cyBUaGUgbWVyZ2VkIHN0YXR1cyB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgc2V0UmFuZ2VNZXJnZWQocmFuZ2UsIHN0YXR1cykge1xuICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFsbCB1c2VkIGNlbGxzIG9mIHRoZSBnaXZlbiB3b3JrYm9vay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGBjZWxsYCBhcmd1bWVudCBmb3IgZWFjaCB1c2VkIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgZm9yQWxsQ2VsbHMoY2IpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2suc2hlZXRzKCkuZm9yRWFjaChzaGVldCA9PiBzaGVldC51c2VkUmFuZ2UoKS5mb3JFYWNoKGNiKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgc3R5bGVzIGZyb20gYHNyY2AgY2VsbCB0byB0aGUgYGRlc3RgLWluYXRpb24gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBEZXN0aW5hdGlvbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gc3JjIFNvdXJjZSBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTdHlsZShkZXN0LCBzcmMpIHtcbiAgICAgICAgaWYgKHNyYyA9PSBkZXN0KSByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemUgdGhlIGNvbHVtbiBhbmQgcm93IG9mIHRoZSBkZXN0aW5hdGlvbiBjZWxsLCBpZiBub3QgY2hhbmdlZCBhbHJlYWR5LlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBUaGUgZGVzdGluYXRpb24gY2VsbCB3aGljaCByb3cgYW5kIGNvbHVtbiB0byByZXNpemUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgVGhlIHNvdXJjZSAodGVtcGxhdGUpIGNlbGwgdG8gdGFrZSB0aGUgc2l6ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTaXplKGRlc3QsIHNyYykge1xuICAgICAgICBjb25zdCByb3cgPSBkZXN0LnJvd051bWJlcigpLFxuICAgICAgICAgICAgY29sID0gZGVzdC5jb2x1bW5OdW1iZXIoKTtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93XSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSB2YWx1ZSBpbiB0aGUgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFRoZSBzdHJpbmcgdmFsdWUgdG8gYmUgc2V0IGluc2lkZS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRWYWx1ZShjZWxsLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0U3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
