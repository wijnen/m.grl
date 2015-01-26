
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float mgrl_frame_start;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;
uniform sampler2D depth_pass;
uniform sampler2D color_pass;


const vec4 clear_color_hack = vec4(.93, .93, .93, 1.0);

const float two_pi = 6.28318530718;
const float samples = 16.0;
const float angle_step = two_pi / samples;


vec2 screen_clamp(vec2 coord) {
  return clamp(coord, vec2(0.0, 0.0), gl_FragCoord.xy);
}

vec2 pick(vec2 coord) {
  return vec2(coord.x/mgrl_buffer_width, coord.y/mgrl_buffer_height);
}


vec2 prng(vec2 co) {
  vec2 a = fract(co.yx * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  return fract(vec2(c.x*c.y*95.4337, c.x*c.y*97.597));
}


float prng(float n){
  vec2 a = fract(n * vec2(5.3983, 5.4427));
  vec2 b = a.xy + vec2(21.5351, 14.3137);
  vec2 c = a + dot(a.yx, b);
  return fract(c.x * c.y * 95.4337);
}


vec4 blur(vec4 depth_info) {
  float max_radius = max(mgrl_buffer_width, mgrl_buffer_height) / 32.0;
  max_radius *= depth_info.b;
  vec2 rand = prng(gl_FragCoord.xy + depth_info.xy);

  // float count = 1.0;
  // vec4 color = texture2D(color_pass, pick(gl_FragCoord.xy));
  float count = 0.0;
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
  vec4 test;
  vec2 select;
  
  float x, y, radius;
  float angle = two_pi * rand.x;
  for (float i=0.0; i<samples; i+=1.0) {
    radius = max_radius * prng(angle * depth_info.b);
    x = gl_FragCoord.x + cos(angle)*radius;
    y = gl_FragCoord.y + sin(angle)*radius;
    angle += angle_step;

    if (x < 0.0 || y < 0.0 || x >= mgrl_buffer_width || y >= mgrl_buffer_height) {
      continue;
    }
    select = pick(vec2(x, y));
    test = texture2D(depth_pass, select);

    if (test.b < 0.01 && depth_info.r == 0.0 && depth_info.g > 0.0) {
      continue;
    }
    else {
      color += texture2D(color_pass, select);
      count += 1.0;
    }
  }
  if (count == 0.0) {
    color = texture2D(color_pass, pick(gl_FragCoord.xy));
    count = 1.0;
  }
  return color/count;
}


bool clip(vec2 coord) {
  float x = coord.x;
  float y = coord.y;
  if (x < 0.0 || y < 0.0 || x >= mgrl_buffer_width || y >= mgrl_buffer_height) {
    return true;
  }
  return false;
}


vec4 new_blur(vec4 depth_info, vec4 color_info) {
  float max_blur = max(mgrl_buffer_width, mgrl_buffer_height) / 32.0;
  float max_radius;

  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
  float count = 0.0;

  vec4 sample_depth;
  vec4 sample_color;
  vec2 sample_coord;
  float sample_bias;
  float sample_factor;

  float radius;
  float radial_bias;
  float next_angle = two_pi * prng(gl_FragCoord.xy + depth_info.xy).x;
  float angle;
  for (float i=0.0; i<samples; i+=1.0) {
    angle = next_angle;
    next_angle += angle_step;
    
    for (float resample = 1.0; resample <= 2.0; resample += 1.0) {
      radius = max_blur * prng(angle + depth_info.b * resample);
      sample_coord = gl_FragCoord.xy + vec2(cos(angle), sin(angle)) * radius;
      if (clip(sample_coord)) {
        continue;
      }
      sample_coord = pick(sample_coord);
      sample_depth = texture2D(depth_pass, sample_coord);
      max_radius = max_blur * max(depth_info.b, sample_depth.b);
      if (radius <= max_radius) {
        break;
      }
    }
    sample_color = color_info;
    sample_bias = 0.0;

    /*
      Ok, so I guess what I'd do next with this is change the
      "radial_bias" based on if sample_depth.r is in front or
      deth_info.r is infront.

      In which case, we'd have to determine the respective maximum
      radius from depth_info.b or sample_info.b (see the loop above).
     */

    radial_bias = 1.0;
    if (radius > max_radius) {
      radial_bias = 0.0;
    }
    else {
      radial_bias = mix(1.0, 0.0, (radius / max_radius));
    }

    /*
      Also if you set test/depth_pass to both depth_pass and
      color_pass, it'll be obvious that our blur isn't working right.
     */

    if (sample_depth.r > 0.0 || depth_info.r > 0.0) {
      sample_color = texture2D(color_pass, sample_coord);
      color += sample_color * radial_bias;
      count += radial_bias;
    }
    else if (sample_depth.g > 0.0 && depth_info.g > 0.0) {
      sample_color = texture2D(color_pass, sample_coord);
      color += sample_color * radial_bias;
      count += radial_bias;
    }
    else {
      color += color_info / samples;
      count += 1.0 / samples;
    }
  }
  if (count < 1.0) {
    color += color_info;
    count += 1.0;
  }
  return color/count;
}


void main(void) {
  vec2 frag_point = pick(gl_FragCoord.xy);
  vec4 depth_data = texture2D(depth_pass, frag_point);
  vec4 color_data = texture2D(color_pass, frag_point);
  vec4 color;
    
  gl_FragColor = new_blur(depth_data, color_data);
}
