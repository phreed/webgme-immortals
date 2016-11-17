

/**
 * String constant expressions used in both client and server.
 * 
 * node_modules/webgme/src/common/Constants.js
 * https://github.com/webgme/webgme/blob/master/src/common/Constants.js
 */
import { CoreConstants } from "./CoreConstants";

export class CommonConstants {
    public static readonly CORE: CoreConstants;

    /*
     * TERRITORY EVENTS
     */
    public static readonly TERRITORY_EVENT_LOAD: GME.TerritoryEventType = "load";
    public static readonly TERRITORY_EVENT_UPDATE: GME.TerritoryEventType = "update";
    public static readonly TERRITORY_EVENT_UNLOAD: GME.TerritoryEventType = "unload";
    public static readonly TERRITORY_EVENT_COMPLETE: GME.TerritoryEventType = "complete";
    public static readonly TERRITORY_EVENT_INCOMPLETE: GME.TerritoryEventType = "incomplete";

    /*
     * GME_ID = wherever a GME object ID needs to be present
     */
    public static readonly GME_ID = "GME_ID";

    /*
     * DEDICATED GME OBJECT IDs
     */
    public static readonly PROJECT_ROOT_ID = "";
    public static readonly PROJECT_FCO_ID = "FCO_ID";
    public static readonly PROJECT_FCO_GUID = "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045";
    public static readonly PROJECT_FCO_RELID = "1";

    /*
     * DEDICATED GME ROOT properties
     */
    public static readonly PROJECT_ROOT_NAME = "ROOT";


    /*
     * Dedicated POINTER names
     */
    public static readonly POINTER_SOURCE = "src";      // dedicated connection source pointer name
    public static readonly POINTER_TARGET = "dst";      // dedicated connection target pointer name
    public static readonly POINTER_BASE = "base";       // dedicated inheritance pointer name
    public static readonly POINTER_CONSTRAINED_BY = "constrainedby"; // dedicated replaceable/constrainedBy pointer name

    /*
     * Dedicated RELATION names
     */
    public static readonly RELATION_CONTAINMENT = "containment";

}

