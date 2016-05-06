/*globals define*/
/*jshint browser: true*/

/**
 * @author Dana Zhang / https://github.com/zhangpn
 */

define(['js/Constants'], function (CONSTANTS) {

    'use strict';

    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        SELF: '__SELF__',

        /*
         * LINE STYLE PARAMETERS KEYS
         */
        LINE_WIDTH: 'width',
        LINE_COLOR: 'line-color',
        LINE_PATTERN: 'style',
        LINE_PATTERNS: CONSTANTS.LINE_STYLE.PATTERNS,
        LINE_TYPE: 'curve-style',
        LINE_TYPES: CONSTANTS.LINE_STYLE.TYPES,
        LINE_START_ARROW: 'source-arrow-shape',
        LINE_END_ARROW: 'target-arrow-shape',
        LINE_POINTS: CONSTANTS.LINE_STYLE.CUSTOM_POINTS,
        LINE_ARROWS: CONSTANTS.LINE_STYLE.LINE_ARROWS,
        CY_LINE_ARROWS: {
                        none: 'none',
                        diamond: 'diamond',
                        block: 'triangle',
                        arrow: 'triangle',
                        classic: 'vee',
                        oval: 'circle',
                        open: 'vee',
                        inheritance: 'triangle-backcurve',
                        diamond2: 'diamond'
                    },
        NODE_COLOR: 'background-color',
        SOURCE_ARROW_COLOR: 'source-arrow-color',
        TARGET_ARROW_COLOR: 'target-arrow-color',
        LABEL_COLOR: 'color'
    };
});