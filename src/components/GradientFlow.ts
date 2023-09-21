import {
  Disposable,
  Mesh,
  Position2Attribute,
  Shader,
  TexCoordAttribute,
} from "gdxts";

const VS = /* glsl */ `
attribute vec4 ${Shader.POSITION};
attribute vec2 ${Shader.TEXCOORDS};

uniform mat4 ${Shader.MVP_MATRIX};

varying vec4 v_color;
varying vec2 v_texCoords;

void main () {
  v_texCoords = ${Shader.TEXCOORDS};
  gl_Position = ${Shader.MVP_MATRIX} * ${Shader.POSITION};
}
`;

const FS = /* glsl */ `
#ifdef GL_ES
  #define LOWP lowp
  precision mediump float;
#else
  #define LOWP
#endif
varying vec2 v_texCoords;
uniform float iTime;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a)
{
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}


// Created by inigo quilez - iq/2014
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
vec2 hash( vec2 p )
{
    p = vec2( dot(p,vec2(2127.1,81.17)), dot(p,vec2(1269.5,283.37)) );
	return fract(sin(p)*43758.5453);
}

float noise( in vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	
	vec2 u = f*f*(3.0-2.0*f);

    float n = mix( mix( dot( -1.0+2.0*hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                        dot( -1.0+2.0*hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                   mix( dot( -1.0+2.0*hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                        dot( -1.0+2.0*hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
	return 0.5 + 0.5*n;
}

void main () {
  vec2 uv = v_texCoords;
  float ratio = 1.0 / 1.0; // TODO: ratio

  vec2 tuv = uv;
  tuv -= .5;

  // rotate with Noise
  float degree = noise(vec2(iTime*.1, tuv.x*tuv.y));

  tuv.y *= 1./ratio;
  tuv *= Rot(radians((degree-.5)*720.+180.));
  tuv.y *= ratio;

  
  // Wave warp with sin
  float frequency = 5.;
  float amplitude = 30.;
  float speed = iTime * 2.;
  tuv.x += sin(tuv.y*frequency+speed)/amplitude;
  tuv.y += sin(tuv.x*frequency*1.5+speed)/(amplitude*.5);
  
  
  // draw the image
  // vec3 colorYellow = vec3(.957, .804, .623);
  vec3 colorDeepBlue = vec3(.192, .384, .933);
  
  // vec3 colorRed = vec3(.910, .510, .8);
  vec3 colorBlue = vec3(0.350, .71, .953);

  vec3 layer1 = mix(colorDeepBlue, colorBlue, S(-.3, .2, (tuv*Rot(radians(-5.))).x));
  vec3 layer2 = mix(colorBlue, colorDeepBlue, S(-.3, .2, (tuv*Rot(radians(-5.))).x));
  
  vec3 finalComp = mix(layer1, layer2, S(.5, -.3, tuv.y));
  
  vec3 col = finalComp;
  
  gl_FragColor = vec4(col,1.0);
}
`;

export class GradientRenderer implements Disposable {
  context: WebGLRenderingContext;
  mesh: Mesh;
  shader: Shader;

  isDrawing = false;
  vertexIndex = 0;

  projectionValues: Float32Array = new Float32Array(16);

  setProjection(projectionValues: Float32Array) {
    this.projectionValues = projectionValues;
  }

  constructor(context: WebGLRenderingContext, maxVertices: number = 10920) {
    if (maxVertices > 10920)
      throw new Error(
        "Can't have more than 10920 triangles per batch: " + maxVertices
      );
    this.context = context;
    this.mesh = new Mesh(
      context,
      [new Position2Attribute(), new TexCoordAttribute()],
      maxVertices,
      0
    );
    let gl = this.context;

    this.shader = new Shader(gl, VS, FS);
  }

  begin(time = 0) {
    if (this.isDrawing)
      throw new Error("FireRenderer.begin() has already been called");
    this.vertexIndex = 0;
    this.isDrawing = true;

    this.shader.bind();
    this.shader.setUniform4x4f(Shader.MVP_MATRIX, this.projectionValues);
    this.shader.setUniformf("iTime", time);

    let gl = this.context;
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
  }

  private vertex(x: number, y: number, u: number, v: number) {
    let idx = this.vertexIndex;
    let vertices = this.mesh.getVertices();
    vertices[idx++] = x;
    vertices[idx++] = y;
    vertices[idx++] = u;
    vertices[idx++] = v;
    this.vertexIndex = idx;
  }

  public draw(
    x: number,
    y: number,
    width: number,
    height: number,
    _time?: number
  ) {
    const x2 = x + width;
    const y2 = y;
    const x3 = x + width;
    const y3 = y + height;
    const x4 = x;
    const y4 = y + height;

    const u = -1;
    const v = 1;
    const u2 = 1;
    const v2 = 1;
    const u3 = 1;
    const v3 = -1;
    const u4 = -1;
    const v4 = -1;

    if (!this.isDrawing)
      throw new Error("FireRenderer.begin() has not been called");
    this.vertex(x, y, u, v);
    this.vertex(x2, y2, u2, v2);
    this.vertex(x3, y3, u3, v3);
    this.vertex(x3, y3, u3, v3);
    this.vertex(x4, y4, u4, v4);
    this.vertex(x, y, u, v);
  }

  end() {
    if (!this.isDrawing)
      throw new Error("FireRenderer.begin() has not been called");
    this.flush();
    let gl = this.context;
    gl.disable(gl.BLEND);
    this.isDrawing = false;
  }

  flush() {
    if (this.vertexIndex === 0) return;
    this.mesh.setVerticesLength(this.vertexIndex);
    this.mesh.draw(this.shader, this.context.TRIANGLES);
    this.vertexIndex = 0;
  }

  dispose() {
    this.mesh.dispose();
    this.shader.dispose();
  }
}
