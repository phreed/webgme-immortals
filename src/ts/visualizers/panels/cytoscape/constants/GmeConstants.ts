
/**
 * String constant definitions use in client
 * 
 * ./node_modules/webgme/src/client/js/Constants.js
 * https://github.com/webgme/webgme/blob/master/src/client/js/Constants.js
 */
import { CommonConstants } from "./CommonConstants";
import { ClientConstants } from "./ClientConstants";

export class GmeConstants extends CommonConstants {
    public static readonly CLIENT = ClientConstants;

    /*
     * DOM element ID to use for all-over-the-screen-draggable-parent
     */
    public static readonly ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID = "body";

    /*
     * META-INFORMATION ABOUT THE USER ACTION
     */
    public static readonly META_INFO = "metaInfo";

    /*
     * DRAG SOURCE IDENTIFIER (Widget; panel; etc)
     */
    public static readonly DRAG_SOURCE = "dragSource";

    /*
     * LINE VISUAL DESCRIPTOR CONSTANTS
     */
    public static readonly LINE_STYLE = new LineStyle;

    public static readonly DISPLAY_FORMAT_ATTRIBUTE_MARKER = "$";

    // the path to the SVGs that can be used by the decorators supporting SVG_Icon
    public static readonly ASSETS_DECORATOR_SVG_FOLDER = "assets/DecoratorSVG/";

    /* WebGME state constants */
    public static readonly STATE_ACTIVE_OBJECT = "activeObject";
    public static readonly STATE_ACTIVE_SELECTION = "activeSelection";
    public static readonly STATE_ACTIVE_ASPECT = "activeAspect";
    public static readonly STATE_ACTIVE_VISUALIZER = "activeVisualizer";
    public static readonly STATE_ACTIVE_PROJECT_NAME = "activeProjectName";
    public static readonly STATE_ACTIVE_COMMIT = "activeCommit";
    public static readonly STATE_ACTIVE_BRANCH_NAME = "activeBranchName";
    public static readonly STATE_ACTIVE_CROSSCUT = "activeCrosscut";
    public static readonly STATE_ACTIVE_TAB = "activeTab";
    public static readonly STATE_SUPPRESS_VISUALIZER_FROM_NODE = "suppressVisualizerFromNode";

    public static readonly STATE_LAYOUT = "layout";

    /* ASPECTS */
    public static readonly ASPECT_ALL = "All";

    /* Property groups */
    public static readonly PROPERTY_GROUP_META = "META";
    public static readonly PROPERTY_GROUP_PREFERENCES = "Preferences";
    public static readonly PROPERTY_GROUP_ATTRIBUTES = "Attributes";
    public static readonly PROPERTY_GROUP_POINTERS = "Pointers";

    /* Visualizer */
    public static readonly DEFAULT_VISUALIZER = "ModelEditor";

    // This is assigned by the VisualizerPanel onto the visualizer instance on the fly and is set to
    // the id defined in Visualizers.json.
    public static readonly VISUALIZER_PANEL_IDENTIFIER = "VISUALIZER_PANEL_IDENTIFIER";

    public static readonly PROJECT_ROOT_ID = "ROOT";

    public static readonly TERRITORY_EVENT_LOAD = "load";
    public static readonly TERRITORY_EVENT_UPDATE = "update";
    public static readonly TERRITORY_EVENT_UNLOAD = "unload";

    public static readonly GME_ID = "gme";
};

export class LineStyle {
    public static readonly WIDTH = "width";
    public static readonly COLOR = "color";
    public static readonly PATTERN = "pattern";
    public static readonly PATTERNS = new LineStylePatterns;

    public static readonly TYPE = "type";
    public static readonly TYPES = new LineStyleTypes;

    public static readonly START_ARROW = "start-arrow";
    public static readonly END_ARROW = "end-arrow";
    public static readonly CUSTOM_POINTS = "custom-points";
    public static readonly LABEL_PLACEMENT = "label-placement";
    public static readonly LABEL_PLACEMENTS = new LineStylePlacements;

    public static readonly LINE_ARROWS = new LineStyleArrows;
}

export class LineStylePatterns {
    public static readonly SOLID = "";
    public static readonly DASH = "-";
    public static readonly LONGDASH = "- ";
    public static readonly DOT = ".";
    public static readonly DASH_DOT = "-.";
    public static readonly DASH_DOT_DOT = "-..";
}

export class LineStyleTypes {
    public static readonly NONE = "";
    public static readonly BEZIER = "bezier";
};

export class LineStylePlacements {
    public static readonly SRC = "src";
    public static readonly MIDDLE = "mid";
    public static readonly DST = "dst";
};

export class LineStyleArrows {
    public static readonly NONE = "none";
    public static readonly DIAMOND = "diamond";
    public static readonly BLOCK = "block";
    public static readonly CLASSIC = "classic";
    public static readonly OPEN = "open";
    public static readonly OVAL = "oval";
    public static readonly DIAMOND2 = "diamond2";
    public static readonly INHERITANCE = "inheritance";
};

