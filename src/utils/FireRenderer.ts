import { Disposable, Mesh, Position2Attribute, Shader } from "gdxts";

export class FireRenderer implements Disposable {
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
    this.mesh = new Mesh(context, [new Position2Attribute()], maxVertices, 0);
    let gl = this.context;

    // this.shader = Shader.newColored(gl);
    this.shader = this.newShader(this.context);
  }

  private newShader(context: WebGLRenderingContext): Shader {
    const VS = /*glsl*/ `
    attribute vec4 ${Shader.COLOR};
    uniform mat4 ${Shader.MVP_MATRIX};
    varying vec4 v_color;

    void main () {
      v_color = ${Shader.COLOR};
      gl_Position = ${Shader.MVP_MATRIX} * ${Shader.POSITION};
    }
    `;

    const FS = /*glsl*/ `
    #ifdef GL_ES
      #define LOWP lowp
      precision highp float;
    #else
      #define LOWP
    #endif

    //vec4 fragColor;
    vec2 fragCoord; 
    uniform mat4 ${Shader.MVP_MATRIX};
    uniform float iTime;
    uniform vec3 iResolution;
    #define S(v,r) smoothstep( r, r+ 3./iResolution.y, v ) 
    vec2 hash(vec2 p){
        p = vec2( dot(p,vec2(137.1,373.7)), dot(p,vec2(269.5,183.7)) ); 
        return fract(sin(p)*43758.37); 
    }

    float worley(vec2 p){
        vec2 n = floor(p);
        vec2 f = fract(p);
        float r = 1.;
        for(int i=-2;i<=2;i++){
        for(int j=-2;j<=2;j++){
            vec2 o = hash(n+vec2(i,j));
            o = sin(iTime/2. + hash(n+vec2(i,j))*6.28)*0.5+0.5;//animate
            o += vec2(i,j);
            float D1 = distance(o,f);//Euclidean
            r = min(r,D1);
        }
        }
        return r;
    }

    void main()
    {
        vec2 uv = (2.*fragCoord-iResolution.xy)/iResolution.y;

        float c = worley(uv + vec2(0.,-iTime))*0.5;
        c += worley(uv*2.+vec2(sin(iTime*2.)*0.5,-iTime*6.))*0.5;//2 Layers worley
        c += (-uv.y-0.3)*0.6;//y mask
        
        vec2 p = uv;
        p.x *=1.5+smoothstep(-0.3,1.,uv.y)*1.5;
        float m = smoothstep(1.,.5,length(p));//circle mask
        
        float c0 = smoothstep(.4,.6,m*c*3.);//out fire
        float c1 = smoothstep(.5,.52,m*c*2.);//mid fire
        float c2 = smoothstep(.5,.52,m*c*1.2*(-uv.y+0.3));//inner fire
        float c3 = pow(worley(uv*6.+vec2(sin(iTime*4.)*1.,-iTime*16.)),8.);
              c3 = smoothstep(.98,1.,c3)*m;//sparkle

        vec3 col = vec3(1.,.4,.2)*c3;//sparkle
        col = mix(col,vec3(.95,.1,.2)*(uv.y+.8),c0);//out
        col = mix(col,mix(vec3(.9,.3,.2),vec3(.9,.6,.2),-uv.y),c1);//mid
        col = mix(col,vec3(.9,.8,.2),c2);//inner


        // Output to screen
        gl_FragColor = vec4(col,1.0);
    }

    
    `;
    return new Shader(context, VS, FS);
  }

  begin(_time: number) {
    if (this.isDrawing)
      throw new Error("FireRenderer.begin() has already been called");
    this.vertexIndex = 0;
    this.isDrawing = true;

    this.shader.bind();
    this.shader.setUniform4x4f(Shader.MVP_MATRIX, this.projectionValues);

    let gl = this.context;
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
  }

  private vertex(x: number, y: number) {
    let idx = this.vertexIndex;
    let vertices = this.mesh.getVertices();
    vertices[idx++] = x;
    vertices[idx++] = y;
    this.vertexIndex = idx;
  }

  public draw(x: number, y: number, width: number, height: number) {
    const x2 = x + width;
    const y2 = y;
    const x3 = x + width;
    const y3 = y + height;
    const x4 = x;
    const y4 = y + height;
    if (!this.isDrawing)
      throw new Error("ShapeRenderer.begin() has not been called");
    this.vertex(x, y);
    this.vertex(x2, y2);
    this.vertex(x3, y3);
    this.vertex(x3, y3);
    this.vertex(x4, y4);
    this.vertex(x, y);
  }

  end() {
    if (!this.isDrawing)
      throw new Error("ShapeRenderer.begin() has not been called");
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
  }
}
