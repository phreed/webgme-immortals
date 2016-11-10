
/**
 * The cytoscape widget describes the visual elements drawn on the cytoscape panel.
 * 
 */

import cytoscape = require("cytoscape");
import "jquery";
import "WebGMEGlobal";
import { CytoscapeControl, ObjectDescriptor } from "visualizers/panels/cytoscape/CytoscapeControl";

// import css = require("css!./styles/cytoscapeWidget.css");

export class CytoscapeWidget {
    // var cytoscapeWidget,
    private readonly WIDGET_CLASS = "cytoscape";
    public _cy: Cy.Instance;

    private _logger: Core.GmeLogger;
    private _activeNode: any;
    private _updating = false;
    public _selectedCyObject: Cy.ElementGroup | Cy.CollectionElements | null;
    public nodes: any;

    private _insertedConnectionIDs = [];
    private _updatedConnectionIDs = [];
    private _deletedConnectionIDs = [];
    private _insertedDesignerItemIDs = [];
    private _updatedDesignerItemIDs = [];
    private _deletedDesignerItemIDs = [];
    public _control: CytoscapeControl;

    public setTitle: { (title: string): void };
    public _el: JQuery;

    constructor(logger: Core.GmeLogger, container: JQuery) {
        this._logger = logger.fork("Widget", false);

        this._el = container;

        this.nodes = {};
        this._initialize();
        this._selectedCyObject = null;

        this._logger.debug("ctor finished");
    };

    _initialize = () => {
        // let width = this._el.width();
        // let height = this._el.height();

        // set widget class
        this._el.addClass(this.WIDGET_CLASS);

        this._initializeCytoscape();
        this.initializeEventListeners();

        // Registering to events can be done with jQuery (as normal)
        this._el.on("dblclick", (event): void => {
            event.stopPropagation();
            event.preventDefault();
            this.onBackgroundDblClick();
        });
    };

    _initializeCytoscape = (): void => {
        let nodeStyle: Cy.Stylesheet = {
            selector: "node",
            css: {
                "background-color": "red",
                "label": "data(name)"
                // "shape": "rectangle",
                // "width": "label"
            }
        };
        let edgeStyle: Cy.Stylesheet = {
            selector: "edge",
            css: {
                "width": 3,
                "line-color": "blue",
                "target-arrow-color": "orange",
                "target-arrow-shape": "triangle",
                "label": "data(name)"
            }
        };
        let selectedStyle: Cy.Stylesheet = {
            selector: ":selected",
            css: {
                "background-color": "gold",
                "line-color": "gold",
                "target-arrow-color": "gold",
                "source-arrow-color": "gold",
                "opacity": 1
            }
        };
        let fadeStyle: Cy.Stylesheet = {
            selector: ".faded",
            css: {
                "opacity": 0.25,
                "text-opacity": 0
            }
        };
        let layout: Cy.CircleLayoutOptions = {
            name: "circle",
            padding: 10
        };
        let options: Cy.CytoscapeOptions = {

            container: this._el.get(0),

            elements: [],
            style: [nodeStyle, edgeStyle, selectedStyle, fadeStyle],

            layout: layout
        };

        this._cy = cytoscape(options);
    };

    initializeEventListeners = (): void => {

        this._cy.on("tap", (evt: Cy.EventObject): void => {
            let pm = WebGMEGlobal.PanelManager;
            let state = WebGMEGlobal.State;
            if (typeof pm === "undefined") { return; }
            if (typeof state === "undefined") { return; }

            let control = pm.getActivePanel().control;
            let isEdge = false;
            let isNode = false;
            if (typeof evt.cyTarget.id === "function") {
                isEdge = evt.cyTarget.isEdge();
                isNode = evt.cyTarget.isNode();

                state.registerActiveSelection([evt.cyTarget.id()]);
                this._selectedCyObject = evt.cyTarget;

            } else /* if  (evt.cyTarget instanceof this._cy) */ {
                isEdge = false;
                state.registerActiveSelection([this._activeNode]);
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

    onWidgetContainerResize = (_width: number, _height: number): void => {
        this._logger.debug("Widget is resizing...");
        // this._cy.invalidateDimensions();
        this._cy.resize();
    };

    // Adding/Removing/Updating items
    addNode = (cyData: Cy.ElementDefinition[]): void => {
        if (!cyData) { return; }

        cyData.forEach((desc: Cy.ElementDefinition): void => {
            this._cy.add(desc);
        });
    };

    setActiveNode = (nodeId: string): void => {
        this._activeNode = nodeId;
    };

    removeNode = (gmeId: string): void => {
        delete this.nodes[gmeId];
    };

    updateNode = (desc: ObjectDescriptor): void => {
        if (!desc) { return; }

        this._logger.debug("Updating node:", desc.name);
    };

    beginUpdate = (): void => {
        this._logger.debug("beginUpdate");

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

    endUpdate = (): void => {
        this._logger.debug("endUpdate");

        this._updating = false;
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    onNodeClick = (_id: string): void => {
        // This currently changes the active node to the given id and
        // this is overridden in the controller.
    };

    onBackgroundDblClick = (): void => {
        this._el.append("<div>Background was double-clicked!!</div>");
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    destroy = (): void => {
    };

    onActivate = (): void => {
        this._logger.debug("cytoscapeWidget has been activated");
    };

    onDeactivate = (): void => {
        this._logger.debug("cytoscapeWidget has been deactivated");
    };

    onUIActivity: () => void;
}
