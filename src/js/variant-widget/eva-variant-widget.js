/*
 * Copyright (c) 2014 Francisco Salavert (SGL-CIPF)
 * Copyright (c) 2014 Alejandro Alemán (SGL-CIPF)
 * Copyright (c) 2014 Ignacio Medina (EBI-EMBL)
 * Copyright (c) 2014 Jag Kandasamy (EBI-EMBL)
 *
 * This file is part of EVA.
 *
 * EVA is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * EVA is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EVA. If not, see <http://www.gnu.org/licenses/>.
 */
function EvaVariantWidget(args) {

    _.extend(this, Backbone.Events);

    this.id = Utils.genId("VariantWidget");
    //set default args
    this.target;
    this.width;
    this.height;
    this.autoRender = true;
    this.data = [];
    this.host;
    this.closable = true;
    this.filters = {
        segregation: true,
        maf: true,
        effect: true,
        region: true,
        gene: true
    };
    this.headerConfig;
    this.attributes = [];
    this.columns = [];
    this.samples = [];
    this.defaultToolConfig = {
        headerConfig: {
            baseCls: 'ocb-title-2'
        },
        genomeViewer: false,
        genotype: true,
        stats: true,
        populationStats: true,
        annotation: true,
        clinvarAssertion:true
    };
    this.tools = [];
    this.dataParser;
    this.responseParser;
    this.responseRoot = "response[0].result";
    this.responseTotal = "response[0].numTotalResults";
    this.startParam = "skip";

    this.browserGridConfig = {
        title: 'variant browser grid',
        border: true
    };
    this.toolPanelConfig = {
        title: 'Variant data',
        border: true
    };
    this.toolsConfig = {
        headerConfig: {
            baseCls: 'ocb-title-2'
        }
    };
    _.extend(this.filters, args.filters);
    _.extend(this.browserGridConfig, args.browserGridConfig);
    _.extend(this.defaultToolConfig, args.defaultToolConfig);

    delete args.filters;
    delete args.defaultToolConfig;
//set instantiation args, must be last
    _.extend(this, args);

    this.selectedToolDiv;

    this.rendered = false;
    if (this.autoRender) {
        this.render();
    }
}

