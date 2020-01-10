<a name="XlsxDataFill"></a>

## XlsxDataFill
Data fill engine.

**Kind**: global class  

* [XlsxDataFill](#XlsxDataFill)
    * [new XlsxDataFill(accessor, opts)](#new_XlsxDataFill_new)
    * _instance_
        * [.options(newOpts)](#XlsxDataFill+options) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code>
        * [.parseExtractor(extractor)](#XlsxDataFill+parseExtractor) ⇒ <code>object.&lt;string, function()&gt;</code>
        * [.applyDataStyle(cell, data, template)](#XlsxDataFill+applyDataStyle) ⇒ <code>DataFiller</code>
        * [.parseTemplate(cell)](#XlsxDataFill+parseTemplate) ⇒ <code>Object</code>
        * [.collectTemplates(cb)](#XlsxDataFill+collectTemplates) ⇒ <code>undefined</code>
        * [.extractValues(root, extractor)](#XlsxDataFill+extractValues) ⇒ <code>string</code> \| <code>Array</code> \| <code>Array.&lt;Array.&lt;\*&gt;&gt;</code>
        * [.extractData(root, iterators, idx)](#XlsxDataFill+extractData) ⇒ <code>Array</code> \| <code>Array.&lt;Array&gt;</code>
        * [.putValues(cell, data, template)](#XlsxDataFill+putValues) ⇒ <code>Array</code>
        * [.applyFill(aFill, root, mainCell)](#XlsxDataFill+applyFill) ⇒ <code>Array</code>
        * [.fillData(data)](#XlsxDataFill+fillData) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill)
    * _static_
        * [.XlsxPopulateAccess](#XlsxDataFill.XlsxPopulateAccess) : [<code>XlsxPopulateAccess</code>](#new_XlsxPopulateAccess_new)

<a name="new_XlsxDataFill_new"></a>

### new XlsxDataFill(accessor, opts)
Constructs a new instance of XlsxDataFill with given options.


| Param | Type | Description |
| --- | --- | --- |
| accessor | <code>object</code> | An instance of XLSX data accessing class. |
| opts | <code>Object</code> | Options to be used during processing. |
| opts.templateRegExp | <code>RegExp</code> | The regular expression to be used for template parsing. |
| opts.fieldSplitter | <code>string</code> | The string to be expected as template field splitter. |
| opts.joinText | <code>string</code> | The string to be used when extracting array values. |
| opts.callbacksMap | <code>object.&lt;string, function()&gt;</code> | A map of handlers to be used for data extraction. |

<a name="XlsxDataFill+options"></a>

### xlsxDataFill.options(newOpts) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code>
Setter/getter for XlsxDataFill's options as set during construction.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: [<code>XlsxDataFill</code>](#XlsxDataFill) \| <code>Object</code> - The required options or XlsxDataFill (in set mode) for chaining.  

| Param | Type | Description |
| --- | --- | --- |
| newOpts | <code>Object</code> \| <code>null</code> | If set - the news options to be used. |

<a name="XlsxDataFill+parseExtractor"></a>

### xlsxDataFill.parseExtractor(extractor) ⇒ <code>object.&lt;string, function()&gt;</code>
Parses the provided extractor (ot iterator) string to find a callback id inside, if present.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>object.&lt;string, function()&gt;</code> - A { `path`, `handler` } object representing the JSON path
ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.  

| Param | Type | Description |
| --- | --- | --- |
| extractor | <code>string</code> | The iterator/extractor string to be investigated. |

<a name="XlsxDataFill+applyDataStyle"></a>

### xlsxDataFill.applyDataStyle(cell, data, template) ⇒ <code>DataFiller</code>
Applies the style part of the template onto a given cell.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>DataFiller</code> - For invocation chaining.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The destination cell to apply styling to. |
| data | <code>Object</code> | The data chunk for that cell. |
| template | <code>Object</code> | The template to be used for that cell. |

<a name="XlsxDataFill+parseTemplate"></a>

### xlsxDataFill.parseTemplate(cell) ⇒ <code>Object</code>
This method builds template info, taking into account the supplied options.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>Object</code> - The parsed template.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Cell</code> | The cell containing the template to be parsed. |

<a name="XlsxDataFill+collectTemplates"></a>

### xlsxDataFill.collectTemplates(cb) ⇒ <code>undefined</code>
The templates collected are sorted, based on the intra-template reference - if one template
is referring another one, it'll appear _later_ in the returned array, than the referred template.
This is the order the callback is being invoked on.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  

| Param | Type | Description |
| --- | --- | --- |
| cb | <code>function</code> | The callback to be invoked on each templated, after they are sorted. |

<a name="XlsxDataFill+extractValues"></a>

### xlsxDataFill.extractValues(root, extractor) ⇒ <code>string</code> \| <code>Array</code> \| <code>Array.&lt;Array.&lt;\*&gt;&gt;</code>
This method is used even when a whole - possibly rectangular - range is about to be set, so it can
return an array of arrays.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>string</code> \| <code>Array</code> \| <code>Array.&lt;Array.&lt;\*&gt;&gt;</code> - The value to be used.  

| Param | Type | Description |
| --- | --- | --- |
| root | <code>Object</code> | The data root to be extracted values from. |
| extractor | <code>string</code> | The extraction string provided by the template. Usually a JSON path within the data `root`. |

<a name="XlsxDataFill+extractData"></a>

### xlsxDataFill.extractData(root, iterators, idx) ⇒ <code>Array</code> \| <code>Array.&lt;Array&gt;</code>
Extracts an array (possibly of arrays) with data for the given fill, based on the given
root object.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>Array</code> \| <code>Array.&lt;Array&gt;</code> - An array (possibly of arrays) with extracted data.  

| Param | Type | Description |
| --- | --- | --- |
| root | <code>Object</code> | The main reference object to apply iterators to. |
| iterators | <code>Array</code> | List of iterators - string JSON paths inside the root object. |
| idx | <code>Number</code> | The index in the iterators array to work on. |

<a name="XlsxDataFill+putValues"></a>

### xlsxDataFill.putValues(cell, data, template) ⇒ <code>Array</code>
Put the data values into the proper cells, with correct extracted values.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>Array</code> - Matrix size that this data has occupied on the sheet [rows, cols].  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>Object</code> | The starting cell for the data to be put. |
| data | <code>Array</code> | The actual data to be put. The values will be _extracted_ from here first. |
| template | <code>Object</code> | The template that is being implemented with that data fill. |

<a name="XlsxDataFill+applyFill"></a>

### xlsxDataFill.applyFill(aFill, root, mainCell) ⇒ <code>Array</code>
Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: <code>Array</code> - The size of the data put in [row, col] format.  

| Param | Type | Description |
| --- | --- | --- |
| aFill | <code>Object</code> | The fill to be applied, as constructed in the @see populate methods. |
| root | <code>Object</code> | The data root to be used for data extraction. |
| mainCell | <code>Cell</code> | The starting cell for data placement procedure. |

<a name="XlsxDataFill+fillData"></a>

### xlsxDataFill.fillData(data) ⇒ [<code>XlsxDataFill</code>](#XlsxDataFill)
The main entry point for whole data population mechanism.

**Kind**: instance method of [<code>XlsxDataFill</code>](#XlsxDataFill)  
**Returns**: [<code>XlsxDataFill</code>](#XlsxDataFill) - For invocation chaining.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The data to be applied. |

<a name="XlsxDataFill.XlsxPopulateAccess"></a>

### XlsxDataFill.XlsxPopulateAccess : [<code>XlsxPopulateAccess</code>](#new_XlsxPopulateAccess_new)
The built-in accessor based on xlsx-populate npm module

**Kind**: static property of [<code>XlsxDataFill</code>](#XlsxDataFill)  
