/*
 Tests for m.staticdraw.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



lazy_bind("sample_graph", function () {
    var root = new please.GraphNode();
    var foo = new please.GraphNode();
    var bar = new please.GraphNode();
    var nodes = [foo, bar];
    nodes.map(function (node) {
        node.__drawable = true;
        node.__buffers = {
            // these buffers are defined in test.gl.js
            "vbo" : window.sample_indexed_vbo,
            "ibo" : window.sample_ibo,
        };
        root.add(node);
    });

    bar.location_x = 10;
    return root;
});






test["static draw node: apply matrix"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var child = sample_graph.children[1];
    var mesh_data = child.mesh_data();
    var matrix = child.shader.world_matrix;
    var new_data = proto.__apply_matrix(mesh_data, matrix);

    var types = new_data.__types;
    var size = new_data.__vertex_count;

    please.prop_map(new_data, function (attr, buffer) {
        if (!attr.startsWith("__")) {
            assert(buffer.length == types[attr] * size);
            assert(buffer.indexOf(0) == -1);
        }
    });
};


    
test["static draw node: flatten graph"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var flat = proto.__flatten_graph(sample_graph);
    var keys = flat.cache_keys;
    var groups = flat.groups;
    var bindings = flat.sampler_bindings;

    assert(keys.length == 1);
    assert(keys[0] == "::");

    assert(groups["::"].length == 2);    
    groups["::"].map(function (chunk) {
        var size = chunk.data.__vertex_count;
        please.prop_map(chunk.data.__types, function (attr, type) {
            assert(chunk.data[attr].length == size * type);
            assert(chunk.data[attr].indexOf(0) == -1);
        });
    });

    assert(bindings["::"]["diffuse_texture"] === null);
};


    
test["static draw node: combine_vbos"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var flat = proto.__flatten_graph(sample_graph);
    var vbo = proto.__combine_vbos(flat);

    var types = vbo.reference.type;
    var buffers = vbo.reference.data;
    var vertices = vbo.reference.size;

    please.prop_map(buffers, function(attr, buffer) {
        assert(buffer.length == types[attr] * vertices);
        assert(buffer.indexOf(0) == -1);
    });
};