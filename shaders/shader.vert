attribute vec4 vPosition;
attribute vec3 vNormal;

uniform mat4 mProjection;
uniform mat4 mModelView;
uniform mat4 mNormals;

void main()
{
    gl_Position = mProjection * mModelView * vPosition;
}