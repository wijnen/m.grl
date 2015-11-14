// - gl_alst/ast.common.js ----------------------------------------------- //


/* [+] please.gl.ast.mixin(obj)
 * 
 * Adds symbols used for tracebacks to the GLSL->GLSL compiler's ast
 * objects.
 * 
 */
please.gl.ast.mixin = function (obj) {
    if (!obj.meta) {
        obj.meta = {
            'offset': null,
            'line': null,
            'char' : null,
            'uri' : "unknown",
        };
    }
};


/* [+] please.gl.ast.str(text, offset)
 * 
 * Shorthand for initiating a String object with ast an ast metadata
 * object.  Use in place of 'new String(text)'.  The second parameter
 * is optional, and if provided, sets the metadata 'offset' value as
 * well.
 * 
 */
please.gl.ast.str = function (text, offset) {
    var str = new String(text);
    please.gl.ast.mixin(str);
    if (offset !== undefined) {
        str.meta.offset = offset;
    }
    return str;
};