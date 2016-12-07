
/**
 * The panel is part of the GME ecosystem.
 * The cytoscape widget and control work in this context.
 */

import PanelBaseWithHeader = require("js/PanelBase/PanelBaseWithHeader");
import IActivePanel = require("js/PanelManager/IActivePanel");
import { CytoscapeWidget } from "visualizers/widgets/cytoscape/CytoscapeWidget";
import { CytoscapeControl } from "./CytoscapeControl";

/**
 * This could be done better with a Mixin but typescript mixins are 
 * kind of clunky at present.
 */
class CytoscapePanel extends PanelBaseWithHeader implements IActivePanel {
    static readonly ACTIVE_CLASS = "active-panel";
    private $pEl: JQuery;

    public widget: CytoscapeWidget;
    private _client: any;
    private $el: JQuery;

    constructor(layoutManager: GmePanel.LayoutManager, params: GmePanel.Params) {
        super({
            LOGGER_INSTANCE_NAME: "CytoscapePanel",
            HEADER_TITLE: "CytoscapePanel",
            FLOATING_TITLE: "CytoscapePanel",
            NO_SCROLLING: "true"
        }, layoutManager);

        this._client = params.client;
        this._initialize();
        this.logger.debug("CytoscapePanel: constructor finished");
    };

    /**
     * IActivePanel is not really an interface.
     * It provides an implementation of the setActive method.
     * Which, due to the lack of mix-ins in typescript is duplicated here...
     */
    setActive(isActive: boolean): void {
        if (isActive === true) {
            this.$pEl.addClass(CytoscapePanel.ACTIVE_CLASS);
            this.onActivate();
        } else {
            this.$pEl.removeClass(CytoscapePanel.ACTIVE_CLASS);
            this.onDeactivate();
        }
    }

    _initialize = () => {
        this.setTitle("");
        this.widget = new CytoscapeWidget(this.logger, this.$el);
        this.widget.setTitle = (title: string): void => {
            this.setTitle(title);
        };

        this.widget.onUIActivity = () => {
            if (typeof WebGMEGlobal.PanelManager === "undefined") {
                return;
            }
            WebGMEGlobal.PanelManager.setActivePanel(this);
            if (typeof WebGMEGlobal.KeyboardManager === "undefined") {
                return;
            }
            WebGMEGlobal.KeyboardManager.setListener(this.widget);
        };

        this.control = new CytoscapeControl({
            logger: this.logger,
            client: this._client,
            widget: this.widget
        });

        this.onActivate();
    };


    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET"S READ-ONLY PROPERTY CHANGES */
    onReadOnlyChanged(isReadOnly: boolean): void {
        // apply parent"s onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

    };

    onResize(width: number, height: number): void {
        this.logger.debug(`onResize --> width: ${width}, height: ${height}`);
        this.widget.onWidgetContainerResize(width, height);
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    destroy(): void {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);

        let km = WebGMEGlobal.KeyboardManager;
        if (typeof km === "undefined") { return; }
        let tb = WebGMEGlobal.Toolbar;
        if (typeof tb === "undefined") { return; }

        km.setListener(undefined);
        tb.refresh();
    };

    onActivate = () => {
        this.widget.onActivate();
        this.control.onActivate();
        this.onResize(this.widget._el.width(), this.widget._el.height());

        let km = WebGMEGlobal.KeyboardManager;
        if (typeof km === "undefined") { return; }
        let tb = WebGMEGlobal.Toolbar;
        if (typeof tb === "undefined") { return; }

        km.setListener(this.widget);
        tb.refresh();
    };

    onDeactivate = () => {
        this.widget.onDeactivate();
        this.control.onDeactivate();

        let km = WebGMEGlobal.KeyboardManager;
        if (typeof km === "undefined") { return; }
        let tb = WebGMEGlobal.Toolbar;
        if (typeof tb === "undefined") { return; }

        km.setListener(undefined);
        tb.refresh();
    };
}

export = CytoscapePanel;
