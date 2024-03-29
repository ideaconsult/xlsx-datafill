# Xlsx smart templates DataFill

[![DOI](https://zenodo.org/badge/233575902.svg)](https://zenodo.org/badge/latestdoi/233575902)

The library takes an existing `.xlsx` file and _populates_ the extracted data from provided `JSON`, into the designated cell**s**, which we call _templates_. If the extracted data is an array - it is expanded and occupies as many cells, as the size of the data. In both dimensions.

Each template follows a specific format and structure, and it defines these crucial aspects:

* Where is the data coming from?
* How is the data extracted?
* How are the values for the cells extracted from the data?
* How are the cell styles tweaked?

All these in the context of the provided JavaScript object. If you've alrady know the story - check the [API](./API.md).

## Few examples that explain it all

Consider the following JSON:

```json
{
	"title": "An exemplary title",
	"rows": [
		{
			"header": "Row 1",
			"data": [11, 12, 13, 14, 15]
		}, {
			"header": "Row 2",
			"data": [21, 22, 23, 24, 25]
		}, {
			"header": "Row 3",
			"data": [31, 32, 33, 34, 35]
		}
	]
}
```

A cell with the following content: `{{ | | title }}` will be expanded into `An exemplary title` after the data is filled. More information on the [template format](#template-format) will be given in a second.

Consider this cell content: `{{ | rows | header }}`. It’ll be expanded into three cells, in a column. Like this:

|  | A |
|--------|--------|
| 1 | Row 1 |
| 2 | Row 2 |
| 3 | Row 3 |

The template defines that the _data_ should be extracted from `rows` - which results in an array of 3 objects, and the _values_ for the target cells - 3, of course - should be extracted using the `header` _path_ inside each of the entries in the extracted _data_.

So far, the data was extracted from the root of the initially provided JavaScript object. However, each template can refer another one, taking the data extracted from it, as a basis for its own processing.

<a id="nested-blocks">Nested blocks</a>. Consider this spreadsheet:

|      | A                       | B                       | C    | D    | E    | F    |
| ---- | ----------------------- | ----------------------- | ---- | ---- | ---- | ---- |
| 1    | {{ \| rows \| header }} | {{ A1 \| 1 * data \| }} |      |      |      |      |
| 2    |                         |                         |      |      |      |      |
| 3    |                         |                         |      |      |      |      |

The template in `A1` is clear - it expands into the range `A1:A3` as expected. The template in `B1`, however, introduces two new, interesting aspects. First, it _refers_ another template - the one in `A1`, and second - it gives strange notion of how the data is extracted -  `1 * data`, instead of just `data`. 

The second one is simple - since the general data extraction form is `<rows> * <columns>` and, for example `rows` (in `A1`) is a shorthand for `rows * 1`, so the `1 * data` instructs the engine to expand the retrieved data horizontally (i.e. in many columns, but a single row), rather than vertically.

The first one - the reference - means that the `B1` will _not_ extract the data directly from the provided JS object, but rather - _from the data already extracted from the referred template_. And this happens for _each data entry_ extracted from the referred template.

Replaying in "slow-mo", the whole data extract & placement process will look like:

1. The engine processes `A1` template:
   1. Extracts the data, resulting in an array of 3 _objects_ (exactly the one referred by `rows` property).
   2. From each of these object, a value is extracted using the `header` property, resulting in the following array: `[“Row 1”, “Row 2”, “Row 3”]`.
   3. The values are placed from the template’s cell (`A1`) downwards.
2. **For each** of the objects in the array, extracted in [1.a], all dependent templates - in this case `B1` are processed. We’ll show the processing for only the `{ “header”: “Row 1”, “data”: [...]}` object:
   1. Data is extracted using the `data` property _from the provided reference object_, resulting in an array of 5 numbers.
   2. Since there is no additional _value extractor_ - the data is used as is, for filling the cells - in this case in the range `B1:F1`.
   3. The same process is repeated for _all three_ of the objects extracted in step [1.b].

The resulting table will look like:

|      | A     | B    | C    | D    | E    | F    |
| ---- | ----- | ---- | ---- | ---- | ---- | ---- |
| 1    | Row 1 | 11   | 12   | 13   | 14   | 15   |
| 2    | Row 2 | 21   | 22   | 23   | 24   | 25   |
| 3    | Row 3 | 31   | 32   | 33   | 34   | 35   |

If you want to get a real feel about the power of the engine — check the [multi-dimensional example](./examples/multid-output.xlsx), showing how an automatically generated [5D data](./examples/gen-data-5d.json) can get expanded throughout the sheet, [by a simple template](./examples/multid-template.xlsx).

**Great! That’s it!**

_One more thing..._ As the general syntax of the data extraction suggests - there is another, more elegant way to achieve the same result. The template in `B1` could have be written in the following form: `{{ | rows * data | }}`. Quite natural to write, and should be clear, by now, why it leads to the same result.

There is one more heavy lifting task that the engine does - it automatically _merges cells_, if the referring template turns to occupy more than one cell in the same dimension. In other words, if the template in `B1` was written as `{{ A1 | data | }}`, (i.e. without the `1*` part), this would instruct the engine to grow the data vertically. But, the data from `A1` template, already grows vertically, so the engine will have to make the `A1` cells “bigger”, i.e. occupying more rows. The result will look like this:

|      | A     | B    |
| ---- | ----- | ---- |
| 1    | Row 1 | 11   |
| 2    |       | 12   |
| 3    |       | 13   |
| 4    |       | 14   |
| 5    |       | 15   |
| 6    | Row 2 | 21   |
| 7    |       | 22   |

... at least, these are the first 7 rows of it. Cells `A1:A5` will be merged, just like `A6:A10`, and `A11:A15`.

Hope it is clear by now. Check this and the [other examples](./examples/).

## How to use it

The actual access to a XLSX notebook is delegated to an external library, through a so-called _accessor_, and there is currently one implementation, based on [`xlsx-populate`](https://github.com/dtjohnson/xlsx-populate) library. Check the [API](./API.md) to see how a custom one can be implemented.

Considering the existing accessor implementation, the use of `xlsx-datafill` is quite simple:

```javascript
// Open the notebook and create the accessor for it
const wb = await XlsxPopulate.fromFileAsync(path);
const xlsxAccess = new XlsxPopulateAccess(wb, XlsxPopulate);

// Create an instance of XlsxDataFill and provide custom
// options.
const dataFill = new XlsxDataFill(xlsxAccess, { 
  callbacksMap: ... // Some custom handlers.
});
  
// Make the actual processing of `data`.
dataFill.fillData(data);

// The data in populated inside the `wb`, so it can be used.
wb.workbook().toFileAsync(...);

```

> **Note**: The template definitions are overwritten by the actual data, so don’t expect to be able to run `fillData()` with different data.

Check the [template options section](#template-options) for more information on how to configure the `XlsxDataFill` instance.

Refer to the [examples](./examples/) folder, as well as to the [API documentation](./API.md) for more and deeper documentation.

## <a name="template-format">Template format</a>

The general format of each template is like follows:

```
{{ <reference cell>
 | <iterators>
 | <extractor>
 | <padding>
 | <styling> }}
```

Both the surrounding `{{`mustache`}}` brackets, and the `|` separator symbol are configurable, via [XlsxDataFill](./API.md#XlsxDataFill) constructor’s options.

The meaning of each field is:

| Field       | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `reference` | The address of a cell, to be used as a reference for data extraction. If empty - the provided object’s root is considered. In both cases this is referred as _template data root_ in the rest of the description. |
| `iterators` | JSON paths, determining how the data should be extracted from the _template data root_, and it follows the form <br />`<row data path> * <column data path>`. <br />The `<row path>` is applied on the _template data root_, while the `<col path` works on the result of `<row path>` extraction. If one needs the data to grow vertically (i.e. only as a column), the form `1 * <col path>` is allowed, in which case `<col path>` works directly on the _template data root_.<br />Can be empty, if the _template data root_ itself should be used. |
| `extractor` | A JSON path, determining how the value that needs to be written in the cell(s) should be extracted from the data, provided by the iterators.<br />Can be omitted, in which case the iterators’ provided data is taken as a whole. |
| `padding`   | A `:` delimited pair specifying how many cells on each direction `row:column` need to be _added_ for each new entry from the extracted data. Can be omitted. |
| `styling`   | A comma-delimited styling pairs of the format `<style name>=<extractor>`, setting each cell’s style (with the given name), to the value extracted from iterator’s data, using the `extractor` as a JSON path. E.g. `fill='red'` will set the `fill` style of each of the cells to `red`. <br />It is allowed to pass a handler as value (e.g. `fill=:dangerColor` will set fill color to the value returned by `dangerColor` handler). Also, any of the [options](#template-options) can be overridden, by providing it here with a `!` as prefix - e.g. `!mergeCells=false` will set this options to _false_ only for this template. |

The _JSON path_, mentioned above, refers to the ability to provide a full **path** of properties from the _template data root_ instead of just one property. So valid paths are, for example: `rows`, `genres.fiction`, `data[0].name`, etc. Check the [lodash’s `get` helper](https://lodash.com/docs/4.17.15#get), because this is what is used.

In order to add additional flexibility, one can reference a user-provided function (via [template options](#template-options)) for both _iterators_ and _extractors_, including those used for styling. If a JSON-path component is suffixed with `:<handler name>` (e.g. `data:dataFix`, or even just `:dataGive`), the result of invoking the corresponding handler is used. The expected definition of such handler is:

```javascript
/**
 * @param {object} data The data base for the current context. 
 * @param {Cell} cell A target cell, if applicable.
 * @returns {*} The required value.
 */
function myHandler(data, cell);

```

Few things need to be clarified. First, the context (i.e. `this`) provided is the _options_ object, as provided upon [XlsxDataFill instantiation](./API.md#new_XlsxDataFill_new).

The `data` object is the one that corresponds to the given context. For example, in the following template:

```
{{ A1 | rows:hRows * data:hData | :hNumber }}
```
All three handlers `hRows`, `hData` and `hNumber` will be invoked with different `data` argument - `hRows` will receive whatever `rows` extracted, `hData` will receive, whatever `hRows` returned (!), and `hNumber` will be given whatever `hData` returned. 

In other words:

> Handlers are applied **after**, and their result taken **instead of**, whatever data is extracted with the JSON path.

Another interesting thing is styling. It is quite straightforward, however. Each named style, as recognized by [accessor’s `setStyle()` method](./API.md#XlsxPopulateAccess+setStyle), is referred and the value is extracted in the usual way (JSON path + handler).

## <a name="template-options">Template options</a>

Here are the options and their defaults.

```javascript
{
    templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
    fieldSplitter: "|",
    joinText: ",",                     
    mergeCells: true,
    duplicateCells: false,
    followFormulae: false,
    copyStyle: true,
    callbacksMap: {
        '': data => _.keys(data),
        $: data => _.values(data)
    }
};

```

Check the [detailed description in the API](API.md#new-xlsxdatafillaccessor-opts). It is worth noting the `mergeCells` and `duplicateCells` behavior. 

First, they both have the same set of possible values: `true`, `false`, `”both”`, `”vertical”`, `”horizontal”` – in which direction the cells need to be merged/duplicated. As expected `true` and `”both”` have the same meaning.

Second, cells duplication is valid only when merging is disabled, in other words, if `mergeCells == true`, `duplicateCells` is ignored. Given these options:

```js
mergeCells: "vertical",
duplicateCells: true
```

Is interpreted as follow:

* If during data expansion a value in higher dimension occupies more than one cell in a **column**, they are merged – because these are _vertical_.
* If a value from higher dimension occupies more than one cell in a **row**, then duplication options is taken into account and same value is duplicated on all these cells.

## <a id="formulae-handling">Formulae handling</a>

As formulas are a key Excel feature, so `xlsx-datafill` is trying to keep them alive and meaningful. As a basic rule _Raw formulas are kept as they are, only those put in a template format, are handled_.

So, the [template format](#template-format) has slightly different version:

* `iterators` determine how the formula will be populated, and is one of the following values: `both`, `rows`, `cols` or `none`. The latter can be replaced with an empty value.
* `extractor` is the actual formula and **must** start with `=` so the engine recognizes it as such.
* `reference` should be present, otherwise an error will be issued. If a non-referenced formula is needed - just don’t use the template format.

Two operations are performed during data population of the referenced template - _formula alteration_ and _formula population_. How this happens depends on the value inside `iterators` field:

* When `none` is selected, the formula is not populated - The ranges inside it are expanded to match the size of the referenced data block.
* When `cols` is selected, the formula is populated across the columns of referenced data block, while each range inside the formula is expanded across the rows of the data block.
* When `rows` is selected, the population and expanding processes are reversed - the formula is populated across rows, and the ranges inside are expanded across columns.
* Finally, when `both` is selected - the formula is not expanded - it is just populated across the same area of cells, as the referenced data block.

It is important to note, that the formula population starts from the cell with the _formula_ template, or one with the same offset, as the current data block - review the [nested blocks](#nested-blocks) concept for more information.

### Few examples

Consider the following template (and the same data as the previous examples):

|      | A                       | B                         | C    | D    | E    | F    |
| ---- | :---------------------- | ------------------------- | ---- | ---- | ---- | ---- |
| 1    | {{ \| rows \| header }} | {{ \| rows * data \| }}   |      |      |      |      |
| 2    |                         |                           |      |      |      |      |
| 3    |                         |                           |      |      |      |      |
| 4    | Formula:                | {{ B1 \|\| =SUM(B1:B1) }} |      |      |      |      |

Will result in the following output table:
|      | A        | B    | C    | D    | E    | F    |
| ---- | -------- | ---- | ---- | ---- | ---- | ---- |
| 1    | Row 1    | 11   | 12   | 13   | 14   | 15   |
| 2    | Row 2    | 21   | 22   | 23   | 24   | 25   |
| 3    | Row 3    | 31   | 32   | 33   | 34   | 35   |
| 4    | Formula: | 345  |      |      |      |      |

With the formula inside `B4` being altered to `=SUM(B1:F3)`. The skipped `iterators` field is synonym of `none`, therefore - no population, just expansion.

If the _formula template_ was this one: `{{ B1 | cols | =SUM(B1:B1) }}`, then the resulting table would be this:

|      | A        | B    | C    | D    | E    | F    |
| ---- | -------- | ---- | ---- | ---- | ---- | ---- |
| 1    | Row 1    | 11   | 12   | 13   | 14   | 15   |
| 2    | Row 2    | 21   | 22   | 23   | 24   | 25   |
| 3    | Row 3    | 31   | 32   | 33   | 34   | 35   |
| 4    | Formula: | 63   | 66   | 69   | 72   | 75   |

The formula was populated across the columns, with each one being expanded across rows, i.e. the formula in `C4` will be `=SUM(C1:C3)`.

Specifying `both` as _iterators_ keyword will result in the same size (3x5 in this example) table. It _does_ make sense if it includes anchored references, i.e a template like this `{{ B1 | both | =B1 * $A$5 }}` will result in a 3x5 table, starting from `B4`, with each value from `B1:F3` being multiplied by the value in `A5`. For example the formula in `C4` would be `C1 * $A$5`.

## Some important notes

There are several specifics to be kept in mind:

* The _iterators_ usually resolve to an array. If it resolves to an object, and still some iteration is expected — it can be converted to an array of object’s values, using the `$` handler (i.e. appending `:$`). If you need the keys (as opposed to object’s values) — append `:` to the last iterator, i.e. utilizing an empty _extraction handler_. Both of these default handlers can be overridden with the provided options.
* If during _value_ extraction, the result is an array — it is automatically joined, using the (configurable) `joinText` from the options.
* No matter what part of the cell’s value the template definition occupies, at the end — the whole cell is overwritten with the resolved value(s). Since, this is not a simple find-and-replace, and the cells need duplication — it is not as trivial as expected. A possible workaround is to use handlers to append whatever is needed for each cell.
* The `xlsx-populate` library is _not_ a dependency, because (potentially in the future) other accessors can be used, so don’t expect it to be there if you just refer `xlsx-datafill`.

## Contribution

Any help is appreciated! Check [**the list in the repo**](https://github.com/ideaconsult/xlsx-datafill/labels/contribution). 

**Thank you!**

## [Changelog](https://github.com/ideaconsult/xlsx-datafill/releases)
