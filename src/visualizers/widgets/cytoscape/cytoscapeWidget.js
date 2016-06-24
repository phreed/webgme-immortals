/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Thu Dec 17 2015 14:41:36 GMT-0600 (CST).
 */

define(['cytoscape',
        'css!./styles/cytoscapeWidget.css'
        ], function (cytoscape) {
    'use strict';

    var cytoscapeWidget,
        WIDGET_CLASS = 'cytoscape';

    cytoscapeWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;

        this.nodes = {};
        this._initialize();
        this._selectedCyObject = null;

        this._logger.debug('ctor finished');
    };

    cytoscapeWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height(),
            self = this;

        // set widget class
        this._el.addClass(WIDGET_CLASS);

        this._initializeCytoscape();
        this.initializeEventListeners();

        // Registering to events can be done with jQuery (as normal)
        this._el.on('dblclick', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.onBackgroundDblClick();
        });
    };

    cytoscapeWidget.prototype._initializeCytoscape = function () {
        this._cy = cytoscape({
          container: this._el,

          elements: [],

          style: [ // the stylesheet for the graph
            {
              selector: 'node',
              style: {
                'background-color': '#666',
                'label': 'data(name)'
                // 'shape': 'rectangle',
                // 'width': 'label'
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 3,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'label': 'data(name)'
              }
            },
            {
              selector: ':selected',
              style: {
                'background-color': 'gold',
                'line-color': 'gold',
                'target-arrow-color': 'gold',
                'source-arrow-color': 'gold',
                'opacity': 1
              }
            },
            {
              selector: '.faded',
              style: {
                'opacity': 0.25,
                'text-opacity': 0
              }
            }
          ],

          layout: {
            name: 'circle',
            padding: 10
          }
        });
    };

    cytoscapeWidget.prototype.initializeEventListeners = function () {
        var self = this;

        this._cy.on('tap', function(evt){

            var control = WebGMEGlobal.PanelManager.getActivePanel().control,
                isEdge,
                isNode;
            if (typeof evt.cyTarget.id === 'function') {
                isEdge = evt.cyTarget.isEdge();
                isNode = evt.cyTarget.isNode();

                WebGMEGlobal.State.registerActiveSelection([evt.cyTarget.id()]);
                self._selectedCyObject = evt.cyTarget;

            } else if (evt.cyTarget === self._cy) {
                isEdge = false;
                WebGMEGlobal.State.registerActiveSelection([self._activeNode]);
            }


            if (control._toolbarItems.cpFillColor) {
                control._toolbarItems.cpFillColor.enabled(isEdge || isNode);
            }
            if (control._toolbarItems.cpTextColor) {
                control._toolbarItems.cpTextColor.enabled(isEdge || isNode);
            }

            if (control._toolbarItems.ddbtnConnectionArrowEnd) {
                control._toolbarItems.ddbtnConnectionArrowEnd.enabled(isEdge);
            }

            if (control._toolbarItems.ddbtnConnectionArrowStart) {
                control._toolbarItems.ddbtnConnectionArrowStart.enabled(isEdge);
            }

            if (control._toolbarItems.ddbtnConnectionPattern) {
                control._toolbarItems.ddbtnConnectionPattern.enabled(isEdge);
            }

            if (control._toolbarItems.ddbtnConnectionLineType) {
                control._toolbarItems.ddbtnConnectionLineType.enabled(isEdge);
            }

            if (control._toolbarItems.ddbtnConnectionLineWidth) {
                control._toolbarItems.ddbtnConnectionLineWidth.enabled(isEdge);
            }


        });
    };

    cytoscapeWidget.prototype.onWidgetContainerResize = function (width, height) {
        this._logger.debug('Widget is resizing...');
        // this._cy.invalidateDimensions();
        this._cy.resize();
    };

    // Adding/Removing/Updating items
    cytoscapeWidget.prototype.addNode = function (cyData) {
        var self = this;
        if (cyData && cyData.length) {
            cyData.forEach(function(d){
                self._cy.add(d);
            });
            // Add node to a table of nodes
            // var node = document.createElement('div'),
            //     label = 'children';

            // if (desc.childrenIds.length === 1) {
            //     label = 'child';
            // }

            // this.nodes[desc.id] = desc;
            // node.innerHTML = 'Adding node "' + desc.name + '" (click to view). It has ' +
            //     desc.childrenIds.length + ' ' + label + '.';

            // this._el.append(node);
            // node.onclick = this.onNodeClick.bind(this, desc.id);
        }
    };

    cytoscapeWidget.prototype.setActiveNode = function (nodeId) {
        this._activeNode = nodeId;
    };

    cytoscapeWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
        //this._el.append('<div>Removing node "'+desc.name+'"</div>');
        delete this.nodes[gmeId];
    };

    cytoscapeWidget.prototype.updateNode = function (desc) {
        if (desc) {
            this._logger.debug('Updating node:', desc);
            //this._el.append('<div>Updating node "'+desc.name+'"</div>');
        }
    };

    cytoscapeWidget.prototype.beginUpdate = function () {
        this._logger.debug('beginUpdate');

        this._updating = true;

        /*item accounting*/
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];
        this._deletedDesignerItemIDs = [];

        /*connection accounting*/
        this._insertedConnectionIDs = [];
        this._updatedConnectionIDs = [];
        this._deletedConnectionIDs = [];
    };

    cytoscapeWidget.prototype.endUpdate = function () {
        this._logger.debug('endUpdate');

        this._updating = false;
        // this._tryRefreshScreen();

        // this.searchManager.applyLastSearch();
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    cytoscapeWidget.prototype.onNodeClick = function (id) {
        // This currently changes the active node to the given id and
        // this is overridden in the controller.
    };

    cytoscapeWidget.prototype.onBackgroundDblClick = function () {
        this._el.append('<div>Background was double-clicked!!</div>');
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    cytoscapeWidget.prototype.destroy = function () {
    };

    cytoscapeWidget.prototype.onActivate = function () {
        this._logger.debug('cytoscapeWidget has been activated');
    };

    cytoscapeWidget.prototype.onDeactivate = function () {
        this._logger.debug('cytoscapeWidget has been deactivated');
    };

    return cytoscapeWidget;
});
