
/**
 * Example indicating how to construct a 2D graph visualization.
 */

import _ = require("underscore");
import Promise = require("bluebird");
import nodePropertyNames = require("js/NodePropertyNames");
import GMEConcepts = require("js/Utils/GMEConcepts");
import registryKeys = require("js/RegistryKeys");
import PreferencesHelper = require("js/Utils/PreferencesHelper");

import { CytoscapeConstants } from "./constants/CytoscapeConstants";
import { GmeConstants, LineStyleArrows, LineStylePatterns } from "./constants/GmeConstants";
import { CytoscapeWidget } from "visualizers/widgets/cytoscape/CytoscapeWidget";
import "WebGMEGlobal";
// import { Sort } from "toposort";

export class ObjectDescriptor {
    constructor() {
        this.id = "";
        this.name = "";
        this.childrenIds = [];
        this.parentId = "";
        this.isConnection = false;
        this.childrenNum = 0;
        this.position = 0;
        this.source = "";
        this.target = "";
        this.pointers = {};
        this.srcPos = { x: 0, y: 0 };
        this.dstPos = { x: 0, y: 0 };
        this.srcObjId = "";
        this.dstObjId = "";
    }
    id: string;
    name: string;
    childrenIds: string[];
    parentId: string;
    isConnection: boolean;
    childrenNum: number;
    position: number;
    source: string;
    target: string;
    pointers: Dictionary<Common.Pointer>;
    srcPos: GME.Pos2D;
    dstPos: GME.Pos2D;
    srcObjId: string;
    dstObjId: string;

    control?: GME.VisualizerControl;
    metaInfo?: Dictionary<string>;
    preferencesHelper?: GME.PreferenceHelper;
    srcSubCompId?: string;
    dstSubCompId?: string;
    reconnectable?: boolean;
    editable?: boolean;
}

export class DescEvent implements GME.Event {
    id?: string;
    etype: GME.TerritoryEventType;
    eid: Common.GUID;
    desc: ObjectDescriptor;
    constructor(event: GME.Event) {
        this.etype = event.etype;
        this.eid = event.eid;
        this.desc = new ObjectDescriptor;
    }
}

export interface CytoscapeControlOptions {
    logger: Core.GmeLogger;
    client: GME.Client;
    widget: CytoscapeWidget;
};

export class ToolbarItems {
    constructor() {
        this.items = new Map<string, Toolbar.ToolbarItem>();
    }
    items: Map<string, Toolbar.ToolbarItem>;

    btnModelHierarchyUp: Toolbar.ToolbarButton;
    beginSeparator: Toolbar.ToolbarSeparator;
    ddbtnConnectionArrowStart: Toolbar.ToolbarDropDownButton;
    ddbtnConnectionPattern: Toolbar.ToolbarDropDownButton;
    ddbtnConnectionArrowEnd: Toolbar.ToolbarDropDownButton;
    ddbtnConnectionLineWidth: Toolbar.ToolbarDropDownButton;
    ddbtnConnectionLineType: Toolbar.ToolbarDropDownButton;

    cpFillColor: Toolbar.ToolbarColorPicker;
    cpTextColor: Toolbar.ToolbarColorPicker;
}


export class CytoscapeControl {

    private _logger: Core.GmeLogger;
    private _client: GME.Client;
    private _widget: CytoscapeWidget;
    private _currentNodeId: string | null;
    private _currentNodeParentId: string | undefined;
    public eventQueue: GME.Event[];

    private _GMEModels: any[];
    private _GMEConnections: any[];

    private _GmeID2ComponentID: Dictionary<string[]>;
    private _ComponentID2GmeID: Dictionary<string>;

    private _GMEID2Subcomponent: Dictionary<string[]>;
    private _Subcomponent2GMEID: Dictionary<string>;

    /**
     * The objects pointing cannot be loaded until
     * the things which they point at.
     */
    private _pendingEvents: DescEvent[];

