
/**
 * Example indicating how to construct a 2D graph visualization.
 */

// import _ = require("underscore");
import nodePropertyNames = require("js/NodePropertyNames");
import GMEConcepts = require("js/Utils/GMEConcepts");
import registryKeys = require("js/RegistryKeys");
import PreferencesHelper = require("js/Utils/PreferencesHelper");

import { CytoscapeConstants } from "./constants/CytoscapeConstants";
import { GmeConstants, LineStyleArrows, LineStylePatterns } from "./constants/GmeConstants";
import { CytoscapeWidget } from "visualizers/widgets/cytoscape/CytoscapeWidget";

import { Toposort, NodeMethods } from "toposort";

export class StrMap<V> extends Map<string, V> {
    toObj() {
        let obj = Object.create(null);
        this.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
}
export class ObjectDescriptor {
    constructor() {
        this.id = "";
        this.name = "";
        this.childrenIds = [];
        this.parentId = "";
        this.childrenNum = 0;
        this.position = { x: 0, y: 0 };
        this.pointers = new Map<string, GmeCommon.Pointer>();
    }
    id: string;
    name: string;
    childrenIds: string[];
    parentId: string;
    childrenNum: number;
    position: Gme.Pos2D;
    pointers: Map<string, GmeCommon.Pointer>;

    control?: Gme.VisualizerControl;
    metaInfo?: Map<string, string>;
    preferencesHelper?: Gme.PreferenceHelper;
    reconnectable?: boolean;
    editable?: boolean;
}

export class DescEvent implements Gme.Event {
    public id?: string;
    public etype: Gme.TerritoryEventType;
    public eid: Core.GUID;
    public desc: ObjectDescriptor;
    constructor(event: Gme.Event) {
        this.etype = event.etype;
        this.eid = event.eid;
        this.desc = new ObjectDescriptor;
    }
}

export interface CytoscapeControlOptions {
    logger: Global.GmeLogger;
    client: Gme.Client;
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

class EventMethods extends NodeMethods<DescEvent> {
    nullNode(key: string): DescEvent {
        let result = new DescEvent(
            {
                "etype": GmeConstants.TERRITORY_EVENT_INCOMPLETE,
                "eid": key
            });
        result.desc.id = key;
        return result;
    }
    /**
     * The key for the node is not the event.eid but
     * the event.desc.id which is the object descriptor id.
     */
    keyFn(event: DescEvent): string | null {
        if (event.etype === GmeConstants.TERRITORY_EVENT_COMPLETE) {
            return null;
        }
        if (event.etype === GmeConstants.TERRITORY_EVENT_INCOMPLETE) {
            return null;
        }
        if (typeof event.desc === "undefined") {
            throw new Error(`cannot make key for node`);
        }
        return event.desc.id;
    }
    /**
     * This includes:
     *   [x] pointers,
     *   [ ] containment, 
     *   [ ] sets, and 
     *   [ ] inheritance.
     */
    predsFn(event: DescEvent): string[] {
        let pointers = event.desc.pointers;
        let result: string[] = [];
        pointers.forEach((value) => {
            result.push(value.to);
        });
        return result;
    }
    cycleFn(_node: DescEvent): void {
        throw new Error(`a cycle exists, you should handle this`);
    }
}


export class CytoscapeControl {

    private _logger: Global.GmeLogger;
    private _client: Gme.Client;
    private _widget: CytoscapeWidget;
    private _currentNodeId: string | null;
    private _currentNodeParentId: string | undefined;
    public eventQueue: Gme.Event[];

    private _GMEModels: any[];
    private _GMEConnections: any[];

    private _GmeID2ComponentID: Map<string, string[]>;
    private _ComponentID2GmeID: Map<string, string>;

    private _GMEID2Subcomponent: Map<string, string[]>;
    private _Subcomponent2GMEID: Map<string, string>;

    /**
     * The objects pointing cannot be loaded until
     * the things which they point at.
     */
    private _pendingEvents: DescEvent[];

    private _territoryId: Gme.TerritoryId;
    private _patterns: StrMap<Gme.TerritoryPattern>;
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

        this._GmeID2ComponentID = new Map<string, string[]>();
        this._ComponentID2GmeID = new Map<string, string>();

        this._GMEID2Subcomponent = new Map<string, string[]>();
        this._Subcomponent2GMEID = new Map<string, string>();

        this._patterns = new StrMap<Gme.TerritoryPattern>();

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

        this._GmeID2ComponentID.clear();
        this._ComponentID2GmeID.clear();

        this._GMEID2Subcomponent.clear();
        this._Subcomponent2GMEID.clear();

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

        this._territoryId = this._client.addUI(this, (events: Gme.Event[]) => {
            if (!events) { return; }
            if (events.length < 1) { return; }

            this._logger.debug(`_eventCallback "${events.length}" items`);
            this.eventQueue = this.eventQueue.concat(events);

            this.processEventQueue();
        });

        // Update the territory
        // Put new node's info into territory pattern set
        this._patterns.clear();
        this._patterns.set(nodeId, { children: 1 });
        this._client.updateTerritory(this._territoryId, this._patterns.toObj());
    };

    // This next function retrieves the relevant node information for the widget
    _getObjectDescriptor = (nodeId: GmeCommon.NodeId): ObjectDescriptor => {
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
        objDescriptor.position = nodeObj.getRegistry(registryKeys.POSITION);

        nodeObj.getPointerNames().forEach((name) => {
            if (name === "base") { return; }
            objDescriptor.pointers.set(name, nodeObj.getPointer(name));
        });
        return objDescriptor;
    };

