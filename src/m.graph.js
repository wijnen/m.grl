// - m.graph.js ---------------------------------------------------------- //


please.GraphNode = function () {
    if (this === please) {
        return new please.GraphNode();
    }
    this.children = [];
    this.local_matrix = null;
    this.visible = true;
    this.ext = {};
    this.vars = {};
    this.samplers = {};
    this.__cache = null;
    this.__asset = null;
    this.__asset_hint = "";
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__unlink = false; // set to true to tell parents to remove this child
    this.priority = 100; // lower means the driver functions are called sooner
};
please.GraphNode.prototype = {
    "has_child" : function (entity) {
        // Return true or false whether or not this graph node claims
        // the given entity as a child.
        return this.children.indexOf[entity] !== -1;
    },
    "add" : function (entity) {
        // Add the given entity to this object's children.
        this.children.push(entity);
    },
    "remove" : function (entity) {
        //  Remove the given entity from this object's children.
        if (this.has_child(entity)) {
            this.children.splice(this.children.indexOf(entity),1);
        }
    },
    "__flatten" : function () {
        // return the list of all decendents to this object;
        var found = [];
        for (var i=0; i<this.children.length; i+=1) {
            var child = this.children[i];
            if (child.__unlink) {
                this.remove(child);
                continue;
            }
            var tmp = child.__flatten();
            tmp.push(child);
            found.concat(tmp);
        }
        return found;
    },
    "__update_world_matrix" : function (parent_matrix) {
        mat4.multiply(this.__cache.world_matrix, 
                      parent_matrix, 
                      this.local_matrix);
        for (var i=0; i<this.children.length; i+=1) {
            this.children[i].__update_world_matrix(this.__cache.world_matrix);
        }
    },
    "__rig" : function () {
        // cache the values of this object's driver functions.
        var self = this;
        this.__cache = {
            "uniforms" : {},
            "samplers" : {},
            "world_matrix" : null,
        };
        please.prop_map(self.ext, function (name, value) {
            if (typeof(value) === "function") {
                value.call(self);
            }
        });
        please.prop_map(self.uniforms, function (name, value) {
            if (typeof(value) === "function") {
                self.__cache["uniforms"][name] = value.call(self);
            }
            else {
                self.__cache["uniforms"][name] = value;
            }
        });
        please.prop_map(self.samplers, function (name, value) {
            if (typeof(value) === "function") {
                self.__cache["samplers"][name] = value.call(self);
            }
            else {
                self.__cache["samplers"][name] = value;
            }
        });
    },
    "__bind" : function () {
        // bind uniforms and textures, then call this.bind if
        // applicable.
        if (this.__drawable && typeof(this.bind) === "function") {
            this.bind();
        }
    },
    "__draw" : function () {
        // call this.draw, if applicable
        if (this.visible) {
            if (this.__drawable && typeof(this.draw) === "function") {
                this.draw();
            }
            for (var i=0; i<this.children.length; i+=1) {
                var child = this.children[i];
                child.__draw();
            }
        }
    },
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};


// Namespace for scene graph guts
please.SceneGraph = function () {
    if (this === please) {
        return new please.SceneGraph();
    }
    this.__rig = null;
    this.__bind = null;
    this.__draw = null;
    this.__flat = [];
    this.__states = {};
    this.view_matrix = mat4.create();

    var tick_sort_function = function (lhs, rhs) {
        // sort object list by priority;
        return lhs.priority - rhs.priority;
    };

    this.tick = function () {
        this.__flat = this.__flatten();
        this.__flat.sort(tick_sort_function);

        this.__states = {};
        ITER(i, this.__flat) {
            var element = this.__flat[i];
            element.__rig();
            if (element.visible && element.drawable) {
                if (!this.__states[element.__asset]) {
                    this.__states[element.__asset] = [];
                }
                this.__states[element.__asset].push(element);
            }
        };

        // update the matricies of objects in the tree
        ITER(i, this.children) {
            var child = this.children[i];
            child.__update_world_matrix(this.view_matrix);
        }
    };

    this.draw = function () {
        if (this.__draw_set) {
            ITER(i, this.children) {
                var child = this.children[i];
                child.__bind();
                child.__draw();
            }
        }
    };
};
please.SceneGraph.prototype = new please.GraphNode();