    private _territoryId: GME.TerritoryId;
    private _patterns: Dictionary<GME.TerritoryPattern>;
    private _toolbarItems: ToolbarItems;

    private _toolbarInitialized = false;

    private _progressCounter = 0;

    constructor(options: CytoscapeControlOptions) {

        this._logger = options.logger.fork("Control");

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._widget._control = this;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;
        this.eventQueue = [];

        this._initWidgetEventHandlers();

        this._logger.debug("ctor finished");
    };

    _initWidgetEventHandlers = () => {
        this._widget.onNodeClick = (id) => {
            // Change the current active object
            let state = WebGMEGlobal.State;
            if (typeof state === "undefined") { return; }
            state.registerActiveObject(id);
        };
    };

    /**
     * Managing the Territory.
     * The territory defines the parts of the project
     * that the visualizer is interested in.
     * (this allows the browser to then only load those relevant parts).
     */

    selectedObjectChanged = (nodeId: string) => {
        let desc = this._getObjectDescriptor(nodeId);

        this._logger.debug(`activeObject nodeId "${nodeId}"`);

        // reinitialize cy data in widget
        this._widget._cy.remove("node");
        this._widget._cy.remove("edge");

        // clean up local dictionaries and arrays
        this._GMEModels = [];
        this._GMEConnections = [];

        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};

        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};

        this._pendingEvents = [];

        // Remove current territory patterns
        if (this._currentNodeId) {
            this._client.removeUI(this._territoryId);
        }

        this._currentNodeId = nodeId;
        this._currentNodeParentId = undefined; // desc.parentId

        // Test to see if the node-id looks like a path
        if (typeof this._currentNodeId !== "string") { return; }

        if (typeof desc.name === "string") {
            this._widget.setTitle(desc.name);
        }
        // save active node (current active container)
        this._widget.setActiveNode(nodeId);

        if (typeof desc.parentId !== "string") {
            this._toolbarItems.btnModelHierarchyUp.hide();
        } else if (desc.parentId === GmeConstants.PROJECT_ROOT_ID) {
            this._toolbarItems.btnModelHierarchyUp.show();
        } else {
            this._toolbarItems.btnModelHierarchyUp.hide();
        }

        this._currentNodeParentId = desc.parentId;

        this._territoryId = this._client.addUI(this, (events: GME.Event[]) => {
            if (!events) { return; }
            if (events.length < 1) { return; }

            this._logger.debug(`_eventCallback "${events.length}" items`);
            this.eventQueue = this.eventQueue.concat(events);

            this.processEventQueue();
        });

        // Update the territory
        // Put new node's info into territory pattern set
        this._patterns = {};
        this._patterns[nodeId] = { children: 1 };
        this._client.updateTerritory(this._territoryId, this._patterns);
    };

    // This next function retrieves the relevant node information for the widget
    _getObjectDescriptor = (nodeId: Common.NodeId): ObjectDescriptor => {
        let nodeObj = this._client.getNode(nodeId);

        let objDescriptor = new ObjectDescriptor;
        if (nodeId === "") { return objDescriptor; }
        if (!nodeObj) { return objDescriptor; }


        objDescriptor.id = nodeObj.getId();
        let outName = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
        if (typeof outName === "string") {
            objDescriptor.name = outName;
        }
        objDescriptor.childrenIds = nodeObj.getChildrenIds();
        objDescriptor.childrenNum = (typeof objDescriptor.childrenIds === "undefined") ? 0 : objDescriptor.childrenIds.length;
        objDescriptor.parentId = nodeObj.getParentId();
        objDescriptor.isConnection = GMEConcepts.isConnection(nodeObj);
        // GMEConcepts can be helpful
        // objDescriptor.isConnection = Boolean(nodeObj.getPointer("src") && nodeObj.getPointer("dst"));
        objDescriptor.position = nodeObj.getRegistry(registryKeys.POSITION);
        if (objDescriptor.isConnection) {
            let outSourceId = nodeObj.getPointer("src");
            if (typeof outSourceId === "string") {
                objDescriptor.source = outSourceId;
            }
            let outTargetId = nodeObj.getPointer("dst");
            if (typeof outTargetId === "string") {
                objDescriptor.target = outTargetId;
            }
        }

        let pointers = nodeObj.getPointerNames();
        for (let ix = 0; ix < pointers.length; ++ix) {
            if (((pointers[ix] !== "src" && pointers[ix] !== "dst") || !objDescriptor.isConnection)
                && pointers[ix] !== "base") {
                if (!objDescriptor.pointers) {
                    objDescriptor.pointers = {};
                }
                objDescriptor.pointers[pointers[ix]] = nodeObj.getPointer(pointers[ix]);
            }
        }
        return objDescriptor;
    };

    _getCytoscapeData = (desc: ObjectDescriptor): any[] => {
        let data: any[] = [];
        if (!desc) {
            return data;
        }
        if (!desc.isConnection) {
            data.push({
                group: "nodes",
                data: {
                    id: desc.id,
                    name: desc.name
                },
                position: desc.position
            });
        }
        else if (!desc.pointers) {
            /***** this section is used to create hyper edges *****/
            data.push({
                group: "edges",
                data: {
                    id: desc.id,
                    name: desc.name,
                    source: desc.srcObjId,
                    target: desc.dstObjId
                }
            });
        }
        else {
            let x = desc.srcPos.x + desc.dstPos.x;
            let y = desc.srcPos.y + desc.dstPos.y;
            let n = 2;
            for (let key in desc.pointers) {
                if (desc.pointers.hasOwnProperty(key)) { continue; }
                let pointer = desc.pointers[key];
                if (!pointer.to) { continue; }
                if (!this._GmeID2ComponentID.hasOwnProperty(pointer.to)) { continue; }

                ++n;
                let pos = this._client.getNode(pointer.to).getRegistry(registryKeys.POSITION);
                x += pos.x;
                y += pos.y;
            }
            data.push({
                group: "nodes",
                data: {
                    id: desc.id,
                    name: desc.name
                },
                position: {
                    x: x / n,
                    y: y / n
                }
            });

            data.push({
                group: "edges",
                data: {
                    id: `${desc.id}src`,
                    name: "src",
                    source: desc.id,
                    target: desc.srcObjId
                }
            });

            data.push({
                group: "edges",
                data: {
                    id: `${desc.id}dst`,
                    name: "dst",
                    source: desc.id,
                    target: desc.dstObjId
                }
            });
        }

        if (desc.pointers) {
            for (let i in desc.pointers) {
                if (!desc.pointers[i].to) { continue; }
                data.push({
                    group: "edges",
                    data: {
                        name: i,
                        id: `${desc.id}${i}`,
                        source: desc.id,
                        target: desc.pointers[i].to
                    }
                });
            }
        }
        return data;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */


    /**
     * update the object descriptions of the events and dispatch them.
     */
    processEventQueue = (): void => {
        try {
            let events = this.eventQueue;
            if (events.length < 1) {
                this._logger.error(`_dispatchEvents was called with no items`);
                return;
            }
            if (events.length < 2) {
                if (events[0].etype === GmeConstants.TERRITORY_EVENT_COMPLETE) {
                    this._progressCounter--;
                    this._logger.error(`_dispatchEvents no progress`);
                    return;
                }
            } else {
                this._progressCounter = 0;
            }
            this._logger.debug(`_dispatchEvents "${events.length}" items`);

            /**
             * add new events to the pending event queue.
             */
            for (let event = events.pop(); event; event = events.pop()) {
                this._pendingEvents.push({
                    etype: event.etype,
                    eid: event.eid,
                    desc: this._getObjectDescriptor(event.eid)
                });
            }

            /********** ORDER EVENTS BASED ON DEPENDENCY ************/
            /** 
             * relations which imply dependency
             *  * containment : except for containment in the context-node
             *  * pointers : but only those starting at children of the context-node
             *  * sets : same as for pointers
             *  * inherit/mixin : ignored for now
             */
            let orderedEvents = this._pendingEvents;
            this._pendingEvents = [];

            let territoryChanged = false;
            this._widget.beginUpdate();
            try {
                // 
                for (let event = orderedEvents.pop(); event; event = orderedEvents.pop()) {
                    switch (event.etype) {
                        case GmeConstants.TERRITORY_EVENT_LOAD:
                            territoryChanged = this._onLoad(event) || territoryChanged;
                            break;
                        case GmeConstants.TERRITORY_EVENT_UPDATE:
                            this._onUpdate(event);
                            break;
                        case GmeConstants.TERRITORY_EVENT_UNLOAD:
                            territoryChanged = this._onUnload(event) || territoryChanged;
                            break;
                        case GmeConstants.TERRITORY_EVENT_COMPLETE:
                            break;
                    }
                }
            } finally {
                this._widget.endUpdate();
            }

            // update the territory
            Promise
                .try(() => {
                    if (territoryChanged) { return true; }
                    if (this._pendingEvents.length > 0) { return true; }
                    return false;
                })
                .then((territoryChanged: boolean) => {
                    if (!territoryChanged) { return; }

                    this._logger.warn("Updating territory with ruleset from decorators: " +
                        JSON.stringify(this._patterns));
                    this._client.updateTerritory(this._territoryId, this._patterns);
                });

        } catch (err) {
            this._logger.error(`problem processing queue`);
        }
    }

    /**
     * an entity is a node with no pointers
     * realize that a node should not be added if...
     * return true if the object was seccessfully loaded (false otherwise)
     * True indicates that the territory changed.
     */
    _onLoadEntity = (event: DescEvent, pointersLoaded: boolean): boolean => {
        // gmeId: Common.GUID, pointersLoaded: boolean, objDesc: ObjectDescriptor): boolean => {
        let gmeId = event.eid;
        let objDesc = event.desc;

        if (!pointersLoaded) {
            this._pendingEvents.push(event);
            return false;
        }
        this._widget.addNode(this._getCytoscapeData(objDesc));

        this._GMEModels.push(gmeId);

        objDesc.control = this;
        objDesc.metaInfo = {};
        objDesc.metaInfo[GmeConstants.GME_ID] = gmeId;
        objDesc.preferencesHelper = PreferencesHelper.getPreferences();

        this._GmeID2ComponentID[gmeId].push(gmeId);
        this._ComponentID2GmeID[gmeId] = gmeId;

        return true;
    };

    /**
     * a connection is a node that has pointers
     * return true if the object was seccessfully loaded (false otherwise)
     * True indicates that the territory changed.
     */
    _onLoadConnection = (event: DescEvent, pointersLoaded: boolean): boolean => {
        let gmeId = event.eid;
        let objDesc = event.desc;

        this._GMEConnections.push(gmeId);
        let srcDst = this._getAllSourceDestinationPairsForConnection(objDesc.source, objDesc.target);
        let sources = srcDst.sources;
        let destinations = srcDst.destinations;

        // guards 
        // when the connection is present, but no valid endpoint on canvas
        // preserve the connection
        if (sources.length < 1) {
            this._pendingEvents.push(event);
            return false;
        }
        if (destinations.length < 1) {
            this._pendingEvents.push(event);
            return false;
        }
        if (!pointersLoaded) {
            this._pendingEvents.push(event);
            return false;
        }

        for (let ix = sources.length; ix--; ix) {
            let source = sources[ix];
            for (let jx = destinations.length; jx--; jx) {
                let destination = destinations[jx];

                objDesc.srcObjId = source.objId;
                objDesc.srcSubCompId = source.subCompId;
                objDesc.dstObjId = destination.objId;
                objDesc.dstSubCompId = destination.subCompId;
                objDesc.reconnectable = true;
                objDesc.editable = true;

                objDesc.srcPos = this._client.getNode(objDesc.srcObjId).getRegistry(registryKeys.POSITION);
                objDesc.dstPos = this._client.getNode(objDesc.dstObjId).getRegistry(registryKeys.POSITION);

                delete objDesc.source;
                delete objDesc.target;

                this._widget.addNode(this._getCytoscapeData(objDesc));

                this._logger.debug(`Connection: ${gmeId} for GME object: ${objDesc.id}`);

                this._GmeID2ComponentID[gmeId].push(gmeId);
                this._ComponentID2GmeID[gmeId] = gmeId;
            }
        }
        return true;
    }

    /** 
     * return true if the object was seccessfully loaded (false otherwise)
     * True indicates that the territory changed.
     */
    _onLoad = (event: DescEvent): boolean => {
        let gmeId = event.eid;
        let objDesc = event.desc;
        if (typeof objDesc === "undefined") {
            return false;
        }

        // component loaded
        // we are interested in the load of sub_components of the opened component
        if (this._currentNodeId === gmeId) {
            // currently opened node
            //  this._updateSheetName(objD.name);
            //  this._updateAspects();
            return false;
        }

        if (!objDesc) {
            return false;
        }

        this._GmeID2ComponentID[gmeId] = [];

        let pointersLoaded = this._areAllPointersLoaded(objDesc);
        if (objDesc.parentId !== this._currentNodeId) {
            pointersLoaded = true;
        }

        if (objDesc.isConnection) {
            return this._onLoadConnection(event, pointersLoaded);
        } else {
            return this._onLoadEntity(event, pointersLoaded);
        }
    };

    _getAllSourceDestinationPairsForConnection
    = (GMESrcId: string, GMEDstId: string): GMEConcepts.ConnectionCollectionPair => {

        let sources: GMEConcepts.ComposeChain[] = [];
        let destinations: GMEConcepts.ComposeChain[] = [];

        if (this._GmeID2ComponentID.hasOwnProperty(GMESrcId)) {
            // src is a DesignerItem
            let compIds = this._GmeID2ComponentID[GMESrcId];
            for (let ix = compIds.length; ix--; ix) {
                let compId = compIds[ix];

                sources.push({
                    objId: compId,
                    subCompId: undefined
                });
            }
        } else {
            // src is not a DesignerItem
            // must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMESrcId)) {
                for (let i in this._GMEID2Subcomponent[GMESrcId]) {
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
            let compIds = this._GmeID2ComponentID[GMEDstId];
            for (let ix = compIds.length; ix--; ix) {
                let compId = compIds[ix];

                destinations.push({
                    objId: compId,
                    subCompId: undefined
                });
            }
        } else {
            // dst is not a DesignerItem
            // must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMEDstId)) {
                for (let ix in this._GMEID2Subcomponent[GMEDstId]) {
                    if (this._GMEID2Subcomponent[GMEDstId].hasOwnProperty(ix)) {
                        destinations.push({
                            objId: ix,
                            subCompId: this._GMEID2Subcomponent[GMEDstId][ix]
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

    /**
     * This function checks that all pointers that point 
     * point to something have been loaded. 
     */
    _areAllPointersLoaded = (desc: ObjectDescriptor) => {
        let pointers = desc.pointers;
        if (_.isEmpty(pointers)) {
            return true;
        }
        for (let key in pointers) {
            if (!(key in pointers)) {
                return false;
            }
            let pointer = pointers[key];
            if (!pointer.to) {
                continue;
            }
            if (pointer.to in this._GmeID2ComponentID) {
                continue;
            }
            this._patterns[pointer.to] = { children: 0 };
            return false;
        }
        return true;
    }

    _onUpdate(event: DescEvent): boolean {
        let gmeId = event.eid;
        let desc = event.desc;
        if (typeof desc === "undefined") {
            let description = this._getObjectDescriptor(gmeId);
            this._widget.updateNode(description);
            return true;
        }
        this._widget.updateNode(desc);
        return true;
    };

    _onUnload = (event: DescEvent): boolean => {
        this._widget.removeNode(event.eid);
        return true;
    };

    _stateActiveObjectChanged = (_model: any, activeObjectId: string) => {
        this.selectedObjectChanged(activeObjectId);
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    destroy = () => {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    _attachClientEventListeners = () => {
        this._detachClientEventListeners();
        let state = WebGMEGlobal.State;
        if (typeof state === "undefined") { return; }
        state.on(`change: ${GmeConstants.STATE_ACTIVE_OBJECT}`, this._stateActiveObjectChanged, this);
    };

    _detachClientEventListeners = () => {
        let state = WebGMEGlobal.State;
        if (typeof state === "undefined") { return; }
        state.off(`change: ${GmeConstants.STATE_ACTIVE_OBJECT}`, this._stateActiveObjectChanged);
    };

    onActivate = () => {
        this._attachClientEventListeners();
        this._displayToolbarItems();
    };

    onDeactivate = () => {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    _displayToolbarItems = () => {

        if (this._toolbarInitialized === true) {
            for (let [, v] of this._toolbarItems.items) {
                v.show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    _hideToolbarItems = () => {

        if (this._toolbarInitialized === true) {
            for (let [, v] of this._toolbarItems.items) {
                v.hide();
            }
        }
    };

    _removeToolbarItems = () => {

        if (this._toolbarInitialized === true) {
            for (let [, v] of this._toolbarItems.items) {
                v.destroy();
            }
        }
    };

    _setCyObjectProperty = (params: { [name: string]: string }) => {
        let cyObj = this._widget._selectedCyObject;
        if (!cyObj) { return; }
        if (typeof cyObj === "string") { return; }
        for (let p in params) {
            cyObj.style(p, params[p]);
        }
    };

    _initializeToolbar = (): void => {
        let toolBar = WebGMEGlobal.Toolbar;
        if (typeof toolBar === "undefined") { return; }

        let btnIconBase = $("<i/>");
        this._toolbarItems = new ToolbarItems();

        this._toolbarItems.beginSeparator = toolBar.addSeparator();

        /************** Go to hierarchical parent button ****************/
        this._toolbarItems.btnModelHierarchyUp = toolBar.addButton({
            title: "Go to parent",
            icon: "glyphicon glyphicon-circle-arrow-up",
            clickFn: ( /*data*/): void => {
                let state = WebGMEGlobal.State;
                if (typeof state === "undefined") { return; }
                if (typeof this._currentNodeParentId === "undefined") { return; }
                state.registerActiveObject(this._currentNodeParentId);
            }
        });
        this._toolbarItems.btnModelHierarchyUp.hide();

        this._toolbarItems.ddbtnConnectionArrowStart = toolBar.addDropDownButton({
            title: "Line start marker",
            icon: "glyphicon glyphicon-arrow-left",
            menuClass: "no-min-width"
        });
        this._toolbarItems.ddbtnConnectionPattern = toolBar.addDropDownButton({
            title: "Line pattern",
            icon: "glyphicon glyphicon-minus",
            menuClass: "no-min-width"
        });
        this._toolbarItems.ddbtnConnectionArrowEnd = toolBar.addDropDownButton({
            title: "Line end marker",
            icon: "glyphicon glyphicon-arrow-right",
            menuClass: "no-min-width"
        });

        this._toolbarItems.ddbtnConnectionLineWidth = toolBar.addDropDownButton({
            title: "Line width",
            icon: btnIconBase.clone().addClass("gme icon-gme_lines"),
            menuClass: "no-min-width"
        });

        this._toolbarItems.ddbtnConnectionLineType = toolBar.addDropDownButton({
            title: "Line type",
            icon: btnIconBase.clone().addClass("gme  icon-gme_curvy-line"),
            menuClass: "no-min-width"
        });

        let createArrowMenuItem = (arrowType: string, isEnd: boolean) => {
            let size = arrowType === LineStyleArrows.NONE ? "" : "-xwide-xlong";
            let startArrow = isEnd ? null : `${arrowType}${size}`;
            let startArrowCy = isEnd ? null : (<any>LineStyleArrows)[arrowType];
            let endArrow = isEnd ? `${arrowType}${size}` : null;
            let endArrowCy = isEnd ? (<any>LineStyleArrows)[arrowType] : null;

            return {
                title: arrowType,
                icon: this._createLineStyleMenuItem(null, null, null, startArrow, endArrow, null),
                data: <GMEConcepts.ConnectionStyle>{
                    endArrow: endArrowCy,
                    startArrow: startArrowCy
                },
                clickFn: (data: GMEConcepts.ConnectionStyle) => {
                    let p: Dictionary<string> = {};
                    if (data.endArrow) {
                        p[CytoscapeConstants.LINE_END_ARROW] = data.endArrow;
                    }
                    if (data.startArrow) {
                        p[CytoscapeConstants.LINE_START_ARROW] = data.startArrow;
                    }
                    this._setCyObjectProperty(p);
                }
            };
        };

        let createPatternMenuItem = (pattern: string) => {
            return {
                title: pattern,
                icon: this._createLineStyleMenuItem(null, null,
                    (<any>LineStylePatterns)[pattern], null, null, null),
                data: { pattern: pattern },
                clickFn: (data: { pattern: string }) => {
                    let p: Dictionary<string> = {};
                    p[CytoscapeConstants.LINE_PATTERN] =
                        (<any>LineStylePatterns)[data.pattern];
                    this._setCyObjectProperty(p);
                }
            };
        };

        for (let it in CytoscapeConstants.LINE_ARROWS) {
            if (CytoscapeConstants.LINE_ARROWS.hasOwnProperty(it)) {
                this._toolbarItems.ddbtnConnectionArrowStart.addButton(
                    createArrowMenuItem((<any>CytoscapeConstants.LINE_ARROWS)[it], false));

                this._toolbarItems.ddbtnConnectionArrowEnd.addButton(
                    createArrowMenuItem((<any>CytoscapeConstants.LINE_ARROWS)[it], true));
            }
        }

        for (let it in CytoscapeConstants.LINE_PATTERNS) {
            if (CytoscapeConstants.LINE_PATTERNS.hasOwnProperty(it)) {
                this._toolbarItems.ddbtnConnectionPattern.addButton(createPatternMenuItem(it));
            }
        }

        // fill linetype dropdown
        this._toolbarItems.ddbtnConnectionLineType.addButton({
            title: "Straight",
            icon: this._createLineStyleMenuItem(null, null, null, null, null, null),
            clickFn: (/*data*/) => {
                let p: Dictionary<string> = {};
                p[CytoscapeConstants.LINE_TYPE] = CytoscapeConstants.LINE_TYPES.NONE;
                this._setCyObjectProperty(p);
            }
        });

        this._toolbarItems.ddbtnConnectionLineType.addButton({
            title: "Bezier",
            icon: this._createLineStyleMenuItem(null, null, null, null, null,
                CytoscapeConstants.LINE_TYPES.BEZIER),
            clickFn: (/*data*/) => {
                let p: Dictionary<string> = {};
                p[CytoscapeConstants.LINE_TYPE] = CytoscapeConstants.LINE_TYPES.BEZIER;
                this._setCyObjectProperty(p);
            }
        });

        // fill linewidth dropdown
        let createWidthMenuItem = (width: number) => {
            return {
                title: width,
                icon: this._createLineStyleMenuItem(width, null,
                    CytoscapeConstants.LINE_PATTERNS.SOLID, null, null, null),
                data: { width: width },
                clickFn: (data: { width: string }) => {
                    let p: Dictionary<string> = {};
                    p[CytoscapeConstants.LINE_WIDTH] = data.width;
                    this._setCyObjectProperty(p);
                }
            };
        };

        for (let it = 1; it < 10; it += 1) {
            this._toolbarItems.ddbtnConnectionLineWidth.addButton(createWidthMenuItem(it));
        }

        this._toolbarItems.ddbtnConnectionArrowStart.enabled(false);
        this._toolbarItems.ddbtnConnectionPattern.enabled(false);
        this._toolbarItems.ddbtnConnectionArrowEnd.enabled(false);
        this._toolbarItems.ddbtnConnectionLineType.enabled(false);
        this._toolbarItems.ddbtnConnectionLineWidth.enabled(false);
        /************** END OF - VISUAL STYLE ARROWS *****************/


        // add fill color, text color, border color controls
        this._toolbarItems.cpFillColor = toolBar.addColorPicker({
            icon: "glyphicon glyphicon-tint",
            title: "Fill color",
            colorChangedFn: (color: string) => {
                let p: Dictionary<string> = {};
                let cyObj = this._widget._selectedCyObject;
                if (cyObj === null) {
                    this._logger.warn("selected cytoscape object is null");
                    return;
                }
                if (typeof cyObj === "string") {
                    this._logger.warn(`selected cytoscape object is ${cyObj}`);
                    return;
                }
                if (cyObj.isEdge()) {
                    p[CytoscapeConstants.LINE_COLOR] = color;
                    p[CytoscapeConstants.SOURCE_ARROW_COLOR] = color;
                    p[CytoscapeConstants.TARGET_ARROW_COLOR] = color;
                } else if (cyObj.isNode()) {
                    p[CytoscapeConstants.NODE_COLOR] = color;
                }
                this._setCyObjectProperty(p);
            }
        }
        );


        this._toolbarItems.cpTextColor = toolBar.addColorPicker({
            icon: "glyphicon glyphicon-font",
            title: "Text color",
            colorChangedFn: (color: string) => {
                let p: Dictionary<string> = {};
                p[CytoscapeConstants.LABEL_COLOR] = color;
                this._setCyObjectProperty(p);
            }
        }
        );

        this._toolbarItems.cpFillColor.enabled(false);
        this._toolbarItems.cpTextColor.enabled(false);


        this._toolbarInitialized = true;
    };

    /**
     * uses http://dmitrybaranovskiy.github.io/raphael/
     */
    _createLineStyleMenuItem = (width: number | null,
        color: string | null, pattern: string | null, startArrow: string | null,
        endArrow: string | null, type: string | null) => {
        // jshint newcap:false
        let el = $("<div/>");
        let hSize = 50;
        let vSize = 20;

        width = width || 1;
        color = color || "#000000";
        pattern = pattern || CytoscapeConstants.LINE_PATTERNS.SOLID;
        startArrow = startArrow || CytoscapeConstants.LINE_ARROWS.NONE;
        endArrow = endArrow || CytoscapeConstants.LINE_ARROWS.NONE;
        type = (type || CytoscapeConstants.LINE_TYPES.NONE).toLowerCase();

        el.attr({ style: `height: ${vSize}px; width: ${hSize}px;` });
        /*
        let paper = Raphael(el[0], hSize, vSize);
        let bezierControlOffset = 10;
        
        if (type === CytoscapeConstants.LINE_TYPES.BEZIER) {
            
            path = paper.path(`M 5, ${Math.round(vSize / 2) + 0.5} C${5 + bezierControlOffset},` +
                `${Math.round(vSize / 2) + 0.5 - bezierControlOffset * 2} ${hSize - bezierControlOffset},` +
                `${Math.round(vSize / 2) + 0.5 + bezierControlOffset * 2} ${hSize - 5},` +
                `${Math.round(vSize / 2) + 0.5}`);
                
        } else {
            path = paper.path(`M 5,${Math.round(vSize / 2) + 0.5} L${hSize - 5},` +
                `${Math.round(vSize / 2) + 0.5}`);
        }
        
     
        path.attr({
            "arrow-start": startArrow,
            "arrow-end": endArrow,
            stroke: color,
            "stroke-width": width,
            "stroke-dasharray": pattern
        });
        */

        return el;
    };
}
