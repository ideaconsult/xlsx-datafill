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
 * Data fill engine.
 */

var XlsxDataFill =
/*#__PURE__*/
function () {
  /**
   * Constructs a new instance of XlsxDataFill with given options.
   * @param {object} accessor An instance of XLSX data accessing class.
   * @param {{}} opts Options to be used during processing.
   * @param {RegExp} opts.templateRegExp The regular expression to be used for template parsing.
   * @param {string} opts.fieldSplitter The string to be expected as template field splitter.
   * @param {string} opts.joinText The string to be used when extracting array values.
   * @param {object.<string, function>} opts.callbacksMap A map of handlers to be used for data extraction.
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
   * @param {{}|null} newOpts If set - the news options to be used.
   * @returns {XlsxDataFill|{}} The required options or XlsxDataFill (in set mode) for chaining.
   */


  _createClass(XlsxDataFill, [{
    key: "options",
    value: function options(newOpts) {
      if (newOpts !== null) {
        _2.merge(this._opts, newOpts);

        this._access.options(this._opts);

        return this;
      } else return this._opts;
    }
    /**
     * Parses the provided extractor (ot iterator) string to find a callback id inside, if present.
     * @param {string} extractor The iterator/extractor string to be investigated.
     * @returns {object.<string, function>} A { `path`, `handler` } object representing the JSON path
     * ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
     * If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.
     */

  }, {
    key: "parseExtractor",
    value: function parseExtractor(extractor) {
      // A specific extractor can be specified after semilon - find and remember it.
      var extractParts = extractor.split(":");
      return extractParts.length == 1 ? {
        path: extractor,
        handler: null
      } : {
        path: extractParts[0],
        handler: this._opts.callbacksMap[extractParts[1]]
      };
    }
    /**
     * Applies the style part of the template onto a given cell.
     * @param {Cell} cell The destination cell to apply styling to.
     * @param {{}} data The data chunk for that cell.
     * @param {{}} template The template to be used for that cell.
     * @returns {DataFiller} For invocation chaining.
     */

  }, {
    key: "applyDataStyle",
    value: function applyDataStyle(cell, data, template) {
      var _this = this;

      var styles = template.styles;

      if (styles && data) {
        _2.each(styles, function (pair) {
          if (_2.startsWith(pair.name, ":")) {
            var handler = _this._opts.callbacksMap[pair.name.substr(1)];

            if (typeof handler === 'function') handler(data, cell, _this._opts);
          } else {
            var val = _this.extractValues(data, pair.extractor, cell);

            if (val) _this._access.setStyle(cell, pair.name, val);
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
     */

  }, {
    key: "parseTemplate",
    value: function parseTemplate(cell) {
      // The options are in `this` argument.
      var reMatch = (this._access.cellTextValue(cell) || '').match(this._opts.templateRegExp);
      if (!reMatch) return null;
      var parts = reMatch[1].split(this._opts.fieldSplitter).map(_2.trim),
          iters = parts[1].split(/x|\*/).map(_2.trim),
          styles = !parts[4] ? null : parts[4].split(",");
      return {
        reference: this._access.buildRef(cell, _2.trim(parts[0])),
        iterators: iters,
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
     */

  }, {
    key: "collectTemplates",
    value: function collectTemplates(cb) {
      var _this2 = this;

      var allTemplates = [];

      this._access.forAllCells(function (cell) {
        var template = _this2.parseTemplate(cell);

        if (template) allTemplates.push(template);
      });

      return allTemplates.sort(function (a, b) {
        return a.reference == _this2._access.cellRef(b.cell) ? 1 : b.reference == _this2._access.cellRef(a.cell) ? -1 : 0;
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
     */

  }, {
    key: "extractValues",
    value: function extractValues(root, extractor, cell) {
      var _this3 = this;

      var _this$parseExtractor = this.parseExtractor(extractor),
          path = _this$parseExtractor.path,
          handler = _this$parseExtractor.handler;

      if (!Array.isArray(root)) root = _2.get(root, path, root);else if (root.sizes !== undefined) root = !extractor ? root : _2.map(root, function (entry) {
        return _this3.extractValues(entry, extractor, cell);
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
     */

  }, {
    key: "extractData",
    value: function extractData(root, iterators, idx) {
      var _this4 = this;

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
          return _this4.extractData(inRoot, iterators, idx + 1);
        });
        sizes = data[0].sizes;
      } else if (!Array.isArray(data) && _typeof(data) === 'object') data = _2.values(data);

      sizes.unshift(transposed ? -data.length : data.length);
      data.sizes = sizes;
      return data;
    }
    /**
     * Put the data values into the proper cells, with correct extracted values.
     * 
     * @param {{}} cell The starting cell for the data to be put.
     * @param {Array} data The actual data to be put. The values will be _extracted_ from here first.
     * @param {{}} template The template that is being implemented with that data fill.
     * @returns {Array} Matrix size that this data has occupied on the sheet [rows, cols].
     */

  }, {
    key: "putValues",
    value: function putValues(cell, data, template) {
      var _this5 = this;

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
          _this5._access.setValue(cell, value[ri][ci]).copyStyle(cell, template.cell).copySize(cell, template.cell);

          _this5.applyDataStyle(cell, data[ri][ci], template);
        });
      } else {// TODO: Deal with more than 3 dimensions case.
      }

      return entrySize;
    }
    /**
     * Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.
     * @param {{}} aFill The fill to be applied, as constructed in the @see populate methods.
     * @param {{}} root The data root to be used for data extraction.
     * @param {Cell} mainCell The starting cell for data placement procedure.
     * @returns {Array} The size of the data put in [row, col] format.
     */

  }, {
    key: "applyFill",
    value: function applyFill(aFill, root, mainCell) {
      var _this6 = this;

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
              return _this6._access.copySize(cell, template.cell);
            });
          } // Finally, calculate the next cell.


          nextCell = this._access.offsetCell(nextCell, rowOffset + template.padding[0], colOffset + template.padding[1] || 0);
        } // Now recalc combined entry size.


        _2.forEach(this._access.cellDistance(mainCell, nextCell), sizeMaxxer);
      }
      return entrySize;
    }
    /**
     * The main entry point for whole data population mechanism.
     * @param {{}} data The data to be applied.
     * @returns {XlsxDataFill} For invocation chaining.
     */

  }, {
    key: "fillData",
    value: function fillData(data) {
      var _this7 = this;

      var dataFills = {}; // Build the dependency connections between templates.

      this.collectTemplates(function (template) {
        var aFill = {
          template: template,
          dependents: [],
          processed: false
        };

        if (template.reference) {
          var refFill = dataFills[template.reference];
          refFill.dependents.push(aFill);
          aFill.offset = _this7._access.cellDistance(refFill.template.cell, template.cell);
        }

        dataFills[_this7._access.cellRef(template.cell)] = aFill;
      }); // Apply each fill onto the sheet.

      _2.each(dataFills, function (fill) {
        if (!fill.processed) _this7.applyFill(fill, data, fill.template.cell);
      });

      return this;
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
 * Data fill routines wrapper.
 * @ignore
 */

var XlsxPopulateAccess =
/*#__PURE__*/
function () {
  /**
   * Constructs a new instance of XlsxSmartTemplate with given options.
   * @param {Workbook} workbook - The workbook to be accessed.
   * @param {XlsxPopulate} XlsxPopulate - The actual xlsx-populate library object.
   * @description The `XlsxPopulate` object need to be passed in order to extract
   * certain information from it, _without_ referring the whole library, and thus
   * making the `xlsx-datafill` package dependent on it.
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
    key: "cellTextValue",
    value: function cellTextValue(cell) {
      var cellValue = cell.value();
      return cellValue instanceof _RichText ? cellValue.text() : cellValue;
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
     * @param {Range} range The range, as returned from @see getCellRange().
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvWGxzeERhdGFGaWxsLmpzIiwic3JjL1hsc3hQb3B1bGF0ZUFjY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7O0FBRUEsSUFBTSxFQUFDLEdBQUcsT0FBTyxDQUFDLFFBQUQsQ0FBakI7O0FBQ0EsSUFBTSxXQUFXLEdBQUc7QUFDaEIsRUFBQSxjQUFjLEVBQUUsSUFBSSxNQUFKLENBQVcsaUJBQVgsQ0FEQTtBQUVoQixFQUFBLGFBQWEsRUFBRSxHQUZDO0FBR2hCLEVBQUEsUUFBUSxFQUFFLEdBSE07QUFJaEIsRUFBQSxZQUFZLEVBQUU7QUFDVixRQUFJLFdBQUEsSUFBSTtBQUFBLGFBQUksRUFBQyxDQUFDLElBQUYsQ0FBTyxJQUFQLENBQUo7QUFBQTtBQURFO0FBSkUsQ0FBcEI7QUFTQTs7OztJQUdNLFk7OztBQUNGOzs7Ozs7Ozs7QUFTQSx3QkFBWSxRQUFaLEVBQXNCLElBQXRCLEVBQTRCO0FBQUE7O0FBQ3hCLFNBQUssS0FBTCxHQUFhLEVBQUMsQ0FBQyxZQUFGLENBQWUsRUFBZixFQUFtQixJQUFuQixFQUF5QixXQUF6QixDQUFiO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxTQUFMLEdBQWlCLEVBQWpCO0FBQ0EsU0FBSyxPQUFMLEdBQWUsUUFBZjtBQUNIO0FBRUQ7Ozs7Ozs7Ozs0QkFLUSxPLEVBQVM7QUFDYixVQUFJLE9BQU8sS0FBSyxJQUFoQixFQUFzQjtBQUNsQixRQUFBLEVBQUMsQ0FBQyxLQUFGLENBQVEsS0FBSyxLQUFiLEVBQW9CLE9BQXBCOztBQUNBLGFBQUssT0FBTCxDQUFhLE9BQWIsQ0FBcUIsS0FBSyxLQUExQjs7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUpELE1BS0ksT0FBTyxLQUFLLEtBQVo7QUFDUDtBQUVEOzs7Ozs7Ozs7O21DQU9lLFMsRUFBVztBQUN0QjtBQUNBLFVBQU0sWUFB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RUFBeEM7QUFFSixVQUFJLEtBQUssU0FBTCxDQUFlLEdBQWYsTUFBd0IsU0FBNUIsRUFDSSxJQUFJLENBQUMsTUFBTCxHQUFjLEtBQWQsQ0FBb0IsS0FBSyxTQUFMLENBQWUsR0FBZixJQUFzQixHQUFHLENBQUMsTUFBSixHQUFhLEtBQWIsRUFBMUM7QUFFSixhQUFPLElBQVA7QUFDSDtBQUVEOzs7Ozs7Ozs7NkJBTVMsSSxFQUFNLEssRUFBTztBQUNsQixNQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBWDtBQUNBLGFBQU8sSUFBUDtBQUNIO0FBRUQ7Ozs7Ozs7Ozs7NkJBT1MsSSxFQUFNLEksRUFBTSxLLEVBQU87QUFDeEIsTUFBQSxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVgsRUFBaUIsS0FBakI7QUFDQSxhQUFPLElBQVA7QUFDSDs7Ozs7O0FBR0wsTUFBTSxDQUFDLE9BQVAsR0FBaUIsa0JBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcbmNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgIHRlbXBsYXRlUmVnRXhwOiBuZXcgUmVnRXhwKC9cXHtcXHsoW159XSopXFx9XFx9LyksXG4gICAgZmllbGRTcGxpdHRlcjogXCJ8XCIsXG4gICAgam9pblRleHQ6IFwiLFwiLFxuICAgIGNhbGxiYWNrc01hcDoge1xuICAgICAgICBcIlwiOiBkYXRhID0+IF8ua2V5cyhkYXRhKVxuICAgIH1cbn07XG5cbi8qKlxuICogRGF0YSBmaWxsIGVuZ2luZS5cbiAqL1xuY2xhc3MgWGxzeERhdGFGaWxsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIFhsc3hEYXRhRmlsbCB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGFjY2Vzc29yIEFuIGluc3RhbmNlIG9mIFhMU1ggZGF0YSBhY2Nlc3NpbmcgY2xhc3MuXG4gICAgICogQHBhcmFtIHt7fX0gb3B0cyBPcHRpb25zIHRvIGJlIHVzZWQgZHVyaW5nIHByb2Nlc3NpbmcuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IG9wdHMudGVtcGxhdGVSZWdFeHAgVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB1c2VkIGZvciB0ZW1wbGF0ZSBwYXJzaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZpZWxkU3BsaXR0ZXIgVGhlIHN0cmluZyB0byBiZSBleHBlY3RlZCBhcyB0ZW1wbGF0ZSBmaWVsZCBzcGxpdHRlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy5qb2luVGV4dCBUaGUgc3RyaW5nIHRvIGJlIHVzZWQgd2hlbiBleHRyYWN0aW5nIGFycmF5IHZhbHVlcy5cbiAgICAgKiBAcGFyYW0ge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IG9wdHMuY2FsbGJhY2tzTWFwIEEgbWFwIG9mIGhhbmRsZXJzIHRvIGJlIHVzZWQgZm9yIGRhdGEgZXh0cmFjdGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhY2Nlc3Nvciwgb3B0cykge1xuICAgICAgICB0aGlzLl9vcHRzID0gXy5kZWZhdWx0c0RlZXAoe30sIG9wdHMsIGRlZmF1bHRPcHRzKTtcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fYWNjZXNzID0gYWNjZXNzb3I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0dGVyL2dldHRlciBmb3IgWGxzeERhdGFGaWxsJ3Mgb3B0aW9ucyBhcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3t9fG51bGx9IG5ld09wdHMgSWYgc2V0IC0gdGhlIG5ld3Mgb3B0aW9ucyB0byBiZSB1c2VkLlxuICAgICAqIEByZXR1cm5zIHtYbHN4RGF0YUZpbGx8e319IFRoZSByZXF1aXJlZCBvcHRpb25zIG9yIFhsc3hEYXRhRmlsbCAoaW4gc2V0IG1vZGUpIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBvcHRpb25zKG5ld09wdHMpIHtcbiAgICAgICAgaWYgKG5ld09wdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8ubWVyZ2UodGhpcy5fb3B0cywgbmV3T3B0cyk7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3Mub3B0aW9ucyh0aGlzLl9vcHRzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcHJvdmlkZWQgZXh0cmFjdG9yIChvdCBpdGVyYXRvcikgc3RyaW5nIHRvIGZpbmQgYSBjYWxsYmFjayBpZCBpbnNpZGUsIGlmIHByZXNlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dHJhY3RvciBUaGUgaXRlcmF0b3IvZXh0cmFjdG9yIHN0cmluZyB0byBiZSBpbnZlc3RpZ2F0ZWQuXG4gICAgICogQHJldHVybnMge29iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IEEgeyBgcGF0aGAsIGBoYW5kbGVyYCB9IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIEpTT04gcGF0aFxuICAgICAqIHJlYWR5IGZvciB1c2UgYW5kIHRoZSBwcm92aWRlZCBgaGFuZGxlcmAgX2Z1bmN0aW9uXyAtIHJlYWR5IGZvciBpbnZva2luZywgaWYgc3VjaCBpcyBwcm92aWRlZC5cbiAgICAgKiBJZiBub3QgLSB0aGUgYHBhdGhgIHByb3BlcnR5IGNvbnRhaW5zIHRoZSBwcm92aWRlZCBgZXh0cmFjdG9yYCwgYW5kIHRoZSBgaGFuZGxlcmAgaXMgYG51bGxgLlxuICAgICAqL1xuICAgIHBhcnNlRXh0cmFjdG9yKGV4dHJhY3Rvcikge1xuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgZXh0cmFjdFBhcnRzID0gZXh0cmFjdG9yLnNwbGl0KFwiOlwiKTtcblxuICAgICAgICByZXR1cm4gZXh0cmFjdFBhcnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICA/IHsgcGF0aDogZXh0cmFjdG9yLCBoYW5kbGVyOiBudWxsIH1cbiAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgIHBhdGg6IGV4dHJhY3RQYXJ0c1swXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiB0aGlzLl9vcHRzLmNhbGxiYWNrc01hcFtleHRyYWN0UGFydHNbMV1dXG4gICAgICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIHN0eWxlIHBhcnQgb2YgdGhlIHRlbXBsYXRlIG9udG8gYSBnaXZlbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgZGVzdGluYXRpb24gY2VsbCB0byBhcHBseSBzdHlsaW5nIHRvLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgY2h1bmsgZm9yIHRoYXQgY2VsbC5cbiAgICAgKiBAcGFyYW0ge3t9fSB0ZW1wbGF0ZSBUaGUgdGVtcGxhdGUgdG8gYmUgdXNlZCBmb3IgdGhhdCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtEYXRhRmlsbGVyfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBhcHBseURhdGFTdHlsZShjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3R5bGVzICYmIGRhdGEpIHtcbiAgICAgICAgICAgIF8uZWFjaChzdHlsZXMsIHBhaXIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChfLnN0YXJ0c1dpdGgocGFpci5uYW1lLCBcIjpcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMuX29wdHMuY2FsbGJhY2tzTWFwW3BhaXIubmFtZS5zdWJzdHIoMSldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGRhdGEsIGNlbGwsIHRoaXMuX29wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMuZXh0cmFjdFZhbHVlcyhkYXRhLCBwYWlyLmV4dHJhY3RvciwgY2VsbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0U3R5bGUoY2VsbCwgcGFpci5uYW1lLCB2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGNvbnRlbnRzIG9mIHRoZSBjZWxsIGludG8gYSB2YWxpZCB0ZW1wbGF0ZSBpbmZvLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge3t9fSBUaGUgcGFyc2VkIHRlbXBsYXRlLlxuICAgICAqIEBkZXNjcmlwdGlvbiBUaGlzIG1ldGhvZCBidWlsZHMgdGVtcGxhdGUgaW5mbywgdGFraW5nIGludG8gYWNjb3VudCB0aGUgc3VwcGxpZWQgb3B0aW9ucy5cbiAgICAgKi9cbiAgICBwYXJzZVRlbXBsYXRlKGNlbGwpIHtcbiAgICAgICAgLy8gVGhlIG9wdGlvbnMgYXJlIGluIGB0aGlzYCBhcmd1bWVudC5cbiAgICAgICAgY29uc3QgcmVNYXRjaCA9ICh0aGlzLl9hY2Nlc3MuY2VsbFRleHRWYWx1ZShjZWxsKSB8fCAnJykubWF0Y2godGhpcy5fb3B0cy50ZW1wbGF0ZVJlZ0V4cCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXJlTWF0Y2gpIHJldHVybiBudWxsO1xuICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IHJlTWF0Y2hbMV0uc3BsaXQodGhpcy5fb3B0cy5maWVsZFNwbGl0dGVyKS5tYXAoXy50cmltKSxcbiAgICAgICAgICAgIGl0ZXJzID0gcGFydHNbMV0uc3BsaXQoL3h8XFwqLykubWFwKF8udHJpbSksXG4gICAgICAgICAgICBzdHlsZXMgPSAhcGFydHNbNF0gPyBudWxsIDogcGFydHNbNF0uc3BsaXQoXCIsXCIpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZWZlcmVuY2U6IHRoaXMuX2FjY2Vzcy5idWlsZFJlZihjZWxsLCBfLnRyaW0ocGFydHNbMF0pKSxcbiAgICAgICAgICAgIGl0ZXJhdG9yczogaXRlcnMsXG4gICAgICAgICAgICBleHRyYWN0b3I6IHBhcnRzWzJdIHx8IFwiXCIsXG4gICAgICAgICAgICBjZWxsOiBjZWxsLFxuICAgICAgICAgICAgY2VsbFNpemU6IHRoaXMuX2FjY2Vzcy5jZWxsU2l6ZShjZWxsKSxcbiAgICAgICAgICAgIHBhZGRpbmc6IChwYXJ0c1szXSB8fCBcIlwiKS5zcGxpdCgvOnwsfHh8XFwqLykubWFwKHYgPT4gcGFyc2VJbnQodikgfHwgMCksXG4gICAgICAgICAgICBzdHlsZXM6ICFzdHlsZXMgPyBudWxsIDogXy5tYXAoc3R5bGVzLCBzID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWlyID0gXy50cmltKHMpLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBfLnRyaW0ocGFpclswXSksIGV4dHJhY3RvcjogXy50cmltKHBhaXJbMV0pIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlYXJjaGVzIHRoZSB3aG9sZSB3b3JrYm9vayBmb3IgdGVtcGxhdGUgcGF0dGVybiBhbmQgY29uc3RydWN0cyB0aGUgdGVtcGxhdGVzIGZvciBwcm9jZXNzaW5nLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIG9uIGVhY2ggdGVtcGxhdGVkLCBhZnRlciB0aGV5IGFyZSBzb3J0ZWQuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIHRlbXBsYXRlcyBjb2xsZWN0ZWQgYXJlIHNvcnRlZCwgYmFzZWQgb24gdGhlIGludHJhLXRlbXBsYXRlIHJlZmVyZW5jZSAtIGlmIG9uZSB0ZW1wbGF0ZVxuICAgICAqIGlzIHJlZmVycmluZyBhbm90aGVyIG9uZSwgaXQnbGwgYXBwZWFyIF9sYXRlcl8gaW4gdGhlIHJldHVybmVkIGFycmF5LCB0aGFuIHRoZSByZWZlcnJlZCB0ZW1wbGF0ZS5cbiAgICAgKiBUaGlzIGlzIHRoZSBvcmRlciB0aGUgY2FsbGJhY2sgaXMgYmVpbmcgaW52b2tlZCBvbi5cbiAgICAgKi9cbiAgICBjb2xsZWN0VGVtcGxhdGVzKGNiKSB7XG4gICAgICAgIGNvbnN0IGFsbFRlbXBsYXRlcyA9IFtdO1xuICAgIFxuICAgICAgICB0aGlzLl9hY2Nlc3MuZm9yQWxsQ2VsbHMoY2VsbCA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucGFyc2VUZW1wbGF0ZShjZWxsKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSlcbiAgICAgICAgICAgICAgICBhbGxUZW1wbGF0ZXMucHVzaCh0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFsbFRlbXBsYXRlc1xuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEucmVmZXJlbmNlID09IHRoaXMuX2FjY2Vzcy5jZWxsUmVmKGIuY2VsbCkgPyAxIDogYi5yZWZlcmVuY2UgPT0gdGhpcy5fYWNjZXNzLmNlbGxSZWYoYS5jZWxsKSA/IC0xIDogMClcbiAgICAgICAgICAgIC5mb3JFYWNoKGNiKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyB0aGUgdmFsdWUocykgZnJvbSB0aGUgcHJvdmlkZWQgZGF0YSBgcm9vdGAgdG8gYmUgc2V0IGluIHRoZSBwcm92aWRlZCBgY2VsbGAuXG4gICAgICogQHBhcmFtIHt7fX0gcm9vdCBUaGUgZGF0YSByb290IHRvIGJlIGV4dHJhY3RlZCB2YWx1ZXMgZnJvbS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0cmFjdG9yIFRoZSBleHRyYWN0aW9uIHN0cmluZyBwcm92aWRlZCBieSB0aGUgdGVtcGxhdGUuIFVzdWFsbHkgYSBKU09OIHBhdGggd2l0aGluIHRoZSBkYXRhIGByb290YC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSByZWZlcmVuY2UgY2VsbCwgaWYgc3VjaCBleGlzdHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ3xBcnJheXxBcnJheS48QXJyYXkuPCo+Pn0gVGhlIHZhbHVlIHRvIGJlIHVzZWQuXG4gICAgICogQGRlc2NyaXB0aW9uIFRoaXMgbWV0aG9kIGlzIHVzZWQgZXZlbiB3aGVuIGEgd2hvbGUgLSBwb3NzaWJseSByZWN0YW5ndWxhciAtIHJhbmdlIGlzIGFib3V0IHRvIGJlIHNldCwgc28gaXQgY2FuXG4gICAgICogcmV0dXJuIGFuIGFycmF5IG9mIGFycmF5cy5cbiAgICAgKi9cbiAgICBleHRyYWN0VmFsdWVzKHJvb3QsIGV4dHJhY3RvciwgY2VsbCkge1xuICAgICAgICBjb25zdCB7IHBhdGgsIGhhbmRsZXIgfSA9IHRoaXMucGFyc2VFeHRyYWN0b3IoZXh0cmFjdG9yKTtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocm9vdCkpXG4gICAgICAgICAgICByb290ID0gXy5nZXQocm9vdCwgcGF0aCwgcm9vdCk7XG4gICAgICAgIGVsc2UgaWYgKHJvb3Quc2l6ZXMgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJvb3QgPSAhZXh0cmFjdG9yID8gcm9vdCA6IF8ubWFwKHJvb3QsIGVudHJ5ID0+IHRoaXMuZXh0cmFjdFZhbHVlcyhlbnRyeSwgZXh0cmFjdG9yLCBjZWxsKSk7XG4gICAgICAgIGVsc2UgaWYgKCFoYW5kbGVyKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3Quam9pbih0aGlzLl9vcHRzLmpvaW5UZXh0IHx8IFwiLFwiKTtcblxuICAgICAgICByZXR1cm4gIWhhbmRsZXIgPyByb290IDogaGFuZGxlcihyb290LCBjZWxsLCB0aGlzLl9vcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBhbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGRhdGEgZm9yIHRoZSBnaXZlbiBmaWxsLCBiYXNlZCBvbiB0aGUgZ2l2ZW5cbiAgICAgKiByb290IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBtYWluIHJlZmVyZW5jZSBvYmplY3QgdG8gYXBwbHkgaXRlcmF0b3JzIHRvLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGl0ZXJhdG9ycyBMaXN0IG9mIGl0ZXJhdG9ycyAtIHN0cmluZyBKU09OIHBhdGhzIGluc2lkZSB0aGUgcm9vdCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCBUaGUgaW5kZXggaW4gdGhlIGl0ZXJhdG9ycyBhcnJheSB0byB3b3JrIG9uLlxuICAgICAqIEByZXR1cm5zIHtBcnJheXxBcnJheS48QXJyYXk+fSBBbiBhcnJheSAocG9zc2libHkgb2YgYXJyYXlzKSB3aXRoIGV4dHJhY3RlZCBkYXRhLlxuICAgICAqL1xuICAgIGV4dHJhY3REYXRhKHJvb3QsIGl0ZXJhdG9ycywgaWR4KSB7XG4gICAgICAgIGxldCBpdGVyID0gaXRlcmF0b3JzW2lkeF0sXG4gICAgICAgICAgICBzaXplcyA9IFtdLFxuICAgICAgICAgICAgdHJhbnNwb3NlZCA9IGZhbHNlLFxuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGl0ZXIgPT0gJzEnKSB7XG4gICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGl0ZXIgPSBpdGVyYXRvcnNbKytpZHhdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpdGVyKSByZXR1cm4gcm9vdDtcblxuICAgICAgICAvLyBBIHNwZWNpZmljIGV4dHJhY3RvciBjYW4gYmUgc3BlY2lmaWVkIGFmdGVyIHNlbWlsb24gLSBmaW5kIGFuZCByZW1lbWJlciBpdC5cbiAgICAgICAgY29uc3QgcGFyc2VkSXRlciA9IHRoaXMucGFyc2VFeHRyYWN0b3IoaXRlcik7XG5cbiAgICAgICAgZGF0YSA9IF8uZ2V0KHJvb3QsIHBhcnNlZEl0ZXIucGF0aCwgcm9vdCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHBhcnNlZEl0ZXIuaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIGRhdGEgPSBwYXJzZWRJdGVyLmhhbmRsZXIuY2FsbChudWxsLCBkYXRhLCBudWxsLCB0aGlzLl9vcHRzKTtcblxuICAgICAgICBpZiAoaWR4IDwgaXRlcmF0b3JzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGRhdGEgPSBfLm1hcChkYXRhLCBpblJvb3QgPT4gdGhpcy5leHRyYWN0RGF0YShpblJvb3QsIGl0ZXJhdG9ycywgaWR4ICsgMSkpO1xuICAgICAgICAgICAgc2l6ZXMgPSBkYXRhWzBdLnNpemVzO1xuICAgICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEpICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JylcbiAgICAgICAgICAgIGRhdGEgPSBfLnZhbHVlcyhkYXRhKTtcblxuICAgICAgICBzaXplcy51bnNoaWZ0KHRyYW5zcG9zZWQgPyAtZGF0YS5sZW5ndGggOiBkYXRhLmxlbmd0aCk7XG4gICAgICAgIGRhdGEuc2l6ZXMgPSBzaXplcztcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHV0IHRoZSBkYXRhIHZhbHVlcyBpbnRvIHRoZSBwcm9wZXIgY2VsbHMsIHdpdGggY29ycmVjdCBleHRyYWN0ZWQgdmFsdWVzLlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7e319IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIHRoZSBkYXRhIHRvIGJlIHB1dC5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIFRoZSBhY3R1YWwgZGF0YSB0byBiZSBwdXQuIFRoZSB2YWx1ZXMgd2lsbCBiZSBfZXh0cmFjdGVkXyBmcm9tIGhlcmUgZmlyc3QuXG4gICAgICogQHBhcmFtIHt7fX0gdGVtcGxhdGUgVGhlIHRlbXBsYXRlIHRoYXQgaXMgYmVpbmcgaW1wbGVtZW50ZWQgd2l0aCB0aGF0IGRhdGEgZmlsbC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IE1hdHJpeCBzaXplIHRoYXQgdGhpcyBkYXRhIGhhcyBvY2N1cGllZCBvbiB0aGUgc2hlZXQgW3Jvd3MsIGNvbHNdLlxuICAgICAqL1xuICAgIHB1dFZhbHVlcyhjZWxsLCBkYXRhLCB0ZW1wbGF0ZSkge1xuICAgICAgICBsZXQgZW50cnlTaXplID0gZGF0YS5zaXplcyxcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5leHRyYWN0VmFsdWVzKGRhdGEsIHRlbXBsYXRlLmV4dHJhY3RvciwgY2VsbCk7XG5cbiAgICAgICAgLy8gbWFrZSBzdXJlLCB0aGUgXG4gICAgICAgIGlmICghZW50cnlTaXplIHx8ICFlbnRyeVNpemUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3NcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUoY2VsbCwgdmFsdWUpXG4gICAgICAgICAgICAgICAgLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKVxuICAgICAgICAgICAgICAgIC5jb3B5U2l6ZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlEYXRhU3R5bGUoY2VsbCwgZGF0YSwgdGVtcGxhdGUpO1xuICAgICAgICAgICAgZW50cnlTaXplID0gdGVtcGxhdGUuY2VsbFNpemU7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50cnlTaXplLmxlbmd0aCA8PSAyKSB7XG4gICAgICAgICAgICAvLyBOb3JtYWxpemUgdGhlIHNpemUgYW5kIGRhdGEuXG4gICAgICAgICAgICBpZiAoZW50cnlTaXplWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IFsxLCAtZW50cnlTaXplWzBdXTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5U2l6ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgIGVudHJ5U2l6ZSA9IGVudHJ5U2l6ZS5jb25jYXQoWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF8uY2h1bmsodmFsdWUsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKGNlbGwsIGVudHJ5U2l6ZVswXSAtIDEsIGVudHJ5U2l6ZVsxXSAtIDEpLmZvckVhY2goKGNlbGwsIHJpLCBjaSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoY2VsbCwgdmFsdWVbcmldW2NpXSlcbiAgICAgICAgICAgICAgICAgICAgLmNvcHlTdHlsZShjZWxsLCB0ZW1wbGF0ZS5jZWxsKVxuICAgICAgICAgICAgICAgICAgICAuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseURhdGFTdHlsZShjZWxsLCBkYXRhW3JpXVtjaV0sIHRlbXBsYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogRGVhbCB3aXRoIG1vcmUgdGhhbiAzIGRpbWVuc2lvbnMgY2FzZS5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeVNpemU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGdpdmVuIGZpbHRlciBvbnRvIHRoZSBzaGVldCAtIGV4dHJhY3RpbmcgdGhlIHByb3BlciBkYXRhLCBmb2xsb3dpbmcgZGVwZW5kZW50IGZpbGxzLCBldGMuXG4gICAgICogQHBhcmFtIHt7fX0gYUZpbGwgVGhlIGZpbGwgdG8gYmUgYXBwbGllZCwgYXMgY29uc3RydWN0ZWQgaW4gdGhlIEBzZWUgcG9wdWxhdGUgbWV0aG9kcy5cbiAgICAgKiBAcGFyYW0ge3t9fSByb290IFRoZSBkYXRhIHJvb3QgdG8gYmUgdXNlZCBmb3IgZGF0YSBleHRyYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gbWFpbkNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgZm9yIGRhdGEgcGxhY2VtZW50IHByb2NlZHVyZS5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBzaXplIG9mIHRoZSBkYXRhIHB1dCBpbiBbcm93LCBjb2xdIGZvcm1hdC5cbiAgICAgKi9cbiAgICBhcHBseUZpbGwoYUZpbGwsIHJvb3QsIG1haW5DZWxsKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYUZpbGwudGVtcGxhdGUsXG4gICAgICAgICAgICB0aGVEYXRhID0gdGhpcy5leHRyYWN0RGF0YShyb290LCB0ZW1wbGF0ZS5pdGVyYXRvcnMsIDApO1xuXG4gICAgICAgIGxldCBlbnRyeVNpemUgPSBbMSwgMV07XG5cbiAgICAgICAgaWYgKCFhRmlsbC5kZXBlbmRlbnRzIHx8ICFhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aClcbiAgICAgICAgICAgIGVudHJ5U2l6ZSA9IHRoaXMucHV0VmFsdWVzKG1haW5DZWxsLCB0aGVEYXRhLCB0ZW1wbGF0ZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5leHRDZWxsID0gbWFpbkNlbGw7XG4gICAgICAgICAgICBjb25zdCBzaXplTWF4eGVyID0gKHZhbCwgaWR4KSA9PiBlbnRyeVNpemVbaWR4XSA9IE1hdGgubWF4KGVudHJ5U2l6ZVtpZHhdLCB2YWwpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBkID0gMDsgZCA8IHRoZURhdGEubGVuZ3RoOyArK2QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJvb3QgPSB0aGVEYXRhW2RdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhRmlsbC5kZXBlbmRlbnRzLmxlbmd0aDsgKytmKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluRmlsbCA9IGFGaWxsLmRlcGVuZGVudHNbZl0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbkNlbGwgPSB0aGlzLl9hY2Nlc3Mub2Zmc2V0Q2VsbChuZXh0Q2VsbCwgaW5GaWxsLm9mZnNldFswXSwgaW5GaWxsLm9mZnNldFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBpbm5lclNpemUgPSB0aGlzLmFwcGx5RmlsbChpbkZpbGwsIGluUm9vdCwgaW5DZWxsKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goaW5uZXJTaXplLCBzaXplTWF4eGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaW5GaWxsLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTm93IHdlIGhhdmUgdGhlIGlubmVyIGRhdGEgcHV0IGFuZCB0aGUgc2l6ZSBjYWxjdWxhdGVkLlxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLnB1dFZhbHVlcyhuZXh0Q2VsbCwgaW5Sb290LCB0ZW1wbGF0ZSksIHNpemVNYXh4ZXIpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHJvd09mZnNldCA9IGVudHJ5U2l6ZVswXSxcbiAgICAgICAgICAgICAgICAgICAgY29sT2Zmc2V0ID0gZW50cnlTaXplWzFdO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGdyb3cgb25seSBvbiBvbmUgZGltZW5zaW9uLlxuICAgICAgICAgICAgICAgIGlmICh0aGVEYXRhLnNpemVzWzBdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByb3dPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVNpemVbMV0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbE9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5U2l6ZVswXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJvd09mZnNldCA+IDEgfHwgY29sT2Zmc2V0ID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBybmcgPSB0aGlzLl9hY2Nlc3MuZ2V0Q2VsbFJhbmdlKG5leHRDZWxsLCBNYXRoLm1heChyb3dPZmZzZXQgLSAxLCAwKSwgTWF0aC5tYXgoY29sT2Zmc2V0IC0gMSwgMCkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hY2Nlc3Muc2V0UmFuZ2VNZXJnZWQocm5nLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcm5nLmZvckVhY2goY2VsbCA9PiB0aGlzLl9hY2Nlc3MuY29weVNpemUoY2VsbCwgdGVtcGxhdGUuY2VsbCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGN1bGF0ZSB0aGUgbmV4dCBjZWxsLlxuICAgICAgICAgICAgICAgIG5leHRDZWxsID0gdGhpcy5fYWNjZXNzLm9mZnNldENlbGwobmV4dENlbGwsIHJvd09mZnNldCArIHRlbXBsYXRlLnBhZGRpbmdbMF0sIGNvbE9mZnNldCArIHRlbXBsYXRlLnBhZGRpbmdbMV0gfHwgMCk7XHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTm93IHJlY2FsYyBjb21iaW5lZCBlbnRyeSBzaXplLlxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UobWFpbkNlbGwsIG5leHRDZWxsKSwgc2l6ZU1heHhlcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnlTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB3aG9sZSBkYXRhIHBvcHVsYXRpb24gbWVjaGFuaXNtLlxuICAgICAqIEBwYXJhbSB7e319IGRhdGEgVGhlIGRhdGEgdG8gYmUgYXBwbGllZC5cbiAgICAgKiBAcmV0dXJucyB7WGxzeERhdGFGaWxsfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBmaWxsRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGRhdGFGaWxscyA9IHt9O1xuXHRcbiAgICAgICAgLy8gQnVpbGQgdGhlIGRlcGVuZGVuY3kgY29ubmVjdGlvbnMgYmV0d2VlbiB0ZW1wbGF0ZXMuXG4gICAgICAgIHRoaXMuY29sbGVjdFRlbXBsYXRlcyh0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhRmlsbCA9IHsgIFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZSwgXG4gICAgICAgICAgICAgICAgZGVwZW5kZW50czogW10sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICBcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZS5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWZGaWxsID0gZGF0YUZpbGxzW3RlbXBsYXRlLnJlZmVyZW5jZV07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVmRmlsbC5kZXBlbmRlbnRzLnB1c2goYUZpbGwpO1xuICAgICAgICAgICAgICAgIGFGaWxsLm9mZnNldCA9IHRoaXMuX2FjY2Vzcy5jZWxsRGlzdGFuY2UocmVmRmlsbC50ZW1wbGF0ZS5jZWxsLCB0ZW1wbGF0ZS5jZWxsKTtcbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIGRhdGFGaWxsc1t0aGlzLl9hY2Nlc3MuY2VsbFJlZih0ZW1wbGF0ZS5jZWxsKV0gPSBhRmlsbDtcbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIC8vIEFwcGx5IGVhY2ggZmlsbCBvbnRvIHRoZSBzaGVldC5cbiAgICAgICAgXy5lYWNoKGRhdGFGaWxscywgZmlsbCA9PiB7XG4gICAgICAgICAgICBpZiAoIWZpbGwucHJvY2Vzc2VkKVxuICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlGaWxsKGZpbGwsIGRhdGEsIGZpbGwudGVtcGxhdGUuY2VsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuLyoqXG4gKiBUaGUgYnVpbHQtaW4gYWNjZXNzb3IgYmFzZWQgb24geGxzeC1wb3B1bGF0ZSBucG0gbW9kdWxlXG4gKiBAdHlwZSB7WGxzeFBvcHVsYXRlQWNjZXNzfVxuICovXG5YbHN4RGF0YUZpbGwuWGxzeFBvcHVsYXRlQWNjZXNzID0gcmVxdWlyZSgnLi9YbHN4UG9wdWxhdGVBY2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4RGF0YUZpbGw7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuXG4vLyBjb25zdCBhbGxTdHlsZXMgPSBbXG4vLyAgICAgXCJib2xkXCIsIFxuLy8gICAgIFwiaXRhbGljXCIsIFxuLy8gICAgIFwidW5kZXJsaW5lXCIsIFxuLy8gICAgIFwic3RyaWtldGhyb3VnaFwiLCBcbi8vICAgICBcInN1YnNjcmlwdFwiLCBcbi8vICAgICBcInN1cGVyc2NyaXB0XCIsIFxuLy8gICAgIFwiZm9udFNpemVcIiwgXG4vLyAgICAgXCJmb250RmFtaWx5XCIsIFxuLy8gICAgIFwiZm9udEdlbmVyaWNGYW1pbHlcIiwgXG4vLyAgICAgXCJmb250U2NoZW1lXCIsIFxuLy8gICAgIFwiZm9udENvbG9yXCIsIFxuLy8gICAgIFwiaG9yaXpvbnRhbEFsaWdubWVudFwiLCBcbi8vICAgICBcImp1c3RpZnlMYXN0TGluZVwiLCBcbi8vICAgICBcImluZGVudFwiLCBcbi8vICAgICBcInZlcnRpY2FsQWxpZ25tZW50XCIsIFxuLy8gICAgIFwid3JhcFRleHRcIiwgXG4vLyAgICAgXCJzaHJpbmtUb0ZpdFwiLCBcbi8vICAgICBcInRleHREaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJ0ZXh0Um90YXRpb25cIiwgXG4vLyAgICAgXCJhbmdsZVRleHRDb3VudGVyY2xvY2t3aXNlXCIsIFxuLy8gICAgIFwiYW5nbGVUZXh0Q2xvY2t3aXNlXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dFVwXCIsIFxuLy8gICAgIFwicm90YXRlVGV4dERvd25cIiwgXG4vLyAgICAgXCJ2ZXJ0aWNhbFRleHRcIiwgXG4vLyAgICAgXCJmaWxsXCIsIFxuLy8gICAgIFwiYm9yZGVyXCIsIFxuLy8gICAgIFwiYm9yZGVyQ29sb3JcIiwgXG4vLyAgICAgXCJib3JkZXJTdHlsZVwiLCBcbi8vICAgICBcImxlZnRCb3JkZXJcIiwgXCJyaWdodEJvcmRlclwiLCBcInRvcEJvcmRlclwiLCBcImJvdHRvbUJvcmRlclwiLCBcImRpYWdvbmFsQm9yZGVyXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlckNvbG9yXCIsIFwicmlnaHRCb3JkZXJDb2xvclwiLCBcInRvcEJvcmRlckNvbG9yXCIsIFwiYm90dG9tQm9yZGVyQ29sb3JcIiwgXCJkaWFnb25hbEJvcmRlckNvbG9yXCIsIFxuLy8gICAgIFwibGVmdEJvcmRlclN0eWxlXCIsIFwicmlnaHRCb3JkZXJTdHlsZVwiLCBcInRvcEJvcmRlclN0eWxlXCIsIFwiYm90dG9tQm9yZGVyU3R5bGVcIiwgXCJkaWFnb25hbEJvcmRlclN0eWxlXCIsIFxuLy8gICAgIFwiZGlhZ29uYWxCb3JkZXJEaXJlY3Rpb25cIiwgXG4vLyAgICAgXCJudW1iZXJGb3JtYXRcIlxuLy8gXTtcblxubGV0IF9SaWNoVGV4dCA9IG51bGw7XG5cbi8qKlxuICogRGF0YSBmaWxsIHJvdXRpbmVzIHdyYXBwZXIuXG4gKiBAaWdub3JlXG4gKi9cbmNsYXNzIFhsc3hQb3B1bGF0ZUFjY2VzcyB7XG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiBYbHN4U21hcnRUZW1wbGF0ZSB3aXRoIGdpdmVuIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtXb3JrYm9va30gd29ya2Jvb2sgLSBUaGUgd29ya2Jvb2sgdG8gYmUgYWNjZXNzZWQuXG4gICAgICogQHBhcmFtIHtYbHN4UG9wdWxhdGV9IFhsc3hQb3B1bGF0ZSAtIFRoZSBhY3R1YWwgeGxzeC1wb3B1bGF0ZSBsaWJyYXJ5IG9iamVjdC5cbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGBYbHN4UG9wdWxhdGVgIG9iamVjdCBuZWVkIHRvIGJlIHBhc3NlZCBpbiBvcmRlciB0byBleHRyYWN0XG4gICAgICogY2VydGFpbiBpbmZvcm1hdGlvbiBmcm9tIGl0LCBfd2l0aG91dF8gcmVmZXJyaW5nIHRoZSB3aG9sZSBsaWJyYXJ5LCBhbmQgdGh1c1xuICAgICAqIG1ha2luZyB0aGUgYHhsc3gtZGF0YWZpbGxgIHBhY2thZ2UgZGVwZW5kZW50IG9uIGl0LlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdvcmtib29rLCBYbHN4UG9wdWxhdGUpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2sgPSB3b3JrYm9vaztcbiAgICAgICAgdGhpcy5fcm93U2l6ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fY29sU2l6ZXMgPSB7fTtcbiAgICBcbiAgICAgICAgX1JpY2hUZXh0ID0gWGxzeFBvcHVsYXRlLlJpY2hUZXh0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvbmZpZ3VyZWQgd29ya2Jvb2sgZm9yIGRpcmVjdCBYbHN4UG9wdWxhdGUgbWFuaXB1bGF0aW9uLlxuICAgICAqIEByZXR1cm5zIHtXb3JrYm9va30gVGhlIHdvcmtib29rIGludm9sdmVkLlxuICAgICAqL1xuICAgIHdvcmtib29rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fd29ya2Jvb2s7IFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNlbGwgdmFsdWUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIC0gVGhlIGNlbGwgdG8gcmV0cmlldmUgdGhlIHZhbHVlIGZyb20uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgY2VsbCdzIGNvbnRlbnRzLlxuICAgICAqL1xuICAgIGNlbGxUZXh0VmFsdWUoY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsVmFsdWUgPSBjZWxsLnZhbHVlKCk7XG4gICAgICAgIHJldHVybiBjZWxsVmFsdWUgaW5zdGFuY2VvZiBfUmljaFRleHQgPyBjZWxsVmFsdWUudGV4dCgpIDogY2VsbFZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1lYXN1cmVzIHRoZSBkaXN0YW5jZSwgYXMgYSB2ZWN0b3IgYmV0d2VlbiB0d28gZ2l2ZW4gY2VsbHMuXG4gICAgICogQHBhcmFtIHtDZWxsfSBmcm9tIFRoZSBmaXJzdCBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gdG8gVGhlIHNlY29uZCBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtBcnJheS48TnVtYmVyPn0gQW4gYXJyYXkgd2l0aCB0d28gdmFsdWVzIFs8cm93cz4sIDxjb2xzPl0sIHJlcHJlc2VudGluZyB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIGNlbGxzLlxuICAgICAqL1xuICAgIGNlbGxEaXN0YW5jZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgdG8ucm93TnVtYmVyKCkgLSBmcm9tLnJvd051bWJlcigpLFxuICAgICAgICAgICAgdG8uY29sdW1uTnVtYmVyKCkgLSBmcm9tLmNvbHVtbk51bWJlcigpXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB0aGUgc2l6ZSBvZiBjZWxsLCB0YWtpbmcgaW50byBhY2NvdW50IGlmIGl0IGlzIHBhcnQgb2YgYSBtZXJnZWQgcmFuZ2UuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSBjZWxsIHRvIGJlIGludmVzdGlnYXRlZC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE51bWJlcj59IEFuIGFycmF5IHdpdGggdHdvIHZhbHVlcyBbPHJvd3M+LCA8Y29scz5dLCByZXByZXNlbnRpbmcgdGhlIG9jY3VwaWVkIHNpemUuXG4gICAgICovXG4gICAgY2VsbFNpemUoY2VsbCkge1xuICAgICAgICBjb25zdCBjZWxsQWRkciA9IGNlbGwuYWRkcmVzcygpO1xuICAgICAgICBsZXQgdGhlU2l6ZSA9IFsxLCAxXTtcbiAgICBcbiAgICAgICAgXy5mb3JFYWNoKGNlbGwuc2hlZXQoKS5fbWVyZ2VDZWxscywgcmFuZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmFuZ2VBZGRyID0gcmFuZ2UuYXR0cmlidXRlcy5yZWYuc3BsaXQoXCI6XCIpO1xuICAgICAgICAgICAgaWYgKHJhbmdlQWRkclswXSA9PSBjZWxsQWRkcikge1xuICAgICAgICAgICAgICAgIHRoZVNpemUgPSB0aGlzLmNlbGxEaXN0YW5jZShjZWxsLCBjZWxsLnNoZWV0KCkuY2VsbChyYW5nZUFkZHJbMV0pKTtcbiAgICAgICAgICAgICAgICArK3RoZVNpemVbMF07XG4gICAgICAgICAgICAgICAgKyt0aGVTaXplWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIHJldHVybiB0aGVTaXplO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSByZWZlcmVuY2UgSWQgZm9yIGEgZ2l2ZW4gY2VsbCwgYmFzZWQgb24gaXRzIHNoZWV0IGFuZCBhZGRyZXNzLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gY2VsbCBUaGUgY2VsbCB0byBjcmVhdGUgYSByZWZlcmVuY2UgSWQgdG8uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGlkIHRvIGJlIHVzZWQgYXMgYSByZWZlcmVuY2UgZm9yIHRoaXMgY2VsbC5cbiAgICAgKi9cbiAgICBjZWxsUmVmKGNlbGwpIHtcbiAgICAgICAgcmV0dXJuIGNlbGwuYWRkcmVzcyh7IGluY2x1ZGVTaGVldE5hbWU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYSByZWZlcmVuY2Ugc3RyaW5nIGZvciBhIGNlbGwgaWRlbnRpZmllZCBieSBAcGFyYW0gYWRyLCBmcm9tIHRoZSBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgQSBjZWxsIHRoYXQgaXMgYSBiYXNlIG9mIHRoZSByZWZlcmVuY2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkciBUaGUgYWRkcmVzcyBvZiB0aGUgdGFyZ2V0IGNlbGwsIGFzIG1lbnRpb25lZCBpbiBAcGFyYW0gY2VsbC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBBIHJlZmVyZW5jZSBzdHJpbmcgaWRlbnRpZnlpbmcgdGhlIHRhcmdldCBjZWxsIHVuaXF1ZWx5LlxuICAgICAqL1xuICAgIGJ1aWxkUmVmKGNlbGwsIGFkcikge1xuICAgICAgICByZXR1cm4gYWRyID8gY2VsbC5zaGVldCgpLmNlbGwoYWRyKS5hZGRyZXNzKHsgaW5jbHVkZVNoZWV0TmFtZTogdHJ1ZSB9KSA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGEgZ2l2ZW4gY2VsbCBmcm9tIGEgZ2l2ZW4gc2hlZXQgKG9yIGFuIGFjdGl2ZSBvbmUpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdHxhcnJheX0gYWRkcmVzcyBUaGUgY2VsbCBhZHJlc3MgdG8gYmUgdXNlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGlkeH0gc2hlZXRJZCBUaGUgaWQvbmFtZSBvZiB0aGUgc2hlZXQgdG8gcmV0cmlldmUgdGhlIGNlbGwgZnJvbS4gRGVmYXVsdHMgdG8gYW4gYWN0aXZlIG9uZS5cbiAgICAgKiBAcmV0dXJucyB7Q2VsbH0gQSByZWZlcmVuY2UgdG8gdGhlIHJlcXVpcmVkIGNlbGwuXG4gICAgICovXG4gICAgZ2V0Q2VsbChhZGRyZXNzLCBzaGVldElkKSB7XG4gICAgICAgIGNvbnN0IHRoZVNoZWV0ID0gc2hlZXRJZCA9PSBudWxsID8gdGhpcy5fd29ya2Jvb2suYWN0aXZlU2hlZXQoKSA6IHRoaXMuX3dvcmtib29rLnNoZWV0KHNoZWV0SWQpO1xuICAgICAgICByZXR1cm4gdGhlU2hlZXQuY2VsbChhZGRyZXNzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGFuZCByZXR1cm5zIHRoZSByYW5nZSBzdGFydGluZyBmcm9tIHRoZSBnaXZlbiBjZWxsIGFuZCBzcGF3bmluZyBnaXZlbiByb3dzIGFuZCBjZWxscy5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIHN0YXJ0aW5nIGNlbGwgb2YgdGhlIHJhbmdlLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByb3dPZmZzZXQgTnVtYmVyIG9mIHJvd3MgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgcm93LlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb2xPZmZzZXQgTnVtYmVyIG9mIGNvbHVtbnMgYXdheSBmcm9tIHRoZSBzdGFydGluZyBjZWxsLiAwIG1lYW5zIHNhbWUgY29sdW1uLlxuICAgICAqIEByZXR1cm5zIHtSYW5nZX0gVGhlIGNvbnN0cnVjdGVkIHJhbmdlLlxuICAgICAqL1xuICAgIGdldENlbGxSYW5nZShjZWxsLCByb3dPZmZzZXQsIGNvbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2VsbC5yYW5nZVRvKGNlbGwucmVsYXRpdmVDZWxsKHJvd09mZnNldCwgY29sT2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgY2VsbCBhdCBhIGNlcnRhaW4gb2Zmc2V0IGZyb20gYSBnaXZlbiBvbmUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBjZWxsIFRoZSByZWZlcmVuY2UgY2VsbCB0byBtYWtlIHRoZSBvZmZzZXQgZnJvbS5cbiAgICAgKiBAcGFyYW0ge2ludH0gcm93cyBOdW1iZXIgb2Ygcm93cyB0byBvZmZzZXQuXG4gICAgICogQHBhcmFtIHtpbnR9IGNvbHMgTnVtYmVyIG9mIGNvbHVtbnMgdG8gb2Zmc2V0LlxuICAgICAqIEByZXR1cm5zIHtDZWxsfSBUaGUgcmVzdWx0aW5nIGNlbGwuXG4gICAgICovXG4gICAgb2Zmc2V0Q2VsbChjZWxsLCByb3dzLCBjb2xzKSB7XG4gICAgICAgIHJldHVybiBjZWxsLnJlbGF0aXZlQ2VsbChyb3dzLCBjb2xzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXJnZSBvciBzcGxpdCByYW5nZSBvZiBjZWxscy5cbiAgICAgKiBAcGFyYW0ge1JhbmdlfSByYW5nZSBUaGUgcmFuZ2UsIGFzIHJldHVybmVkIGZyb20gQHNlZSBnZXRDZWxsUmFuZ2UoKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXR1cyBUaGUgbWVyZ2VkIHN0YXR1cyB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgc2V0UmFuZ2VNZXJnZWQocmFuZ2UsIHN0YXR1cykge1xuICAgICAgICByYW5nZS5tZXJnZWQoc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSXRlcmF0ZSBvdmVyIGFsbCB1c2VkIGNlbGxzIG9mIHRoZSBnaXZlbiB3b3JrYm9vay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYiBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGBjZWxsYCBhcmd1bWVudCBmb3IgZWFjaCB1c2VkIGNlbGwuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGNoYWluIGludm9rZXMuXG4gICAgICovXG4gICAgZm9yQWxsQ2VsbHMoY2IpIHtcbiAgICAgICAgdGhpcy5fd29ya2Jvb2suc2hlZXRzKCkuZm9yRWFjaChzaGVldCA9PiBzaGVldC51c2VkUmFuZ2UoKS5mb3JFYWNoKGNiKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvcGllcyB0aGUgc3R5bGVzIGZyb20gYHNyY2AgY2VsbCB0byB0aGUgYGRlc3RgLWluYXRpb24gb25lLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBEZXN0aW5hdGlvbiBjZWxsLlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gc3JjIFNvdXJjZSBjZWxsLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTdHlsZShkZXN0LCBzcmMpIHtcbiAgICAgICAgaWYgKHNyYyA9PSBkZXN0KSByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAoc3JjLl9zdHlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5zdHlsZShzcmMuX3N0eWxlKTtcbiAgICAgICAgZWxzZSBpZiAoc3JjLl9zdHlsZUlkID4gMClcbiAgICAgICAgICAgIGRlc3QuX3N0eWxlSWQgPSBzcmMuX3N0eWxlSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNpemUgdGhlIGNvbHVtbiBhbmQgcm93IG9mIHRoZSBkZXN0aW5hdGlvbiBjZWxsLCBpZiBub3QgY2hhbmdlZCBhbHJlYWR5LlxuICAgICAqIEBwYXJhbSB7Q2VsbH0gZGVzdCBUaGUgZGVzdGluYXRpb24gY2VsbCB3aGljaCByb3cgYW5kIGNvbHVtbiB0byByZXNpemUuXG4gICAgICogQHBhcmFtIHtDZWxsfSBzcmMgVGhlIHNvdXJjZSAodGVtcGxhdGUpIGNlbGwgdG8gdGFrZSB0aGUgc2l6ZSBmcm9tLlxuICAgICAqIEByZXR1cm5zIHtYbHN4UG9wdWxhdGVBY2Nlc3N9IEZvciBpbnZvY2F0aW9uIGNoYWluaW5nLlxuICAgICAqL1xuICAgIGNvcHlTaXplKGRlc3QsIHNyYykge1xuICAgICAgICBjb25zdCByb3cgPSBkZXN0LnJvd051bWJlcigpLFxuICAgICAgICAgICAgY29sID0gZGVzdC5jb2x1bW5OdW1iZXIoKTtcblxuICAgICAgICBpZiAodGhpcy5fcm93U2l6ZXNbcm93XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5yb3coKS5oZWlnaHQodGhpcy5fcm93U2l6ZXNbcm93XSA9IHNyYy5yb3coKS5oZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5fY29sU2l6ZXNbY29sXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGVzdC5jb2x1bW4oKS53aWR0aCh0aGlzLl9jb2xTaXplc1tjb2xdID0gc3JjLmNvbHVtbigpLndpZHRoKCkpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgYSB2YWx1ZSBpbiB0aGUgY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIFRoZSBzdHJpbmcgdmFsdWUgdG8gYmUgc2V0IGluc2lkZS5cbiAgICAgKiBAcmV0dXJucyB7WGxzeFBvcHVsYXRlQWNjZXNzfSBGb3IgaW52b2NhdGlvbiBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBzZXRWYWx1ZShjZWxsLCB2YWx1ZSkge1xuICAgICAgICBjZWxsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyBhIG5hbWVkIHN0eWxlIG9mIGEgZ2l2ZW4gY2VsbC5cbiAgICAgKiBAcGFyYW0ge0NlbGx9IGNlbGwgVGhlIGNlbGwgdG8gYmUgb3BlcmF0ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIHN0eWxlIHByb3BlcnR5IHRvIGJlIHNldC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIFRoZSB2YWx1ZSBmb3IgdGhpcyBwcm9wZXJ0eSB0byBiZSBzZXQuXG4gICAgICogQHJldHVybnMge1hsc3hQb3B1bGF0ZUFjY2Vzc30gRm9yIGludm9jYXRpb24gY2hhaW5pbmcuXG4gICAgICovXG4gICAgc2V0U3R5bGUoY2VsbCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY2VsbC5zdHlsZShuYW1lLCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBYbHN4UG9wdWxhdGVBY2Nlc3M7XG4iXX0=
