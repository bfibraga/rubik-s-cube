attribute vec4 vPosition;
attribute vec4 vColor;
 
uniform mat4 mProjection;
uniform mat4 mModelView;

varying vec4 fColor;
 
void main() {
    // Multiply the position by the matrix.
    gl_Position = mProjection * mModelView * vPosition;
    fColor;
}  