EvaVariantWidget.prototype = {
    render: function () {
        var _this = this;

        //HTML skel
        this.div = document.createElement('div');
        this.div.setAttribute('id', this.id);

        this.variantBrowserGridDiv = document.createElement('div');
        this.variantBrowserGridDiv.setAttribute('class', 'ocb-variant-widget-grid');
        this.div.appendChild(this.variantBrowserGridDiv);

        this.variantBrowserGrid = this._createVariantBrowserGrid(this.variantBrowserGridDiv);

        this.tabPanelDiv = document.createElement('div');
        this.tabPanelDiv.setAttribute('class', 'ocb-variant-tab-panel');
        this.div.appendChild(this.tabPanelDiv);

        this.toolTabPanel = Ext.create("Ext.tab.Panel", {
            title: this.toolPanelConfig.title,
            border: this.toolPanelConfig.border,
            margin: '10 0 0 0',
            plain: true,
            animCollapse: false,
            header: this.toolPanelConfig.headerConfig,
            collapseDirection: Ext.Component.DIRECTION_BOTTOM,
            titleCollapse: true,
            overlapHeader: true,
            defaults: {
                border: false,
                hideMode: 'offsets',
                autoShow: true
            },
            listeners: {
                tabchange: function (tabPanel, newTab, oldTab, eOpts) {
                    _this.selectedToolDiv = newTab.contentEl.dom;
                    if (_this.lastVariant) {
                        _this.trigger('variant:change', {variant: _this.lastVariant, sender: _this});
                    }

                    if (_this.lastVariant && newTab.title == 'Genomic Context') {
                        _this.resizeGV();
                    }

                }
            }
        });

        var tabPanelItems = [];

        if (this.defaultToolConfig.annotation) {
            this.annotationPanelDiv = document.createElement('div');
            this.annotationPanelDiv.setAttribute('class', 'ocb-variant-stats-panel');
            this.annotationPanel = this._createAnnotationPanel(this.annotationPanelDiv);
            tabPanelItems.push({
                title: 'Annotation',
//                border: 0,
                contentEl: this.annotationPanelDiv
            });
        }

        if (this.defaultToolConfig.stats) {
            this.variantStatsPanelDiv = document.createElement('div');
            this.variantStatsPanelDiv.setAttribute('class', 'ocb-variant-stats-panel');
            this.variantStatsPanel = this._createVariantStatsPanel(this.variantStatsPanelDiv);
            tabPanelItems.push({
                title: 'Files',
//                border: 0,
                contentEl: this.variantStatsPanelDiv
            });
        }

        if (this.defaultToolConfig.genotype) {
            this.variantGenotypeGridPanelDiv = document.createElement('div');
            this.variantGenotypeGridPanelDiv.setAttribute('class', 'ocb-variant-genotype-grid');
            this.variantGenotypeGridPanel = this._createVariantGenotypeGridPanel(this.variantGenotypeGridPanelDiv);
            tabPanelItems.push({
                title: 'Genotypes',
//                border: 0,
                contentEl: this.variantGenotypeGridPanelDiv
            });
        }

        if (this.defaultToolConfig.genomeViewer) {
            this.genomeViewerDiv = document.createElement('div');
            this.genomeViewerDiv.innerHTML = '<h4></h4>';
            this.genomeViewerDiv.setAttribute('class', 'ocb-gv');
            $(this.genomeViewerDiv).css({border: '1px solid lightgray'});
            this.genomeViewer = this._createGenomeViewer(this.genomeViewerDiv);
            tabPanelItems.push({
                title: 'Genomic Context',
                border: 0,
                contentEl: this.genomeViewerDiv,
                overflowX: true
            });
        }

        if (this.defaultToolConfig.populationStats) {
            this.variantPopulationStatsPanelDiv = document.createElement('div');
            this.variantPopulationStatsPanelDiv.setAttribute('class', 'ocb-variant-rawdata-panel');
            this.variantPopulationStatsPanel = this._createVariantPopulationStatsPanel(this.variantPopulationStatsPanelDiv);
            tabPanelItems.push({
                title: 'Population Statistics',
//                border: 0,
                contentEl: this.variantPopulationStatsPanelDiv
            });
        }

        if (this.defaultToolConfig.clinvarAssertion) {
            this.clinvarAssertionPanelDiv = document.createElement('div');
            this.clinvarAssertionPanelDiv.setAttribute('class', 'ocb-variant-rawdata-panel');
            this.clinvarAssertionPanel = this._createClinvarAssertionPanel(this.clinvarAssertionPanelDiv);
            tabPanelItems.push({
                title: 'Clinical Assertion',
//                border: 0,
                contentEl: this.clinvarAssertionPanelDiv
            });
        }

        for (var i = 0; i < this.tools.length; i++) {
            var tool = this.tools[i];
            var toolDiv = document.createElement('div');

            tool.tool.target = toolDiv;

            tabPanelItems.push({
                title: tool.title,
                contentEl: toolDiv
            });
        }

        this.toolTabPanel.add(tabPanelItems);

        this.rendered = true;
    },
    draw: function () {
        var _this = this;
        this.targetDiv = (this.target instanceof HTMLElement ) ? this.target : document.querySelector('#' + this.target);
        if (!this.targetDiv) {
            console.log('EVAVAriantWidget target not found');
            return;
        }
        this.targetDiv.appendChild(this.div);

        this.variantBrowserGrid.draw();

        this.toolTabPanel.render(this.tabPanelDiv);

        for (var i = 0; i < this.toolTabPanel.items.items.length; i++) {
            this.toolTabPanel.setActiveTab(i);
        }

        if (this.defaultToolConfig.genotype) {
            this.variantGenotypeGridPanel.draw();
        }

        if (this.defaultToolConfig.genomeViewer) {
            this.genomeViewer.draw();
        }

        if (this.defaultToolConfig.annotation) {
            this.annotationPanel.draw();
        }

        if (this.defaultToolConfig.stats) {
            this.variantStatsPanel.draw();
        }

        if (this.defaultToolConfig.populationStats) {
            this.variantPopulationStatsPanel.draw();
        }

        if (this.defaultToolConfig.clinvarAssertion) {
            this.clinvarAssertionPanel.draw();
        }


        for (var i = 0; i < this.tools.length; i++) {
            var tool = this.tools[i];
            tool.tool.draw();
        }

        this.toolTabPanel.setActiveTab(0);
    },
    _createVariantBrowserGrid: function (target) {
        var _this = this;

        var columns = {
            items: [
                {
                    text: "Chr",
                    dataIndex: 'chromosome',
                    flex: 0.2
                },
                {
                    text: 'Position',
                    dataIndex: 'start',
                    flex: 0.4
                },
                {
                    header: '<span class="icon icon-generic header-icon" data-icon="i"  style="margin-bottom:0px;"></span>Variant ID',
                    dataIndex: 'ids',
                    flex: 0.5,
                    iconCls: 'icon-info',
//                    xtype: "templatecolumn",
//                    tpl: '<tpl  class="variantId" if="id"><span>{id}</span><tpl else>-</tpl>',
                    tooltip: 'dbSNP ID(Human), TransPlant ID(Plant) and Submitted ID(others)',
                    renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                        var values = _this.getVariantId(value);
                        return values.variantId;
                    }
                },
                {
                    text: 'Alleles',
                    xtype: "templatecolumn",
                    tpl: '<tpl if="reference">{reference:htmlEncode}<tpl else>-</tpl>/<tpl if="alternate">{alternate:htmlEncode}<tpl else>-</tpl>',
                    flex: 0.60
                },
                {
                    text: 'Class',
                    dataIndex: 'type',
                    xtype: "templatecolumn",
                    tpl: '<tpl if="type"><a href="http://www.ncbi.nlm.nih.gov/books/NBK44447/#Content.what_classes_of_genetic_variatio" target="_blank">{type}</a><tpl else>-</tpl>',
                    flex: 0.3

                },
                {
                    text: 'Most Severe <br /> Consequence Type',
                    dataIndex: 'consequenceTypes',
                    renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                        var tempArray = [];
                        var consequenceTypes = rec.data.consequenceTypes;
                        if (!_.isUndefined(value)) {
                            var tempArray = [];
                            _.each(_.keys(consequenceTypes), function (key) {
                                var so_terms = this[key].soTerms;
                                _.each(_.keys(so_terms), function (key) {
                                    tempArray.push(this[key].soName)
                                }, so_terms);
                            }, consequenceTypes);
                            var groupedArr = _.groupBy(tempArray);
                            var so_array = [];
                            _.each(_.keys(groupedArr), function (key) {
                                var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
//                                so_array[index] = key+' ('+this[key].length+')';
                                if (index < 0) {
                                    so_array.push(key)
                                } else {
                                    so_array[index] = key;
                                }
                            }, groupedArr);
                            so_array = _.compact(so_array);
                            meta.tdAttr = 'data-qtip="' + so_array.join('\n') + '"';
                            var so_term_detail = _.findWhere(consequenceTypesColors, {id: _.first(so_array)});
                            var color = '';
                            var impact = '';
                            var svg = '';
                            if (!_.isUndefined(so_term_detail)) {
                                color = so_term_detail.color;
                                impact = so_term_detail.impact;
                                svg = '<svg width="20" height="10"><rect x="0" y="3" width="15" height="10" fill="' + color + '"><title>' + impact + '</title></rect></svg>'
                            }
                            return value ? Ext.String.format(
                                '<tpl>' + _.first(so_array) + '&nbsp;' + svg + '</tpl>',
                                value
                            ) : '';
                        } else {
                            return '';
                        }
                    },
                    flex: 1
                },
                {
                    text: "Most Severe <br />Protein Substitution Score",
                    columns: [
                        {
//                            text: "Polyphen2",
                            header: '<span class="icon icon-generic header-icon" data-icon="i" style="margin-bottom:0px;"></span> PolyPhen2',
                            dataIndex: "consequenceTypes",
//                            flex: 1.5,
                            width: 150,
                            menuDisabled: true,
                            tooltip: 'Polymophism Phenotyping v2 (PolyPhen2) scores are provided from Ensembl VEP annotation and are not available for all variants from all species.',
                            renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                                var tempArray = [];
                                var consequenceTypes = rec.data.consequenceTypes;
                                if (!_.isUndefined(value)) {
                                    var tempArray = [];
                                    _.each(_.keys(consequenceTypes), function (key) {
                                        var so_terms = this[key].soTerms;
                                        _.each(_.keys(so_terms), function (key) {
                                            tempArray.push(this[key].soName)
                                        }, so_terms);
                                    }, consequenceTypes);
                                    var groupedArr = _.groupBy(tempArray);
                                    var so_array = [];
                                    _.each(_.keys(groupedArr), function (key) {
                                        var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
//                                so_array[index] = key+' ('+this[key].length+')';
                                        so_array[index] = key;
                                    }, groupedArr);
                                    so_array = _.compact(so_array);
                                    meta.tdAttr = 'data-qtip="' + so_array.join('\n') + '"';
                                    var score = '-';
                                    var polyphen_score_array = [];
                                    for (i = 0; i < consequenceTypes.length; i++) {
                                        for (j = 0; j < consequenceTypes[i].soTerms.length; j++) {
                                            if (consequenceTypes[i].soTerms[j].soName == _.first(so_array)) {
                                                _.each(_.keys(consequenceTypes[i].proteinSubstitutionScores), function (key) {
                                                    if (this[key].source == 'Polyphen') {
                                                        polyphen_score_array.push(this[key].score)
                                                        score = this[key].score;

                                                    }
                                                }, consequenceTypes[i].proteinSubstitutionScores);
                                            }
                                        }
                                    }

                                    if (!_.isEmpty(polyphen_score_array)) {
                                        score = Math.max.apply(Math, polyphen_score_array)
                                    }
                                    return score;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
//                            text: "Sift",
                            header: '<span class="icon icon-generic header-icon" data-icon="i" style="margin-bottom:0px;"></span>Sift',
                            dataIndex: "consequenceTypes",
                            width: 80,
                            menuDisabled: true,
                            tooltip: 'Sorting Intolerant From Tolerant (SIFT) scores are provided from Ensembl VEP annotation and are not available for all variants from all species.',
                            renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                                var tempArray = [];
                                var consequenceTypes = rec.data.consequenceTypes;
                                if (!_.isUndefined(value)) {
                                    var tempArray = [];
                                    _.each(_.keys(consequenceTypes), function (key) {
                                        var so_terms = this[key].soTerms;
                                        _.each(_.keys(so_terms), function (key) {
                                            tempArray.push(this[key].soName)
                                        }, so_terms);
                                    }, consequenceTypes);
                                    var groupedArr = _.groupBy(tempArray);
                                    var so_array = [];
                                    _.each(_.keys(groupedArr), function (key) {
                                        var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
//                                so_array[index] = key+' ('+this[key].length+')';
                                        so_array[index] = key;
                                    }, groupedArr);
                                    so_array = _.compact(so_array);
                                    meta.tdAttr = 'data-qtip="' + so_array.join('\n') + '"';
                                    var score = '-';
                                    var sift_score_array = [];
                                    for (i = 0; i < consequenceTypes.length; i++) {
                                        for (j = 0; j < consequenceTypes[i].soTerms.length; j++) {
                                            if (consequenceTypes[i].soTerms[j].soName == _.first(so_array)) {
                                                _.each(_.keys(consequenceTypes[i].proteinSubstitutionScores), function (key) {
                                                    if (this[key].source == 'Sift') {
                                                        sift_score_array.push(this[key].score)
                                                        score = this[key].score;
                                                    }
                                                }, consequenceTypes[i].proteinSubstitutionScores);
                                            }
                                        }
                                    }
                                    if (!_.isEmpty(sift_score_array)) {
                                        score = Math.min.apply(Math, sift_score_array)
                                    }
                                    return score;
                                } else {
                                    return '';
                                }
                            }
                        }
                    ],
                    flex: 1.5
                },
                {
                    text: 'View',
                    dataIndex: 'id',
                    id: 'variant-grid-view-column',
                    xtype: 'templatecolumn',
                    tpl: new Ext.XTemplate('<a href="?variant={chromosome}:{start}:{reference:htmlEncode}:{alternate:htmlEncode}&species={[this.getSpecies(values)]}" target="_blank"><img class="eva-grid-img-active" src="img/eva_logo.png"/></a>' +
                        '&nbsp;<tpl if="this.getURL(values)"><a href="{[this.getURL(values)]}" class="dbsnp_link" target="_blank" onclick="ga(\'send\', \'event\', { eventCategory: \'Variant Browser\', eventAction: \'dbSNP Link\', eventLabel:this})"><span>dbSNP</span></a>' +
                        '<tpl else><span  style="opacity:0.2" class="eva-grid-img-inactive ">dbSNP</span></tpl>',
                        {
                            getURL: function (value) {
                                var values = _this.getVariantId(value.ids);
                                return values.dbsnpURL;
                            },
                            getSpecies:function (value) {
                                return _this.values.species;
                            }
                        }),
                    flex: 0.4
                }
            ],
            defaults: {
                align: 'left',
                sortable: false,
                menuDisabled: true
            }
        };

        var attributes = [
            {name: 'ids', type: 'string'},
            {name: "chromosome", type: "string"},
            {name: "start", type: "int"},
            {name: "end", type: "int"},
            {name: "type", type: "string"},
            {name: "ref", type: "string"},
            {name: "alt", type: "string"},
            {name: 'hgvs_name', type: 'string'},
            {name: 'consequenceTypes', mapping: 'annotation.consequenceTypes', type: 'auto' }
        ];

        var listeners = {
            expandbody: function (expander, record, body, rowIndex) {
                var content = '';
                var consequenceTypes = record.data.consequenceTypes;
                for (i = 0; i < consequenceTypes.length; i++) {
                    content += '<div><a href="http://www.sequenceontology.org/miso/current_svn/term/' + consequenceTypes[i].soTerms[0].soAccession + '" target="_blank">' + consequenceTypes[i].soTerms[0].soAccession + '</a>:&nbsp;' + consequenceTypes[i].soTerms[0].soName + '</div>'
                }
                body.innerHTML = content;
            }
        };

        var variantBrowserGrid = new EvaVariantBrowserGrid({
            title: this.browserGridConfig.title,
            target: target,
            data: this.data,
            height: 440,
            margin: '0 0 0 0',
            border: this.browserGridConfig.border,
            dataParser: this.dataParser,
            responseRoot: this.responseRoot,
            responseTotal: this.responseTotal,
            responseParser: this.responseParser,
            startParam: this.startParam,
            attributes: attributes,
            columns: columns,
            samples: this.samples,
            headerConfig: this.headerConfig,
            handlers: {
                "variant:change": function (e) {
                    _this.lastVariant = e.args;
                    _this.trigger('variant:change', {variant: _this.lastVariant, sender: _this});
                },
                "variant:clear": function (e) {
                    //_this.lastVariant = e.args;
                    _this.trigger('variant:clear', {sender: _this});
                },
                "species:change": function (e) {

                }
            },
            viewConfigListeners: listeners
        });
        var resultsPerPage = new Ext.form.ComboBox({
            name: 'perpage',
            width: 70,
            store: new Ext.data.ArrayStore({
                fields: ['id'],
                data: [
                    ['10'],
                    ['25'],
                    ['50'],
                    ['75'],
                    ['100'],
                    ['200']
                ]
            }),
            mode: 'local',
            value: '10',
//            listWidth     : 40,
            triggerAction: 'all',
            displayField: 'id',
            valueField: 'id',
            editable: false,
            forceSelection: true
        });

        var exportCSVButton = {
            xtype: 'button',
            text: 'Export as CSV',
            style: {
                borderStyle: 'solid'
            },
            listeners: {
                click: {
                    element: 'el', //bind to the underlying el property on the panel
                    fn: function () {
                        var exportStore = _this._getAllRecordStore(variantBrowserGrid);
                        exportStore.on( 'load', function( store, records, options ) {
                            _this._exportToExcel(records, exportStore.proxy.extraParams);
                        });
                    }
                }
            }
        };

        var clincalButton = {
            xtype: 'button',
            text: 'Show in Clinical Browser',
            id:'clinvar-button',
            style: {
                borderStyle: 'solid'
            },
            listeners: {
                click: {
                    element: 'el', //bind to the underlying el property on the panel
                    fn: function () {
                        var queryURL;
                        //sending tracking data to Google Analytics
                        ga('send', 'event', { eventCategory: 'Variant Browser', eventAction: 'Show in Clinical Browser', eventLabel:'Clicked'});
                        if (_this.values.selectFilter == 'gene') {
                            queryURL = 'clinvarSelectFilter=gene&gene='+_this.values.gene;
                        } else if (_this.values.selectFilter == 'region') {
                            queryURL = 'clinvarSelectFilter=region&clinvarRegion='+_this.values.region;
                        } else {
                            if (variantBrowserGrid.store.getTotalCount() > 1) {
                                var totalRecordsStore = _this._getAllRecordStore(variantBrowserGrid);
                                totalRecordsStore.on( 'load', function( store, records, options ) {
                                    queryURL = 'clinvarSelectFilter=region&clinvarRegion='+_.first(records).data.chromosome+':'+_.first(records).data.start+'-'+ _.last(records).data.end;
                                    window.location = '?Clinical Browser&'+queryURL;
                                });
                                return;
                            } else {
                                queryURL = 'clinvarSelectFilter=region&clinvarRegion='+_this.lastVariant.chromosome+':'+_this.lastVariant.start+'-'+_this.lastVariant.end;
                            }
                        }

                        window.location = '?Clinical Browser&'+queryURL;


                    }
                }
            }
        };

        variantBrowserGrid.grid.addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            border: false,
            items: ['Results per Page: ', resultsPerPage,exportCSVButton,clincalButton]
        });

        resultsPerPage.on('select', function (combo, record) {
            var _this = this;
            var url = _this.queryURL;
            var params = variantBrowserGrid.store.proxy.extraParams;
            variantBrowserGrid.pageSize = record.id;
            _this.retrieveData(url, params);
        }, this);
        return variantBrowserGrid;
    },
    _createVariantStatsPanel: function (target) {
        var _this = this;
        var variantStatsPanel = new EvaVariantStatsPanel({
            target: target,
            height: 820,
            statsTpl: new Ext.XTemplate(
                '<table class="eva-attributes-table">' +
                '<tr>' +
                '<td class="header">Minor Allele Frequency</td>' +
                '<td class="header">Mendelian Errors</td>' +
                '<td class="header">Missing Alleles</td>' +
                '<td class="header">Missing Genotypes</td>' +
                '</tr>',
                '<tr>' +
                '<td><tpl if="maf == -1 || maf == 0">NA <tpl else>{maf:number( "0.000" )} </tpl><tpl if="mafAllele">({mafAllele}) <tpl else></tpl></td>' +
                '<td><tpl if="mendelianErrors == -1">NA <tpl else>{mendelianErrors}</tpl></td>' +
                '<td><tpl if="missingAlleles == -1">NA <tpl else>{missingAlleles}</tpl></td>' +
                '<td><tpl if="missingGenotypes == -1">NA <tpl else>{missingGenotypes}</tpl></td>' +
                '</tr>',
                '</table>'
            )
        });

        this.variantBrowserGrid.on("variant:clear", function (e) {
            variantStatsPanel.clear(true);
        });

        this.on("variant:change", function (e) {
            if (_.isUndefined(e.variant)) {
                variantStatsPanel.clear(true);
            } else {
                if (target.id === _this.selectedToolDiv.id) {
                    var variant = e.variant;
                    var region = variant.chromosome + ':' + variant.start + '-' + variant.end;
                    var proxy = _.clone(this.variantBrowserGrid.store.proxy);
                    EvaManager.get({
                        category: 'segments',
                        resource: 'variants',
                        query: region,
                        params: {species: proxy.extraParams.species, studies: proxy.extraParams.studies},
                        async: false,
                        success: function (response) {
                            try {
//                                _.extend(variant, response.response[0].result[0]);
                                var result = _.findWhere(response.response[0].result, {start: variant.start,end:variant.end});
                                _.extend(variant,result);
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    });
                    if (variant.sourceEntries) {
                        variantStatsPanel.load(variant.sourceEntries, {species: proxy.extraParams.species},_this.studies);
                    }
                    //sending tracking data to Google Analytics
                    ga('send', 'event', { eventCategory: 'Variant Browser', eventAction: 'Tab Views', eventLabel:'Files'});
                }
            }

        });


        return variantStatsPanel;
    },
    _createAnnotationPanel: function (target) {
        var _this = this;

        var annotationColumns = {
            items: [
                {
                    text: "Ensembl<br /> Gene ID",
                    dataIndex: "ensemblGeneId",
                    flex: 1.4,
                    xtype: "templatecolumn",
//                    tpl: '<tpl if="ensemblGeneId"><a href="http://www.ensembl.org/Homo_sapiens/Gene/Summary?g={ensemblGeneId}" target="_blank">{ensemblGeneId}</a><tpl else>-</tpl>'
                    tpl: '<tpl if="ensemblGeneId">{ensemblGeneId}<tpl else>-</tpl>'
                },
                {
                    text: "Ensembl <br /> Gene Symbol",
                    dataIndex: "geneName",
                    xtype: "templatecolumn",
                    flex: 0.9,
                    tpl: '<tpl if="geneName">{geneName}<tpl else>-</tpl>'
                },
                {
                    text: "Ensembl <br />Transcript ID",
                    dataIndex: "ensemblTranscriptId",
                    flex: 1.3,
                    xtype: "templatecolumn",
//                    tpl: '<tpl if="ensemblTranscriptId"><a href="http://www.ensembl.org/Homo_sapiens/transview?transcript={ensemblTranscriptId}" target="_blank">{ensemblTranscriptId}</a><tpl else>-</tpl>'
                    tpl: '<tpl if="ensemblTranscriptId">{ensemblTranscriptId}<tpl else>-</tpl>'
                },
                {
                    text: "SO Term(s)",
                    dataIndex: "soTerms",
                    flex: 1.7,
                    renderer: function (value, meta, rec, rowIndex, colIndex, store) {

                        if (!_.isUndefined(value)) {

                            var tempArray = [];
                            _.each(_.keys(value), function (key) {
                                tempArray.push(this[key].soName);
                            }, value);

                            var groupedArr = _.groupBy(tempArray);
                            var so_array = [];
                            _.each(_.keys(groupedArr), function (key) {
                                var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
                                if (index < 0) {
                                    so_array.push(key)
                                } else {
                                    so_array[index] = key;
                                }
                            }, groupedArr);
                            so_array = _.compact(so_array);
//                              console.log(so_array)
                            meta.tdAttr = 'data-qtip="' + so_array.join(',') + '"';
                            return value ? Ext.String.format(
                                '<tpl>' + so_array.join(',') + '</tpl>',
                                value
                            ) : '';
                        } else {
                            return '';
                        }

                    }
                },
                {
                    text: "Biotype",
                    dataIndex: "biotype",
                    xtype: "templatecolumn",
                    tpl: '<tpl if="biotype">{biotype}<tpl else>-</tpl>',
                    flex: 1.1
                },
                {
                    text: "Codon",
                    dataIndex: "codon",
                    flex: 0.6
                },
                {
                    text: "cDna <br />Position",
                    dataIndex: "cDnaPosition",
                    flex: 0.6
                },
                {
                    text: "AA<br />Change",
                    dataIndex: "aaChange",
                    flex: 0.6
                },
                {
                    text: "PolyPhen",
                    dataIndex: "soTerms",
                    flex: 0.71,
                    renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                        if (!_.isUndefined(value)) {
                            var consequenceTypes = [];
                            var tempArray = [];
                            _.each(_.keys(value), function (key) {
                                tempArray.push(this[key].soName);
                            }, value);

                            var groupedArr = _.groupBy(tempArray);
                            var so_array = [];
                            _.each(_.keys(groupedArr), function (key) {
                                var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
                                if (index < 0) {
                                    so_array.push(key)
                                } else {
                                    so_array[index] = key;
                                }
                            }, groupedArr);
                            so_array = _.compact(so_array);

                            meta.tdAttr = 'data-qtip="' + so_array.join('\n') + '"';
                            var score = '-';
                            var polyphen_score_array = [];
//                            var _tempSoTerms = consequenceTypes.soTerms;
                            consequenceTypes.push(rec.data);
                            for (i = 0; i < consequenceTypes.length; i++) {
                                for (j = 0; j < consequenceTypes[i].soTerms.length; j++) {
                                    if (consequenceTypes[i].soTerms[j].soName == _.first(so_array)) {
                                        _.each(_.keys(consequenceTypes[i].proteinSubstitutionScores), function (key) {
                                            if (this[key].source == 'Polyphen') {
                                                polyphen_score_array.push(this[key].score)
                                                score = this[key].score;
                                            }
                                        }, consequenceTypes[i].proteinSubstitutionScores);
                                    }
                                }
                            }
                            if (!_.isEmpty(polyphen_score_array)) {
                                score = Math.max.apply(Math, polyphen_score_array)
                            }

                            return score;

                        } else {
                            return '';
                        }
                    }
                },
                {
                    text: "Sift",
                    dataIndex: "soTerms",
                    flex: 0.5,
                    renderer: function (value, meta, rec, rowIndex, colIndex, store) {
                        if (!_.isUndefined(value)) {
                            var consequenceTypes = [];
                            var tempArray = [];
                            _.each(_.keys(value), function (key) {
                                tempArray.push(this[key].soName);
                            }, value);

                            var groupedArr = _.groupBy(tempArray);
                            var so_array = [];
                            _.each(_.keys(groupedArr), function (key) {
                                var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
                                if (index < 0) {
                                    so_array.push(key)
                                } else {
                                    so_array[index] = key;
                                }
                            }, groupedArr);
                            so_array = _.compact(so_array);

                            meta.tdAttr = 'data-qtip="' + so_array.join('\n') + '"';
                            var score = '-';
                            var sift_score_array = [];
//                            var _tempSoTerms = consequenceTypes.soTerms;
                            consequenceTypes.push(rec.data);
                            for (i = 0; i < consequenceTypes.length; i++) {
                                for (j = 0; j < consequenceTypes[i].soTerms.length; j++) {
                                    if (consequenceTypes[i].soTerms[j].soName == _.first(so_array)) {
                                        _.each(_.keys(consequenceTypes[i].proteinSubstitutionScores), function (key) {
                                            if (this[key].source == 'Sift') {
                                                sift_score_array.push(this[key].score)
                                                score = this[key].score;
                                            }
                                        }, consequenceTypes[i].proteinSubstitutionScores);
                                    }
                                }
                            }
                            if (!_.isEmpty(sift_score_array)) {
                                score = Math.min.apply(Math, sift_score_array)
                            }

                            return score;

                        } else {
                            return '';
                        }
                    }
                }

            ],
            defaults: {
                align: 'left',
                sortable: true
            }
        };
        var annotationPanel = new ClinvarAnnotationPanel({
            target: target,
            height: 800,
            columns: annotationColumns
        });

        this.variantBrowserGrid.on("variant:clear", function (e) {
            annotationPanel.clear(true);
        });

        this.on("variant:change", function (e) {
            if (_.isUndefined(e.variant)) {
                annotationPanel.clear(true);
            } else {
                if (target.id === _this.selectedToolDiv.id) {
                    _.extend(e.variant, {annot: e.variant.annotation});
                    var proxy = _.clone(this.variantBrowserGrid.store.proxy);
                    console.log(e.variant)
                    annotationPanel.load(e.variant, proxy.extraParams);
                    //sending tracking data to Google Analytics
                    ga('send', 'event', { eventCategory: 'Variant Browser', eventAction: 'Tab Views', eventLabel:'Annotation'});
                }
            }
        });



        return annotationPanel;
    },

    _createVariantPopulationStatsPanel: function (target) {
        var _this = this;
        var variantPopulationStatsPanel = new EvaVariantPopulationStatsPanel({
            target: target,
            height: 820,
            statsTpl: new Ext.XTemplate(
                '<table class="eva-attributes-table">' +
                '<tr>' +
                '<td class="header">Minor Allele Frequency</td>' +
                '<td class="header">Mendelian Errors</td>' +
                '<td class="header">Missing Alleles</td>' +
                '<td class="header">Missing Genotypes</td>' +
                '</tr>',
                '<tr>' +
                '<td><tpl if="maf == -1 || maf == 0">NA <tpl else>{maf:number( "0.000" )} </tpl><tpl if="mafAllele">({mafAllele}) <tpl else></tpl></td>' +
                '<td><tpl if="mendelianErrors == -1">NA <tpl else>{mendelianErrors}</tpl></td>' +
                '<td><tpl if="missingAlleles == -1">NA <tpl else>{missingAlleles}</tpl></td>' +
                '<td><tpl if="missingGenotypes == -1">NA <tpl else>{missingGenotypes}</tpl></td>' +
                '</tr>',
                '</table>'
            )
        });

        this.variantBrowserGrid.on("variant:clear", function (e) {
            variantPopulationStatsPanel.clear(true);
        });

        this.on("variant:change", function (e) {
            if (_.isUndefined(e.variant)) {
                variantPopulationStatsPanel.clear(true);
            } else {
                if (target.id === _this.selectedToolDiv.id) {
                    var variant = e.variant;
                    var region = variant.chromosome + ':' + variant.start + '-' + variant.end;
                    var proxy = _.clone(this.variantBrowserGrid.store.proxy);
                    EvaManager.get({
                        category: 'segments',
                        resource: 'variants',
                        query: region,
                        params: {species: proxy.extraParams.species, studies: proxy.extraParams.studies},
                        async: false,
                        success: function (response) {
                            try {
//                                _.extend(variant, response.response[0].result[0]);
                                var result = _.findWhere(response.response[0].result, {start: variant.start,end:variant.end});
                                _.extend(variant,result);
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    });
                    if (variant.sourceEntries) {
                        variantPopulationStatsPanel.load(variant.sourceEntries, proxy.extraParams,_this.studies);
                    }
                    //sending tracking data to Google Analytics
                    ga('send', 'event', { eventCategory: 'Variant Browser', eventAction: 'Tab Views', eventLabel:'Population Statistics'});
                }
            }

        });

        return variantPopulationStatsPanel;
    },
    _createVariantGenotypeGridPanel: function (target) {
        var _this = this;
        var genotypeColumns = [
            {
                text: "Study",
                dataIndex: "studyId",
                flex: 1,
                xtype: 'templatecolumn',
                tpl: '<tpl if="reference">{reference}<tpl else>-</tpl>/<tpl if="alternate">{alternate}<tpl else>-</tpl>'
            },
            {
                text: "Samples Count",
                dataIndex: "samplesData",
                flex: 1
            }
        ];

        var variantGenotypeGridPanel = new EvaVariantGenotypeGridPanel({
            target: target,
            gridConfig: {
                flex: 1,
                layout: {
                    align: 'stretch'
                }
            },
            height: 820
        });

        this.variantBrowserGrid.on("variant:clear", function (e) {
            variantGenotypeGridPanel.clear(true);
        });

        _this.on("variant:change", function (e) {
            if (_.isUndefined(e.variant)) {
                variantGenotypeGridPanel.clear(true);
            } else {
                if (target.id === _this.selectedToolDiv.id) {
                    var variant = e.variant;
                    var query = e.variant.chromosome + ':' + e.variant.start + '-' + e.variant.end;
                    var params = _.omit(_this.variantBrowserGrid.store.proxy.extraParams, 'region');

                    EvaManager.get({
                        category: 'segments',
                        resource: 'variants',
                        query: query,
                        params: params,
                        success: function (response) {
                            try {
//                                var variantSourceEntries = response.response[0].result[0].sourceEntries;
                                var result = _.findWhere(response.response[0].result, {start: variant.start,end:variant.end});
                                var variantSourceEntries = result.sourceEntries;

                            } catch (e) {

                                console.log(e);
                            }

                            if (variantSourceEntries) {
                                variantGenotypeGridPanel.load(variantSourceEntries, params, _this.studies);
                            }
                        }
                    });
                    //sending tracking data to Google Analytics
                    ga('send', 'event', { eventCategory: 'Variant Browser', eventAction: 'Tab Views', eventLabel:'Genotypes'});

                }
            }

        });

        return variantGenotypeGridPanel;
    },
    _createClinvarAssertionPanel: function (target) {
        var _this = this;
        var assertionPanel = new ClinvarAssertionPanel ({
            target: target,
            headerId:'vb-clinical-assertion-header',
        });

        this.variantBrowserGrid.on ("variant:clear", function (e) {
            assertionPanel.clear (true);
        });

        this.on ("variant:change", function (e) {
            if (_.isUndefined (e.variant)) {
                assertionPanel.clear (true);
            } else {
                if (target.id === _this.selectedToolDiv.id) {
                    var region = e.variant.chromosome + ':' + e.variant.start + '-' + e.variant.end;
                    var params = {source: 'clinvar', species: 'hsapiens_grch37', 'region': region};
                    EvaManager.get ({
                        host: CELLBASE_HOST,
                        version: CELLBASE_VERSION,
                        category: 'hsapiens/feature/clinical',
                        resource: 'all',
                        params: params,
                        async: false,
                        success: function (response) {
                            var clinvarRecord;
                            try {
                                clinvarRecord = response.response[0].result[0];
                            } catch (e) {
                                console.log (e);
                            }
                            if (_.isUndefined(clinvarRecord)) {
                                Ext.getCmp(assertionPanel.headerId).update('<h4>Clinical Assertions</h4><p style="margin-left:-15px;">&nbsp;No clinical data available</p>')
                            } else {
                                Ext.getCmp(assertionPanel.headerId).update('<h4>Clinical Assertions</h4>')
                            }
                            assertionPanel.load(clinvarRecord);
                        }
                    });
                }
            }
        });

        return assertionPanel;
    },
    _createGenomeViewer: function (target) {
        var _this = this;

        var region = new Region({
            chromosome: "13",
            start: 32889611,
            end: 32889611
        });

        var genomeViewer = new GenomeViewer({
            cellBaseHost: CELLBASE_HOST,
            sidePanel: false,
            target: target,
            border: false,
            resizable: false,
            width: this.width,
            region: region,
            availableSpecies: AVAILABLE_SPECIES,
            trackListTitle: '',
            drawNavigationBar: true,
            drawKaryotypePanel: true,
            drawChromosomePanel: true,
            drawRegionOverviewPanel: true,
            overviewZoomMultiplier: 50,
            karyotypePanelConfig: {
                collapsed: false,
                collapsible: true
            },
            navigationBarConfig: {
                componentsConfig: {
                    restoreDefaultRegionButton: false,
                    regionHistoryButton: false,
                    speciesButton: false,
                    chromosomesButton: false,
                    karyotypeButtonLabel: false,
                    chromosomeButtonLabel: false,
                    //regionButton: false,
//                    zoomControl: false,
                    windowSizeControl: false
//                    positionControl: false,
//                    moveControl: false,
//                    autoheightButton: false,
//                    compactButton: false,
//                    searchControl: false
                }
            }
        });
        genomeViewer.setZoom(80);

        var renderer = new FeatureRenderer(FEATURE_TYPES.gene);
        renderer.on({
            'feature:click': function (event) {
                // feature click event example
                console.log(event)
            }
        });
        var geneOverview = new FeatureTrack({
//        title: 'Gene overview',
            minHistogramRegionSize: 20000000,
            maxLabelRegionSize: 10000000,
            height: 100,

            renderer: renderer,

            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "gene",
                params: {
                    exclude: 'transcripts,chunkIds'
                },
                species: genomeViewer.species,
                cacheConfig: {
                    chunkSize: 100000
                }
            })
        });

        var sequence = new SequenceTrack({
//        title: 'Sequence',
            height: 30,
            visibleRegionSize: 200,
            renderer: new SequenceRenderer(),
            dataAdapter: new SequenceAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "sequence",
                species: genomeViewer.species
            })
        });

        var gene = new GeneTrack({
            title: 'Gene',
            minHistogramRegionSize: 20000000,
            maxLabelRegionSize: 10000000,
            minTranscriptRegionSize: 200000,
            height: 60,
            renderer: new GeneRenderer(),
            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "gene",
                species: genomeViewer.species,
                params: {
                    exclude: 'transcripts.tfbs,transcripts.xrefs,transcripts.exons.sequence'
                },
                cacheConfig: {
                    chunkSize: 100000
                }
            })
        });

        var snp = new FeatureTrack({
            title: 'SNP',
            featureType: 'SNP',
            minHistogramRegionSize: 10000,
            maxLabelRegionSize: 3000,
            height: 100,
            renderer: new FeatureRenderer(FEATURE_TYPES.snp),
            dataAdapter: new CellBaseAdapter({
                category: "genomic",
                subCategory: "region",
                resource: "snp",
                params: {
                    exclude: 'transcriptVariations,xrefs,samples'
                },
                species: genomeViewer.species,
                cacheConfig: {
                    chunkSize: 10000
                }
            })
        });

        genomeViewer.addOverviewTrack(geneOverview);
        genomeViewer.addTrack([sequence, gene, snp]);
        this.on("species:change", function (e) {
            //disbaling for goat
            if (e.values.species == 'chircus_10' || e.values.species == 'olatipes_hdrr') {
                return;
            }
            _this.taxonomy = e.values.species.split('_')[0];
        });
        this.on("variant:change", function (e) {
            if (e.variant) {
                if (target === _this.selectedToolDiv) {
                    var variant = e.variant;

                    var region = new Region(variant);
                    if (!_.isUndefined(genomeViewer)) {
                        genomeViewer.setRegion(region, _this.taxonomy);
                    }
                }
            } else {
                genomeViewer.setSpeciesByTaxonomy(_this.taxonomy);
            }
        });

        return genomeViewer;
    },
    resizeGV: function () {
        var _this = this;
        var gvTab = _.findWhere(_this.toolTabPanel.items.items, {title: 'Genomic Context'})
        var gvTabWidth = gvTab.getWidth();
        _this.genomeViewer.setWidth(gvTabWidth - 2);

    },
    retrieveData: function (baseUrl, filterParams) {
        this.variantBrowserGrid.loadUrl(baseUrl, filterParams);
    },
    setLoading: function (loading) {
        this.variantBrowserGrid.setLoading(loading);
    },
    _getAllRecordStore: function (params) {
        var _this = this;
        var proxy = params.grid.store.proxy;
        proxy.url = _this.queryURL;
        var records;
        var exportStore = Ext.create('Ext.data.Store', {
            pageSize: params.grid.store.getTotalCount(),
            autoLoad: true,
            fields: [
                {name: 'id', type: 'string'}
            ],
            remoteSort: true,
            proxy: proxy,
            extraParams: {exclude: files},
            listeners: {
                load: function (store, records, successful, operation, eOpts) {

                }
            }
        });

        return exportStore;
    },
    _exportToExcel: function (records, params) {
        var csvContent = '',
        /*
         Does this browser support the download attribute
         in HTML 5, if so create a comma seperated value
         file from the selected records / if not create
         an old school HTML table that comes up in a
         popup window allowing the users to copy and paste
         the rows.
         */
            noCsvSupport = ( 'download' in document.createElement('a') ) ? false : true,
            sdelimiter = noCsvSupport ? "<td>" : "",
            edelimiter = noCsvSupport ? "</td>" : ",",
            snewLine = noCsvSupport ? "<tr>" : "",
            enewLine = noCsvSupport ? "</tr>" : "\r\n",
            printableValue = '',
            speciesValue = '';

        csvContent += snewLine;

        /* Get the column headers from the store dataIndex */

        var removeKeys = ['hgvs', 'sourceEntries', 'ref', 'alt', 'hgvs_name', 'iid', 'annotation', 'ids', 'conservedRegionScores', 'length'];

        Ext.Object.each(records[0].data, function (key) {
            if (_.indexOf(removeKeys, key) == -1) {
                csvContent += sdelimiter + key + edelimiter;
            }
        });
        csvContent += sdelimiter + 'Organism / Assembly' + edelimiter;

        csvContent += enewLine;
        /*
         Loop through the selected records array and change the JSON
         object to teh appropriate format.
         */

        for (var i = 0; i < records.length; i++) {
            /* Put the record object in somma seperated format */
            csvContent += snewLine;
            Ext.Object.each(records[i].data, function (key, value) {
                if (key == 'consequenceTypes') {
                    var tempArray = [];
                    _.each(_.keys(value), function (key) {
                        var so_terms = this[key].soTerms;
                        _.each(_.keys(so_terms), function (key) {
                            tempArray.push(this[key].soName)
                        }, so_terms);
                    }, value);

                    var groupedArr = _.groupBy(tempArray);
                    var so_array = [];
                    _.each(_.keys(groupedArr), function (key) {
                        var index = _.indexOf(consequenceTypesHierarchy, key);
//                                        so_array.splice(index, 0, key+' ('+this[key].length+')');
//                                        so_array.push(key+' ('+this[key].length+')')
//                        so_array[index] = key + ' (' + this[key].length + ')';
                        if (index < 0) {
                            so_array.push(key)
                        } else {
                            so_array[index] = key;
                        }
                    }, groupedArr);
                    so_array = _.compact(so_array);
                    value = so_array.join(" ");
                    value = _.first(so_array);
                } else if (key == 'phylop') {
                    var phylop = _.findWhere(records[i].data[key], {source: key});
                    if (phylop) {
                        value = phylop.score.toFixed(3);
                    } else {
                        value = '';
                    }
                } else if (key == 'phastCons') {
                    var phastCons = _.findWhere(records[i].data[key], {source: key});
                    if (phastCons) {
                        value = phastCons.score.toFixed(3);
                    } else {
                        value = '';
                    }
                }
                if (_.indexOf(removeKeys, key) == -1) {
                    printableValue = ((noCsvSupport) && value == '') ? '&nbsp;' : value;
                    printableValue = String(printableValue).replace(/,/g, "");
                    printableValue = String(printableValue).replace(/(\r\n|\n|\r)/gm, "");
                    csvContent += sdelimiter + printableValue + edelimiter;
                }
            });

            var speciesName;
            var species;
            if (!_.isEmpty(speciesList)) {
                speciesName = _.findWhere(speciesList, {taxonomyCode: params.species.split("_")[0]}).taxonomyEvaName;
                species = speciesName.substr(0, 1).toUpperCase() + speciesName.substr(1) + '/' + _.findWhere(speciesList, {assemblyCode: params.species.split('_')[1]}).assemblyName;

            } else {
                species = params.species;
            }

            speciesValue = ((noCsvSupport) && species == '') ? '&nbsp;' : species;
            speciesValue = String(species).replace(/,/g, "");
            speciesValue = String(speciesValue).replace(/(\r\n|\n|\r)/gm, "");
            csvContent += sdelimiter + speciesValue + edelimiter;
            csvContent += enewLine;
        }

        if ('download' in document.createElement('a')) {
            /*
             This is the code that produces the CSV file and downloads it
             to the users computer
             */
//            var link = document.createElement("a");
//            link.setAttribute("href", 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvContent));
//            link.setAttribute("download", "variants.csv");
//            link.setAttribute("target", "_blank");
//            link.click();

            var link = document.createElement('a');
            var mimeType = 'application/xls';
            var blob = new Blob([csvContent], {type: mimeType});
            var url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute('download', 'variants.csv');
            link.innerHTML = "Export to CSV";
            document.body.appendChild(link);
            link.click();

        } else {
            /*
             The values below get printed into a blank window for
             the luddites.
             */
            alert('Please allow pop up in settings if its not exporting');
            window.open().document.write('<table>' + csvContent + '</table>');
            return true;

        }

        return true;
    },
    getVariantId: function (value) {
        var id = value;
        var dbsnpURL = '';
        var rsRegEx = /^rs\d+$/;
        var ssRegEx = /^ss\d+$/;
        if (value && value.split (",").length > 1) {
            var _temp = value.split (",");
            var rsArray = [];
            var ssArray = [];
            var otherArray = [];
            _.each (_.keys (_temp), function (key) {
                if (this[key].match (rsRegEx)) {
                    rsArray.push (this[key]);
                } else if (this[key].match (ssRegEx)) {
                    ssArray.push (this[key]);
                } else {
                    otherArray.push (this[key]);
                }
            }, _temp);

            if (!_.isEmpty (rsArray)) {
                rsArray.sort ();
                id = _.first (rsArray);
            } else if (!_.isEmpty (ssArray)) {
                ssArray.sort ();
                id = _.first (ssArray);
            } else {
                otherArray.sort ();
                id = _.first (otherArray);
            }
        } else {
            if (_.isEmpty (value)) {
                id = '-';
            }
        }

        if (id.match (rsRegEx)) {
            dbsnpURL = 'http://www.ncbi.nlm.nih.gov/SNP/snp_ref.cgi?rs=' + id;
        } else if (id.match (ssRegEx)) {
            dbsnpURL = 'http://www.ncbi.nlm.nih.gov/projects/SNP/snp_ss.cgi?subsnp_id=' + id.substring (2);
        } else {
            dbsnpURL = false;
        }

        var values = {variantId: id, dbsnpURL: dbsnpURL};

        return values;
    }
};
