
// matrices
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

// vertex data
attribute vec3 position;
attribute vec2 tcoord;

// interpolated vertex data in various transformations
varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;
varying vec3 world_position;
varying vec3 screen_position;


void main(void) {
  // pass along to the fragment shader
  local_position = position;
  local_tcoord = tcoord;

  // various coordinate transforms
  local_position = (model_matrix * vec4(position, 1.0)).xyz;
  vec4 final_position = projection_matrix * view_matrix * model_matrix * vec4(position, 1.0);
  screen_position = final_position.xyz;
  gl_Position = final_position;
}