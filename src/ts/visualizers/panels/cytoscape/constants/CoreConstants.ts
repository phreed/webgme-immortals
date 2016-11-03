

/**
 * node_modules/webgme/src/common/core/constants.js
 * https://github.com/webgme/webgme/blob/master/src/common/core/constants.js
 */

export class CoreConstants {
    public static readonly ATTRIBUTES_PROPERTY = "atr";
    public static readonly REGISTRY_PROPERTY = "reg";
    public static readonly OVERLAYS_PROPERTY = "ovr";
    public static readonly COLLECTION_NAME_SUFFIX = "-inv";
    public static readonly ALL_SETS_PROPERTY = "_sets";
    public static readonly SET_MODIFIED_REGISTRY = "_sets_";
    public static readonly MEMBER_RELATION = "member";
    public static readonly BASE_POINTER = "base";
    public static readonly PATH_SEP = "/";
    public static readonly MUTABLE_PROPERTY = "_mutable";
    public static readonly MINIMAL_RELID_LENGTH_PROPERTY = "_minlenrelid";
    public static readonly INHERITED_CHILD_HAS_OWN_RELATION_PROPERTY = "_hasownrelation";

    public static readonly NULLPTR_NAME = "_null_pointer";
    public static readonly NULLPTR_RELID = "_nullptr";

    public static readonly META_SET_NAME = "MetaAspectSet";
    public static readonly NULL_GUID = "00000000-0000-0000-0000-000000000000";
    public static readonly OWN_GUID = "_relguid";

    public static readonly CONSTRAINTS_RELID = "_constraints";
    public static readonly C_DEF_PRIORITY = 1;
    public static readonly CONSTRAINT_REGISTRY_PREFIX = "_ch#_";

    public static readonly TO_DELETE_STRING = "*to*delete*";

    public static readonly SET_ITEMS = "items";
    public static readonly SET_ITEMS_MAX = "max";
    public static readonly SET_ITEMS_MIN = "min";

    public static readonly META_ASPECTS = "aspects";
    public static readonly META_CHILDREN = "children";
    public static readonly META_NODE = "_meta";
    public static readonly META_POINTER_PREFIX = "_p_";
    public static readonly META_ASPECT_PREFIX = "_a_";

    public static readonly ATTRIBUTE_TYPES = new AttributeTypes;

    public static readonly MIXINS_SET = "_mixins";
    public static readonly MIXIN_ERROR_TYPE = new MixinErrorType;

    public static readonly EXPORT_TYPE_PROJECT = "project";
    public static readonly EXPORT_TYPE_LIBRARY = "library";

    public static readonly NAMESPACE_SEPARATOR = ".";

    public static readonly MAX_AGE = 3;
    public static readonly MAX_TICKS = 2000;
    public static readonly MAX_MUTATE = 30000;
    public static readonly MAXIMUM_STARTING_RELID_LENGTH = 5;
};

export class AttributeTypes {
    public static readonly STRING = "string";
    public static readonly INTEGER = "integer";
    public static readonly FLOAT = "float";
    public static readonly BOOLEAN = "boolean";
    public static readonly ASSET = "asset";
};

export class MixinErrorType {
    public static readonly MISSING = "missing";
    public static readonly ATTRIBUTE_COLLISION = "attribute collision";
    public static readonly SET_COLLISION = "set collision";
    public static readonly POINTER_COLLISION = "pointer collision";
    public static readonly CONTAINMENT_COLLISION = "containment collision";
    public static readonly ASPECT_COLLISION = "aspect collision";
    public static readonly CONSTRAINT_COLLISION = "constraint collision";
};
