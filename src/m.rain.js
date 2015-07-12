// - m.rain.js  ------------------------------------------------------------- //

/* [+]
 *
 * This file provides M.GRL's particle system.
 * 
 */


// [+] please.ParticleEmitter(asset, config, setup, update)
//
// ```
// // We pass an asset, not an asset instance to the particle tracker.
// // The asset must have an instance method defined which returns a
// // GraphNode.
// var stamp = please.access("explosion.gani");
// var particle_setup = function (data) {
//   // set the initial particle data and return it
//   return data;
// };
// var particle_update = function (data, delta_time) {
//   // update the particle data and return it
//   return data;
// };
// var struct = {
//   "color" : [0, 0, 1, 1],
// };
// var emitter = please.particle_system(stamp, life_span, max_count, particle_setup, particle_update, struct);
// graph.add(emitter);
//
// for (var i=0; i<10; i+=1) {
//   // create a new particle within the particle system
//   emitter.rain();
// }
//
// // make another emitter with the same params
//  var another = emitter.copy();
// ```
//
please.ParticleEmitter = function (asset, span, limit, setup, update, ext) {
    please.GraphNode.call(this);
    this.__is_particle_tracker = true;
    
    var tracker = this.__tracker = {};
    if (typeof(asset.instance) === "function") {
        tracker.asset = asset;
        tracker.stamp = asset.instance();
        tracker.stamp.use_manual_cache_invalidation();
        tracker.animated = !!tracker.stamp.play;
    }
    else {
        throw("Invalid asset.  Did you pass a GraphNode by mistake?");
    }
    
    console.assert(typeof(span) === "number" || typeof(span) === "function");
    console.assert(typeof(limit) === "number");
    console.assert(typeof(setup) === "function");
    console.assert(typeof(update) === "function");
    
    tracker.span = span;
    tracker.limit = limit;
    tracker.setup = setup;
    tracker.update = update;

    var struct = [
        ["start", 1],
        ["expire", 1],
        ["world_matrix", 16],
    ];
    if (ext) {
        ITER_PROPS(name, ext) {
            var prop = ext[name];
            if (typeof(prop) === "number") {
                struct.push([name, 1]);
            }
            else if (prop.length) {
                struct.push([name, prop.length]);
            }
        }
        tracker.defaults = ext;
    }
    else {
        tracker.defaults = null;
    }

    tracker.blob = new please.StructArray(struct, tracker.limit);
    tracker.view = new please.StructView(tracker.blob);
    tracker.live = 0;
};
please.ParticleEmitter.prototype = Object.create(please.GraphNode.prototype);


// Add a new particle to the system
please.ParticleEmitter.prototype.rain = function () {
    if (tracker.live === tracker.limit) {
        console.error("Cannot add any more particles to emitter.");
        return;
    }
    var tracker = this.__tracker;
    var p_index = tracker.live;
    var particle = tracker.view;
    particle.focus(p_index);
    
    // upload defaults if applicable
    if (tracker.defaults) {
        ITER_PROPS(name, tracker.defaults) {
            var start = tracker.defaults[name];
            if (typeof(start) === "number") {
                start = [start];
            }
            ITER(i, start) {
                particle[name][i] = start[i];
            }
        }
    }

    // initialize builtins
    var now = window.performance.now();
    var span = DYNAMIC(tracker.span);
    particle["start"][0] = now;
    particle["expire"][0] = now + span;
    mat4.copy(particle["world_matrix"], this.world_matrix);
    
    // call the particle initialization method
    tracker.setup.call(this, particle);
    tracker.live += 1;
};


// Create a new particle system with the same params as this one
please.ParticleEmitter.prototype.copy = function () {
    return new please.ParticleEmitter(
        this.__tracker.asset, this.__tracker.span, this.__tracker.limit,
        this.__tracker.setup, this.__tracker.update, this.__tracker.defaults);
};


// Clear out all active particles from this system
please.ParticleEmitter.prototype.clear = function () {
    this.__tracker.live = 0;
};


// Update and draw the particle system
please.ParticleEmitter.prototype.draw = function() {
    var tracker = this.__tracker.live;
    var particle = tracker.view;
    var age, now = please.pipeline.__framestart;
    var cache = tracker.stamp.__ani_cache;
    var first = true;
    RANGE(i, tracker.live) {
        particle.focus(i);
        if (now < particle["expire"]) {
            // The particle is alive, so we will figure out its
            // current age, and call the update function on it, and
            // then draw the particle on screen.
            age = now - particle["start"];
            tracker.update.call(this, particle, age);
            ITER(k, tracker.blob.struct) {
                var name = tracker.blob.struct[i][0];
                if (cache[name]) {
                    cache[name] = particle[name];
                }
            }
            // FIXME if the 'stamp' is animated, then we should adjust
            // the animation frame accordingly before drawing.
            tracker.stamp.__draw();
        }
        else {
            // The particle is dead, so it should be removed.  This is
            // done by writting it over with the information about the
            // last particle in the blob, and decrementing the
            // particle counter.  The 'i' index is also decremented so
            // as a new particle is now in the same slot.
            this.__on_die(i);
            i -= 1;
        }
    }
};


// Called to remove a dead particle
please.ParticleEmitter.prototype.__on_die = function(index) {
    var tracker = this.__tracker;
    tracker.view.dub(tracker.live-1, index);
    tracker.live -= 1;
};