    /**
     * This builds the cytoscape elements associated with a node.
     */
    _getCytoscapeData = (desc: ObjectDescriptor): any[] => {
        let data: any[] = [];
        if (!desc) {
            return data;
        }
        // the node data needs to be added before the edges.
        let nodeData = {
            group: "nodes",
            data: {
                id: desc.id,
                name: desc.name
            },
            position: desc.position
        };
        data.push(nodeData);

        // ... now you can load the edges...
        let activePointerCnt = 0;
        let x = 0;
        let y = 0;
        if (desc.pointers.size > 0) {
            desc.pointers.forEach((pointer, ptrKey) => {
                if (!pointer.to) { return; }
                if (!this._GmeID2ComponentID.has(pointer.to)) { return; }

                let pos: Gme.Pos2D = this._client.getNode(pointer.to).getRegistry(registryKeys.POSITION);
                activePointerCnt++;
                x += pos.x;
                y += pos.y;

                data.push({
                    group: "edges",
                    data: {
                        id: `${desc.id}_${ptrKey}`,
                        name: ptrKey,
                        source: desc.id,
                        target: pointer.to
                    }
                });
            });
        }

        // ...update the position of the node if there were edges
        if (activePointerCnt > 0) {
            nodeData.position = {
                x: x / activePointerCnt,
                y: y / activePointerCnt
            };
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
            const eventMethods = new EventMethods;
            let orderedEvents = Toposort(this._pendingEvents, eventMethods);
            this._pendingEvents = [];

            let territoryChanged = false;
            this._widget.beginUpdate();
            try {
                orderedEvents.forEach((event) => {
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
                        case GmeConstants.TERRITORY_EVENT_INCOMPLETE:
                            break;
                    }
                });
            } finally {
                this._widget.endUpdate();
            }

            // update the territory
            let territoryChanged2: boolean = (territoryChanged) ? true : false;
            if (this._pendingEvents.length > 0) { territoryChanged2 = true; }
            if (!territoryChanged) { return; }

            this._logger.warn("Updating territory with ruleset from decorators: " +
                JSON.stringify(this._patterns));
            this._client.updateTerritory(this._territoryId, this._patterns.toObj());

        } catch (err) {
            this._logger.error(`problem processing queue`);
        }
    }

    /** 
     * return true if the object was seccessfully loaded (false otherwise)
     * True indicates that the territory changed.
     * 
     * An entity is a node with no pointers
     * realize that a node should not be added if...
     * return true if the object was seccessfully loaded (false otherwise)
     * True indicates that the territory changed.
     */
    _onLoad = (event: DescEvent): boolean => {

        let objDesc = event.desc;
        if (typeof objDesc === "undefined") {
            return false;
        }

        let gmeId = event.eid;
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

        this._GmeID2ComponentID.set(gmeId, []);

        let pointersLoaded = this._areAllPointersLoaded(objDesc);
        if (objDesc.parentId !== this._currentNodeId) {
            pointersLoaded = true;
        }

        if (!pointersLoaded) {
            this._pendingEvents.push(event);
            return false;
        }
        this._widget.addNode(this._getCytoscapeData(objDesc));

        this._GMEModels.push(gmeId);

        objDesc.control = this;
        objDesc.metaInfo = new Map<string, string>();
        objDesc.metaInfo.set(GmeConstants.GME_ID, gmeId);
        objDesc.preferencesHelper = PreferencesHelper.getPreferences();

        this._ComponentID2GmeID.set(gmeId, gmeId);
        let componentIds = this._GmeID2ComponentID.get(gmeId);
        if (typeof componentIds !== "undefined") {
            componentIds.push(gmeId);
            this._GmeID2ComponentID.set(gmeId, componentIds);
        }

        return true;
    };

    /**
     * This function checks that all pointers that point 
     * point to something have been loaded. 
     */
    _areAllPointersLoaded = (desc: ObjectDescriptor) => {
        let pointers = desc.pointers;
        if (pointers.size < 1) {
            return true;
        }
        let status = true;
        pointers.forEach((pointer) => {
            if (pointer.to === null) { return; }
            if (this._GmeID2ComponentID.has(pointer.to)) { return; }

            this._patterns.set(pointer.to, { children: 0 });
            status = false;
        });
        return status;
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
            this._toolbarItems.items.forEach((v) => { v.show(); });
        } else {
            this._initializeToolbar();
        }
    };

    _hideToolbarItems = () => {
        if (this._toolbarInitialized === true) {
            this._toolbarItems.items.forEach((v) => { v.hide(); });
        }
    };

    _removeToolbarItems = () => {
        if (this._toolbarInitialized === true) {
            this._toolbarItems.items.forEach((v) => { v.destroy(); });
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
                    let p: GmeCommon.Dictionary<string> = {};
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
                    let p: GmeCommon.Dictionary<string> = {};
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
                let p: GmeCommon.Dictionary<string> = {};
                p[CytoscapeConstants.LINE_TYPE] = CytoscapeConstants.LINE_TYPES.NONE;
                this._setCyObjectProperty(p);
            }
        });

        this._toolbarItems.ddbtnConnectionLineType.addButton({
            title: "Bezier",
            icon: this._createLineStyleMenuItem(null, null, null, null, null,
                CytoscapeConstants.LINE_TYPES.BEZIER),
            clickFn: (/*data*/) => {
                let p: GmeCommon.Dictionary<string> = {};
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
                    let p: GmeCommon.Dictionary<string> = {};
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
                let p: GmeCommon.Dictionary<string> = {};
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
                let p: GmeCommon.Dictionary<string> = {};
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
