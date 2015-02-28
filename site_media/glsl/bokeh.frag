#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

// vars provided by game engine
uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform vec4 mgrl_clear_color;

// render passes
uniform sampler2D depth_pass;
uniform sampler2D color_pass;

// constants / settings
const float two_pi = 6.28318530718;
const float samples = 16.0;
const float angle_step = two_pi / samples;
const float blur_radius_factor = 32;

// define additional types
struct bokeh {
  vec4 color;
  float blur;
};


// Translate coordinates from screen space to local coordinates (0.0
// to 1.0)
vec2 local_coord(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


// pseudorandom number generator
vec2 prng(vec2 co) {
  vec2 a = fract(co.yx * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  //return fract(c.x * c.y * 95.4337);
  return fract(vec2(c.x*c.y*95.4337, c.x*c.y*97.597));
}


// pseudorandom number generator
float prng(float n) {
  vec2 a = fract(n * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  return fract(c.x * c.y * 95.4337);
}


// calculate the foreground / background blur
bokeh scatter_sample(vec4 color_data, vec4 depth_data, bool bg_sampling) {
  float base_radius = max(mgrl_buffer_width, mgrl_buffer_height) / blur_radius_factor;

  vec2 rand = prng(gl_FragCoord.xy + depth_info.xy);
  bokeh accumulator;
  accumulator.color = vec4(0.0, 0.0, 0.0, 0.0);
  accumulator.blur = 0.0;
  vec4 depth_test;
  vec4 tmp_color;

  float x, y, radius, angle = two_pi * rand.x;
  for (float i=0.0; i<samples; i+=1.0) {
    radius = prng(angle * depth_info.b);
    x = gl_FragCoord.x + cos(angle)*radius;
    y = gl_FragCoord.y + sin(angle)*radius;
    angle += angle_step;

    if (x < 0.0 || y < 0.0 || x >= mgrl_buffer_width || y >= mgrl_buffer_height) {
      continue;
    }
    select = pick(vec2(x, y));
    depth_test = texture2D(depth_pass, select);
    tmp_color = texture2D(color_pass, select);

    if (bg_sampling) {
      // only use depth samples from the background
      if (depth_test.g < 0.01) {
        continue;
      }
      tmp_color.a = depth_test.g;
    }
    else {
      tmp_color.a = depth_test.r;
    }

    // We're bluring everything together at a uniform rate, but we're
    // also calculating the average blur rate at a given screen coord.
    accumulator.color += tmp_color;
    accumulator.blur += depth_test.b;
  }
  if (count == 0.0) {
    accumulator.color = color_data;
    count = 1.0;
  }
  bokeh ret;
  ret.color = accumulator.color / count;
  ret.blur = accumulator.blur / count;
  return ret;
}


// combine foreground, background, and focused views
vec4 combine_fields(vec4 ref_color, vec4 bg_color, vec4 fg_color) {
  vec3 color = mix(ref_color.rgb, bg_color.rgb, bg_color.a);
  vec3 color = mix(color, fg_color.rgb, fg_color.a);
  return vec4(color, 1.0);
}


// main method
void main(void) {
  vec2 frag_point = local_coord(gl_FragCoord.xy);
  vec4 depth_data = texture2D(depth_pass, frag_point);
  vec4 color_data = texture2D(color_pass, frag_point);

  if (depth_data == vec4(0.0, 0.0, 0.0, 0.0)) {
    depth_data = vec4(0.0, 1.0, 1.0, 1.0);
    color_data = mgrl_clear_color;
  }

  // calculate the background and foreground color components
  bokeh background = scatter_sample(color_data, depth_data, true);
  bokeh foreground = scatter_sample(color_data, depth_data, false);
  gl_FragColor = combine_fields(color_data, background.color, foreground.color);
}
