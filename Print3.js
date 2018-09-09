/*eslint no-eval: 0 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    'esri/tasks/PrintTask',
    'dojo/store/Memory',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-class',
    "dojo/query",
    'dojo/date/locale',
    'dojo/text!./Print3/templates/Print3.html',
    'dojo/text!./Print3/templates/PrintResult3.html',
    'esri/tasks/PrintTemplate',
    'esri/tasks/PrintParameters',
    'esri/request',
    'esri/urlUtils',
    'dojo/i18n!./Print3/nls/resource',
    'dijit/form/ValidationTextBox',    

    'dijit/form/Form',
    'dijit/form/FilteringSelect',
    'dijit/form/NumberTextBox',
    'dijit/form/Button',
    'dijit/form/CheckBox',
    'dijit/ProgressBar',
    'dijit/form/DropDownButton',
    'dijit/TooltipDialog',
    'dijit/form/RadioButton',
    'xstyle/css!./Print3/css/Print3.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, registry, PrintTask, Memory, lang, array, topic, dom, Style, domConstruct, domClass,query, locale, printTemplate, printResultTemplate, PrintTemplate, PrintParameters, esriRequest, urlUtils, i18n,ValidationTextBox) {

    // Print result dijit
    var PrintResultDijit = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: printResultTemplate,
        i18n: i18n,
        url: null,
        fileHandle: null,
        resultOrder: 'last', // first or last

        postCreate: function () {
            this.inherited(arguments);
            this.fileHandle.then(lang.hitch(this, '_onPrintComplete'), lang.hitch(this, '_onPrintError'));
        },
        _onPrintComplete: function (data) {
            if (data.url) {
                var proxyRule = urlUtils.getProxyRule(data.url);
                if (proxyRule && proxyRule.proxyUrl) {
                    this.url = proxyRule.proxyUrl + '?' + data.url;
                } else {
                    this.url = data.url;
                }
                this.nameNode.innerHTML = '<span class="bold">' + this.docName + '</span>';
                domClass.add(this.resultNode, 'printResultHover');
            } else {
                this._onPrintError(this.i18n.printResults.errorMessage);
            }
        },
        _onPrintError: function (err) {
            topic.publish('viewer/handleError', {
                source: 'Print',
                error: err
            });
            this.nameNode.innerHTML = '<span class="bold">' + i18n.printResults.errorMessage + '</span>';
            domClass.add(this.resultNode, 'printResultError');
        },
        _openPrint: function () {
            if (this.url !== null) {
                window.open(this.url);
            }
        },
        _handleStatusUpdate: function (event) {
            var jobStatus = event.jobInfo.jobStatus;
            if (jobStatus === 'esriJobFailed') {
                this._onPrintError(this.i18n.printResults.errorMessage);
            }
        }
    });

    // Main print dijit
    var PrintDijit = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: printTemplate,
        i18n: i18n,
        map: null,
        count: 1,
        results: [],
        authorText: '', 
        copyrightText: null,
        defaultTitle: null,
        defaultFormat: null,
        defaultLayout: null,
        baseClass: 'gis_PrintDijit',
        pdfIcon: require.toUrl('gis/dijit/Widgets/Print3/images/pdf.png'),
        imageIcon: require.toUrl('gis/dijit/Widgets/Print3/image.png'),
        printTaskURL: null,
        printTask: null,
        //customElementIds is new
        customElementIds: [],
        postCreate: function () {
            this.inherited(arguments);
            this.printparams = new PrintParameters();
            this.printparams.map = this.map;
            this.printparams.outSpatialReference = this.map.spatialReference;
            //this is new
            if (this.customElements) {
                console.log('about to add a new field!');
                this.addCustomfields();
            }                
            
            esriRequest({
                url: this.printTaskURL,
                content: {
                    f: 'json'
                },
                handleAs: 'json',
                callbackParamName: 'callback',
                load: lang.hitch(this, '_handlePrintInfo'),
                error: lang.hitch(this, '_handleError')
            });
            //aspect.after(this.printTask, '_createOperationalLayers', this.operationalLayersInspector, false);
        },
        //this is new
        addCustomfields: function (){
            var templateTable = this.printSettingsFormDijit.domNode;
            var inputTitleRow = query("table tbody tr:first-child", templateTable);   
            //var that = this;
            var custElements = [];
            array.forEach(this.customElements, function(item, index){
                var CustLabel = null;
                var newRow = null;
                var newinput = null;
                var inputDiv = null;
                var inputInsertSlot = null;
                if ( typeof(item) === 'object'){
                    for (var e in item){
                        console.log(item[e], ':', e);
                        CustLabel = item[e];
                        //that.customElementIds.push(e);
                        custElements.push(e);
                    }
                    if (e !== undefined){
                        //create some new DOM nodes to place the new input widget
                        newRow = domConstruct.toDom('<tr><td style="width:30px;">' + CustLabel + ':</td><td></td></tr>');
                        domConstruct.place(newRow, inputTitleRow[0], 'after'); 
                        inputInsertSlot = query('td:nth-child(2)', newRow);
                        inputDiv = domConstruct.toDom('<div></div>');
                        domConstruct.place(inputDiv, inputInsertSlot[0]);    
                        newinput= new ValidationTextBox({
                            required: false, 
                            style: 'width:100%', 
                            name: e
                        }, inputDiv);  
                        newinput.startup();                            
                    }
                }
            });     
            //if (that.customElementIds.length > -1) {
            if (custElements.length > -1) { 
                this.customElementIds = custElements; //that.customElementIds;
            }
        }, 
        operationalLayersInspector: function (opLayers) {
            array.forEach(opLayers, function (layer) {
                if (layer.id === 'Measurement_graphicslayer') {
                    array.forEach(layer.featureCollection.layers, function (fcLayer) {
                        array.forEach(fcLayer.featureSet.features, function (feature) {
                            delete feature.attributes;
                            feature.symbol.font.family = 'Courier';
                            //feature.symbol.font.variant = esri.symbol.Font.VARIANT_NORMAL;
                            //feature.symbol.font.size = '32pt';
                        });
                    });
                }
            });
            return opLayers;
        },
        _handleError: function (err) {
            topic.publish('viewer/handleError', {
                source: 'Print',
                error: err
            });
        },
        _handlePrintInfo: function (data) {
            this.printTask = new PrintTask(this.printTaskURL, {
                async: data.executionType === 'esriExecutionTypeAsynchronous'
            });
            var layoutTemplate = array.filter(data.parameters, function (param) {
                return param.name === 'Layout_Template';
            });
            if (layoutTemplate.length === 0) {
                topic.publish('viewer/handleError', {
                    source: 'Print',
                    error: 'Print service parameters name for templates must be \'Layout_Template\''
                });
                return;
            }
            var layoutItems = array.map(layoutTemplate[0].choiceList, function (item) {
                return {
                    name: item,
                    id: item
                };
            });
            layoutItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });
            var layout = new Memory({
                data: layoutItems
            });
            this.layoutDijit.set('store', layout);
            if (this.defaultLayout) {
                this.layoutDijit.set('value', this.defaultLayout);
            } else {
                this.layoutDijit.set('value', layoutTemplate[0].defaultValue);
            }

            var Format = array.filter(data.parameters, function (param) {
                return param.name === 'Format';
            });
            if (Format.length === 0) {
                topic.publish('viewer/handleError', {
                    source: 'Print',
                    error: 'Print service parameters name for format must be \'Format\''
                });
                return;
            }
            var formatItems = array.map(Format[0].choiceList, function (item) {
                return {
                    name: item,
                    id: item
                };
            });
            formatItems.sort(function (a, b) {
                return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
            });
            var format = new Memory({
                data: formatItems
            });
            this.formatDijit.set('store', format);
            if (this.defaultFormat) {
                this.formatDijit.set('value', this.defaultFormat);
            } else {
                this.formatDijit.set('value', Format[0].defaultValue);
            }

        },
        //this is new
        getCustomElementValues: function(form) {
            //collect form values for custom fields if they match customElementIds array
            var FormCustomElementsArray = [];
            if (this.customElementIds.length > -1){
                for (var eachEl in form) {
                    if (this.customElementIds.indexOf(eachEl) > -1 ) {
                        var custFieldObj = {};
                        custFieldObj[eachEl] = form[eachEl];
                        FormCustomElementsArray.push(custFieldObj);                        
                    }
                }   
                return FormCustomElementsArray;
            }
        },
        print: function () {
            if (this.printSettingsFormDijit.isValid()) {
                var form = this.printSettingsFormDijit.get('value');
                var preserve = this.preserveFormDijit.get('value');
                lang.mixin(form, preserve);
                var layoutForm = this.layoutFormDijit.get('value');
                var mapQualityForm = this.mapQualityFormDijit.get('value');
                var mapOnlyForm = this.mapOnlyFormDijit.get('value');
                lang.mixin(mapOnlyForm, mapQualityForm);
                //below custElementValues is new
                var custElementValues = null;
                custElementValues = this.getCustomElementValues(form);
                var template = new PrintTemplate();
                template.format = form.format;
                template.layout = form.layout;
                template.preserveScale = eval(form.preserveScale); //turns a string 'true' into true
                template.outScale = form.outScale;
                template.label = form.title;
                template.exportOptions = mapOnlyForm;
                template.layoutOptions = {
                    authorText: this.authorText,
                    copyrightText: this.copyrightText,
                    legendLayers: (layoutForm.legend.length > 0 && layoutForm.legend[0]) ? null : [],
                    titleText: form.title,
                    scalebarUnit: layoutForm.scalebarUnit,
                    //customTextElements is new
                    customTextElements: custElementValues.length > -1 ? custElementValues : []
                };
                this.printparams.template = template;

                var fileHandle = this.printTask.execute(this.printparams);
                var result = new PrintResultDijit({
                    count: this.count.toString(),
                    icon: (form.format === 'PDF') ? this.pdfIcon : this.imageIcon,
                    docName: form.title,
                    title: form.format + ', ' + form.layout + ', ' + locale.format(new Date(), {formatLength: 'short'}),
                    fileHandle: fileHandle
                }).placeAt(this.printResultsNode, this.resultOrder);

                if (this.printTask.async) {
                    result.own(this.printTask.printGp.on('status-update', lang.hitch(result, '_handleStatusUpdate')));
                }


                Style.set(this.clearActionBarNode, 'display', 'block');
                this.count++;
            } else {
                this.printSettingsFormDijit.validate();
            }
        },
        clearResults: function () {
            domConstruct.empty(this.printResultsNode);
            Style.set(this.clearActionBarNode, 'display', 'none');
            this.count = 1;
        }
    });

    return PrintDijit;
});
