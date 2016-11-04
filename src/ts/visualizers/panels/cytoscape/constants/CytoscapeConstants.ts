


import { LineStylePatterns, LineStyleTypes, LineStyle, LineStyleArrows } from "./GmeConstants";


export class CytoscapeConstantsLineArrows {
    public static readonly none = "none";
    public static readonly diamond = "diamond";
    public static readonly block = "triangle";
    public static readonly arrow = "triangle";
    public static readonly classic = "vee";
    public static readonly oval = "circle";
    public static readonly open = "vee";
    public static readonly inheritance = "triangle-backcurve";
    public static readonly diamond2 = "diamond";
}

export class CytoscapeConstants {
    /*
     * TERRITORY EVENTS
     */
    public static readonly SELF = "__SELF__";

    /*
     * LINE STYLE PARAMETERS KEYS
     */
    public static readonly LINE_WIDTH = "width";
    public static readonly LINE_COLOR = "line-color";
    public static readonly LINE_PATTERN = "style";
    public static readonly LINE_PATTERNS = LineStylePatterns;
    public static readonly LINE_TYPE = "curve-style";
    public static readonly LINE_TYPES = LineStyleTypes;
    public static readonly LINE_START_ARROW = "source-arrow-shape";
    public static readonly LINE_END_ARROW = "target-arrow-shape";
    public static readonly LINE_POINTS = LineStyle.CUSTOM_POINTS;
    public static readonly LINE_ARROWS = LineStyleArrows;
    public static readonly CY_LINE_ARROWS = new CytoscapeConstantsLineArrows;
    public static readonly NODE_COLOR = "background-color";
    public static readonly SOURCE_ARROW_COLOR = "source-arrow-color";
    public static readonly TARGET_ARROW_COLOR = "target-arrow-color";
    public static readonly LABEL_COLOR = "color";
}
