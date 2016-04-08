/*globals define, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Thu Dec 17 2015 14:41:36 GMT-0600 (CST).
 */

define(['js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/PreferencesHelper',
    'cytoscape/cytoscape.min'
], function (CONSTANTS,
             GMEConcepts,
             nodePropertyNames,
             registryKeys,
             PreferencesHelper,
             cytoscape) {
    'use strict';

    var cytoscapeControl;

    cytoscapeControl = function (options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;
        this.eventQueue = [];

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
    };

    cytoscapeControl.prototype._initWidgetEventHandlers = function () {
        this._widget.onNodeClick = function (id) {
            // Change the current active object
            WebGMEGlobal.State.registerActiveObject(id);
        };
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    cytoscapeControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            self = this;

        self._logger.debug('activeObject nodeId \'' + nodeId + '\'');
            
        // reinitialize cy data in widget
        self._widget._cy.remove('node').remove('edge');

        //clean up local hash map
        this._GMEModels = [];
        this._GMEConnections = [];

        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};

        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};

        this._delayedConnections = [];

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
        }

        self._currentNodeId = nodeId;
        self._currentNodeParentId = undefined;

        if (self._currentNodeId || self._currentNodeId === CONSTANTS.PROJECT_ROOT_ID) {

            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = {children: 0};  // Territory "rule"

            self._widget.setTitle(desc.name.toUpperCase());

            if (desc.parentId || desc.parentId === CONSTANTS.PROJECT_ROOT_ID) {
                self.$btnModelHierarchyUp.show();
            } else {
                self.$btnModelHierarchyUp.hide();
            }

            self._currentNodeParentId = desc.parentId;

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);

            self._selfPatterns[nodeId] = {children: 1};
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    // This next function retrieves the relevant node information for the widget
    cytoscapeControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor;

        if (nodeObj) {
            objDescriptor = {
                'id': undefined,
                'name': undefined,
                'childrenIds': undefined,
                'parentId': undefined,
                'isConnection': false
            };

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.childrenIds = nodeObj.getChildrenIds();
            objDescriptor.childrenNum = objDescriptor.childrenIds.length;
            objDescriptor.parentId = nodeObj.getParentId();
            objDescriptor.isConnection = GMEConcepts.isConnection(nodeId);  // GMEConcepts can be helpful
            objDescriptor.position = nodeObj.getRegistry(registryKeys.POSITION);
            if (objDescriptor.isConnection) {
                objDescriptor.source = nodeObj.getPointer("src");
                objDescriptor.target = nodeObj.getPointer("dst");
            }
        }

        return objDescriptor;
    };

    cytoscapeControl.prototype.getConnectionDescriptor = function () {
        return {};
    };

    cytoscapeControl.prototype._getCytoscapeData = function (desc) {
        var data = [];
        if (desc) {
            if (desc.isConnection) {
                data.push({
                    group: "edges",
                    data: { id: desc.id, source: desc.source.to, target: desc.target.to}
                });
            } else {
                data.push({
                    group: "nodes",
                    data: {   
                        id: desc.id, 
                        name: desc.name
                    },
                    position: desc.position
                });

                // for (var i = 0; i < desc.childrenIds.length; ++i) {
                //     data.push({
                //         group: "nodes",
                //         data: {   
                //             id: desc.childrenIds[i], 
                //             parent: desc.id
                //         }
                //     });
                // }
            }
        }
        return data;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    cytoscapeControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0,
            event;

        this._logger.debug('_eventCallback \'' + i + '\' items');

        // while (i--) {
        //     event = events[i];
        //     switch (event.etype) {
        //         case CONSTANTS.TERRITORY_EVENT_LOAD:
        //             this._onLoad(event.eid);
        //             break;
        //         case CONSTANTS.TERRITORY_EVENT_UPDATE:
        //             this._onUpdate(event.eid);
        //             break;
        //         case CONSTANTS.TERRITORY_EVENT_UNLOAD:
        //             this._onUnload(event.eid);
        //             break;
        //         default:
        //             break;
        //     }
        // }

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this._logger.debug('_eventCallback \'' + events.length + '\' items - DONE');
    };

    cytoscapeControl.prototype.processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            self = this;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ((nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) ||
                    (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = this._getObjectDescriptor(nextBatchInQueue[len].eid);
                }
            }

            self._dispatchEvents(nextBatchInQueue);
        }
    };

    cytoscapeControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            e,
            territoryChanged = false,
            self = this,
            orderedItemEvents,
            orderedConnectionEvents,
            unloadEvents,

            srcGMEID,
            dstGMEID,
            srcConnIdx,
            dstConnIdx,
            j,
            ce,
            insertIdxAfter,
            insertIdxBefore,
            MAX_VAL = 999999999,
            depSrcConnIdx,
            depDstConnIdx;

        this._logger.debug('_dispatchEvents ' + events[0].etype);
        events.shift();

        this._logger.debug('_dispatchEvents "' + i + '" items');

        /********** ORDER EVENTS BASED ON DEPENDENCY ************/
        /** 1: items first, no dependency **/
        /** 2: connections second, dependency if a connection is connected to an other connection **/
        orderedItemEvents = [];
        orderedConnectionEvents = [];

        if (this._delayedConnections && this._delayedConnections.length > 0) {
            /*this._logger.warn('_delayedConnections: ' + this._delayedConnections.length );*/
            for (i = 0; i < this._delayedConnections.length; i += 1) {
                orderedConnectionEvents.push({
                    etype: CONSTANTS.TERRITORY_EVENT_LOAD,
                    eid: this._delayedConnections[i],
                    desc: this._getObjectDescriptor(this._delayedConnections[i])
                });
            }
        }

        this._delayedConnections = [];

        unloadEvents = [];
        i = events.length;
        while (i--) {
            e = events[i];

            if (e.etype === CONSTANTS.TERRITORY_EVENT_UNLOAD) {
                unloadEvents.push(e);
            } else if (e.desc.isConnection) {
                if (e.desc.parentId === this._currentNodeId) {
                    //check to see if SRC and DST is another connection
                    //if so, put this guy AFTER them
                    srcGMEID = e.desc.source;
                    dstGMEID = e.desc.target;
                    srcConnIdx = -1;
                    dstConnIdx = -1;
                    j = orderedConnectionEvents.length;
                    while (j--) {
                        ce = orderedConnectionEvents[j];
                        if (ce.id === srcGMEID || ce.id === dstGMEID) {
                            srcConnIdx = j;
                        }

                        if (srcConnIdx !== -1 && dstConnIdx !== -1) {
                            break;
                        }
                    }

                    insertIdxAfter = Math.max(srcConnIdx, dstConnIdx);

                    //check to see if this guy is a DEPENDENT of any already processed CONNECTION
                    //insert BEFORE THEM
                    depSrcConnIdx = MAX_VAL;
                    depDstConnIdx = MAX_VAL;
                    j = orderedConnectionEvents.length;
                    while (j--) {
                        ce = orderedConnectionEvents[j];
                        if (e.desc.id === ce.desc.source) {
                            depSrcConnIdx = j;
                        } else if (e.desc.id === ce.desc.target) {
                            depDstConnIdx = j;
                        }

                        if (depSrcConnIdx !== MAX_VAL && depDstConnIdx !== MAX_VAL) {
                            break;
                        }
                    }

                    insertIdxBefore = Math.min(depSrcConnIdx, depDstConnIdx);
                    if (insertIdxAfter === -1 && insertIdxBefore === MAX_VAL) {
                        orderedConnectionEvents.push(e);
                    } else {
                        if (insertIdxAfter !== -1 &&
                            insertIdxBefore === MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxAfter + 1, 0, e);
                        } else if (insertIdxAfter === -1 &&
                                   insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore, 0, e);
                        } else if (insertIdxAfter !== -1 &&
                                   insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore, 0, e);
                        }
                    }
                } else {
                    orderedItemEvents.push(e);
                }
            } else if (!e.desc.isConnection) {
                orderedItemEvents.push(e);
            } else if (this._currentNodeId === e.eid) {
                orderedItemEvents.push(e);
            }

        }

        events = unloadEvents.concat(orderedItemEvents);
        i = events.length;

        this._notifyPackage = {};

        this._widget.beginUpdate();

        //items
        for (i = 0; i < events.length; i += 1) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    territoryChanged = this._onLoad(e.eid, e.desc) || territoryChanged;
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    territoryChanged = this._onUnload(e.eid) || territoryChanged;
                    break;
            }
        }

        //connections
        events = orderedConnectionEvents;
        i = events.length;

        //items
        for (i = 0; i < events.length; i += 1) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._onUnload(e.eid);
                    break;
            }
        }

        this._widget.endUpdate();

        //update the territory
        if (territoryChanged) {
            //TODO: review this async here
            if (this.___SLOW_CONN === true) {
                setTimeout(function () {
                    self.logger.debug('Updating territory with ruleset from decorators: ' +
                                      JSON.stringify(self._selfPatterns));
                    self._client.updateTerritory(self._territoryId, self._selfPatterns);
                }, 2000);
            } else {
                this._logger.debug('Updating territory with ruleset from decorators: ' +
                                  JSON.stringify(this._selfPatterns));
                this._client.updateTerritory(this._territoryId, this._selfPatterns);
            }
        }

        // //check if firstload
        // if (this._firstLoad === true) {
        //     this._firstLoad = false;

        //     //check if there is active selection set in client
        //     var activeSelection = WebGMEGlobal.State.getActiveSelection();

        //     if (activeSelection && activeSelection.length > 0) {
        //         i = activeSelection.length;
        //         var gmeID;
        //         var ddSelection = [];
        //         while (i--) {
        //             //try to find each object present in the active selection mapped to DiagramDesigner element
        //             gmeID = activeSelection[i];

        //             if (this._GmeID2ComponentID[gmeID]) {
        //                 ddSelection = ddSelection.concat(this._GmeID2ComponentID[gmeID]);
        //             }
        //         }

        //         // this.designerCanvas.select(ddSelection);
        //     }
        // }

        this._logger.debug('_dispatchEvents "' + events.length + '" items - DONE');

        //continue processing event queue
        this.processNextInQueue();
    };

    cytoscapeControl.prototype._onLoad = function (gmeID, objD) {
        var uiComponent,
            decClass,
            objDesc,
            sources = [],
            destinations = [],
            territoryChanged = false,
            self = this,

            srcDst,
            k,
            l;


        //component loaded
        //we are interested in the load of sub_components of the opened component
        if (this._currentNodeId !== gmeID) {
            if (objD) {
                if (objD.parentId === this._currentNodeId) {
                    objDesc = _.extend({}, objD);
                    this._GmeID2ComponentID[gmeID] = [];

                    if (!objDesc.isConnection) {


                        var description = this._getObjectDescriptor(gmeID);
                        var cyData = this._getCytoscapeData(description);
                        this._widget.addNode(cyData);


                        this._GMEModels.push(gmeID);

                        objDesc.control = this;
                        objDesc.metaInfo = {};
                        objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;
                        objDesc.preferencesHelper = PreferencesHelper.getPreferences();

                        // uiComponent = this.designerCanvas.createDesignerItem(objDesc);

                        this._GmeID2ComponentID[gmeID].push(gmeID);
                        this._ComponentID2GmeID[gmeID] = gmeID;

                        // getDecoratorTerritoryQueries(uiComponent._decoratorInstance);

                    } else {

                        this._GMEConnections.push(gmeID);

                        srcDst = this._getAllSourceDestinationPairsForConnection(objDesc.source.to, objDesc.target.to);
                        sources = srcDst.sources;
                        destinations = srcDst.destinations;

                        k = sources.length;
                        l = destinations.length;

                        if (k > 0 && l > 0) {
                            while (k--) {
                                while (l--) {
                                    objDesc.srcObjId = sources[k].objId;
                                    objDesc.srcSubCompId = sources[k].subCompId;
                                    objDesc.dstObjId = destinations[l].objId;
                                    objDesc.dstSubCompId = destinations[l].subCompId;
                                    objDesc.reconnectable = true;
                                    objDesc.editable = true;

                                    delete objDesc.source;
                                    delete objDesc.target;

                                    // _.extend(objDesc, this.getConnectionDescriptor(gmeID));
                                    // uiComponent = this.designerCanvas.createConnection(objDesc);


                                    var description = this._getObjectDescriptor(gmeID);
                                    var cyData = this._getCytoscapeData(description);
                                    this._widget.addNode(cyData);

                                    this._logger.debug('Connection: ' + gmeID + ' for GME object: ' +
                                                      objDesc.id);

                                    this._GmeID2ComponentID[gmeID].push(gmeID);
                                    this._ComponentID2GmeID[gmeID] = gmeID;
                                }
                            }
                        } else {
                            //the connection is here, but no valid endpoint on canvas
                            //save the connection
                            this._delayedConnections.push(gmeID);
                        }
                    }
                } else {
                    //supposed to be the grandchild of the currently open node
                    //--> load of port
                    /*if(this._GMEModels.indexOf(objD.parentId) !== -1){
                     this._onUpdate(objD.parentId,this._getObjectDescriptor(objD.parentId));
                     }*/
                    this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_LOAD);
                }
            }
        } else {
            //currently opened node
            // this._updateSheetName(objD.name);
            // this._updateAspects();
        }

        return territoryChanged;

    };

    cytoscapeControl.prototype._getAllSourceDestinationPairsForConnection = function (GMESrcId, GMEDstId) {
        var sources = [],
            destinations = [],
            i;

        if (this._GmeID2ComponentID.hasOwnProperty(GMESrcId)) {
            //src is a DesignerItem
            i = this._GmeID2ComponentID[GMESrcId].length;
            while (i--) {
                sources.push({
                    objId: this._GmeID2ComponentID[GMESrcId][i],
                    subCompId: undefined
                });
            }
        } else {
            //src is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMESrcId)) {
                for (i in this._GMEID2Subcomponent[GMESrcId]) {
                    if (this._GMEID2Subcomponent[GMESrcId].hasOwnProperty(i)) {
                        sources.push({
                            objId: i,
                            subCompId: this._GMEID2Subcomponent[GMESrcId][i]
                        });
                    }
                }
            }
        }

        if (this._GmeID2ComponentID.hasOwnProperty(GMEDstId)) {
            i = this._GmeID2ComponentID[GMEDstId].length;
            while (i--) {
                destinations.push({
                    objId: this._GmeID2ComponentID[GMEDstId][i],
                    subCompId: undefined
                });
            }
        } else {
            //dst is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMEDstId)) {
                for (i in this._GMEID2Subcomponent[GMEDstId]) {
                    if (this._GMEID2Subcomponent[GMEDstId].hasOwnProperty(i)) {
                        destinations.push({
                            objId: i,
                            subCompId: this._GMEID2Subcomponent[GMEDstId][i]
                        });
                    }
                }
            }
        }

        return {
            sources: sources,
            destinations: destinations
        };
    };


    // cytoscapeControl.prototype._onLoad = function (gmeId) {
    //     if (this._currentNodeId !== gmeId) {
    //         var description = this._getObjectDescriptor(gmeId);
    //         var cyData = this._getCytoscapeData(description);
    //         this._widget.addNode(cyData);
    //     }
    // };

    cytoscapeControl.prototype._onUpdate = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        this._widget.updateNode(description);
    };

    cytoscapeControl.prototype._onUnload = function (gmeId) {
        this._widget.removeNode(gmeId);
    };

    cytoscapeControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    cytoscapeControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    cytoscapeControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    cytoscapeControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    cytoscapeControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();
    };

    cytoscapeControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    cytoscapeControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    cytoscapeControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    cytoscapeControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    cytoscapeControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        this.$btnModelHierarchyUp = toolBar.addButton({
            title: 'Go to parent',
            icon: 'glyphicon glyphicon-circle-arrow-up',
            clickFn: function (/*data*/) {
                WebGMEGlobal.State.registerActiveObject(self._currentNodeParentId);
            }
        });
        this._toolbarItems.push(this.$btnModelHierarchyUp);
        this.$btnModelHierarchyUp.hide();

        /************** Checkbox example *******************/

        this.$cbShowConnection = toolBar.addCheckBox({
            title: 'toggle checkbox',
            icon: 'gme icon-gme_diagonal-arrow',
            checkChangedFn: function (data, checked) {
                self._logger.log('Checkbox has been clicked!');
            }
        });
        this._toolbarItems.push(this.$cbShowConnection);

        this._toolbarInitialized = true;
    };

    return cytoscapeControl;
});
