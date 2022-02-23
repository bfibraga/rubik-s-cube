import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from './libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, scalem, rotate, normalize, translate, sizeof } from './libs/MV.js';
import { modelView, loadMatrix, popMatrix, pushMatrix, multScale, multTranslation, multRotationY, multRotationZ, multRotationX, multMatrix } from './libs/stack.js'

import * as CUBE from './libs/cube.js';
import * as RUBICS from "./libs/rubik's.js";

let mode;
let face_angle;
let camera_angle;
let animation;
let down;
let lastX, lastY;



const floor_height = 0.5;
const floot_length = 10;

const cube_dimensions = 5;
const cube_part_length = 1;
const cube_part_inner_color = vec3(0.05,0.05,0.05);
const cube_inner_length = 0.9; // [0,1]
const cube_inner_height = 0.015;

const angle_travel = 0.08*(cube_dimensions*cube_part_length/2);

const camera_distance = 14;
const camera_y = 7;

function setup(shaders){
    const canvas = document.getElementById("gl_canvas");
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    const min_pos = (-cube_dimensions/2 + 0.5);
    const max_pos = (cube_dimensions/2 + 0.5);
    RUBICS.init(cube_dimensions, cube_part_length, min_pos, max_pos);

    const program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    const picking_program = buildProgramFromSources(gl, shaders["picking_shader.vert"], shaders["picking_shader.frag"]);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, RUBICS.nVisibleFaces()*(sizeof["vec3"]), gl.STATIC_DRAW);
    
    // Camera  
    let camera = {
        eye: vec3(camera_distance,camera_y,camera_distance),
        at: vec3(0,0,0),
        up: vec3(0,1,0),
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 120
    }

    mode = gl.TRIANGLES;
    face_angle = 0;
    camera_angle = 30;
    animation = true;
    down = false;

    document.onkeydown = function(event){
        switch(event.key){
            case 'm':
                mode = gl.TRIANGLES;
                break;
            case 'n':
                mode = gl.LINES;
                break;
            case 'r':
                RUBICS.planNextMove(RUBICS.turnZ, [-1,1], "Z");
                break;
            case 't':
                RUBICS.planNextMove(RUBICS.turnY, [-1,-1], "Y");
                break;
            case 'y':
                RUBICS.planNextMove(RUBICS.turnX, [1,-1], "X");
                break;
            case ' ':
                RUBICS.shuffle();
                break;
        }
    }

    // matrices
    let mView, mProjection;

    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.enable(gl.DEPTH_TEST);

    function resizeCanvasToFullWindow(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;
    
        gl.viewport(0,0,canvas.width, canvas.height);
    }

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);

    function inCameraSpace(m) {
        const mInvView = inverse(mView);

        return mult(mInvView, mult(m, mView));
    }

    canvas.addEventListener('wheel', function(event) {
        const factor = 1 + event.deltaY/1000;
        camera.fovy = Math.max(25, Math.min(75, camera.fovy * factor)); 
    });

    canvas.addEventListener('mousemove', function(event) {
        if(down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;

            if(dx != 0 || dy != 0) {
                // Do something here...

                const d = vec2(dx, dy);
                const axis = vec3(-dy, -dx, 0);

                const rotation = rotate(0.30*length(d), axis);

                let eyeAt = subtract(camera.eye, camera.at);                
                eyeAt = vec4(eyeAt[0], eyeAt[1], eyeAt[2], 0);

                eyeAt = mult(inCameraSpace(rotation), eyeAt);

                camera.eye[0] = camera.at[0] + eyeAt[0];
                camera.eye[1] = camera.at[1] + eyeAt[1];
                camera.eye[2] = camera.at[2] + eyeAt[2];

                lastX = event.offsetX;
                lastY = event.offsetY;
            }

        }
    });

    canvas.addEventListener('mousedown', function(event) {
        down=true;
        lastX = event.offsetX;
        lastY = event.offsetY;
        gl.clearColor(0.09, 0.09, 0.09, 1.0);
    });

    canvas.addEventListener('mouseup', function(event) {
        down = false;
        gl.clearColor(0.08, 0.08, 0.08, 1.0);
    });
    
    window.requestAnimationFrame(render);

    function render(time) {

        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);

        function uploadModelView(){
            gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
        }

        uploadModelView();
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mNormals"), false, flatten(normalMatrix(modelView())));

        function ColorDisplay(face, axis){
            const final_scale = vec3(cube_inner_length,cube_inner_length,cube_inner_length);
            final_scale[axis] = cube_inner_height;
            multTranslation(scale(0.5,face.normal));
            multScale(final_scale);
            gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(face.color));

            uploadModelView();

            CUBE.draw(gl,program,mode);
        }

        function ColorRubicCell(piece){
            for (let j = 0 ; j < piece.visible_faces.length ; j++){
                const face = piece.visible_faces[j];
                    pushMatrix();
                        ColorDisplay(face,face.getValidIndex());
                    popMatrix();
            }
        }

        function RubicCell(x,y,z) {
            let piece = RUBICS.getPiece(x,y,z);
            const translation = scale(cube_part_length, piece.pos);
            multTranslation(translation);

            let curr_move = RUBICS.currentMove();
            if (curr_move != null && curr_move.animating){
                const param = curr_move.parameters;
                if (Math.abs(face_angle) >= 90-angle_travel){
                    RUBICS.makeNextMove();
                    face_angle = 0;
                } else {
                    face_angle += angle_travel;
                    switch (curr_move.id){
                        case "X":
                            if (x == param[0]){
                                multTranslation(scale(-1, translation));
                                multRotationX(-param[1]*face_angle);
                                multTranslation(translation);
                            } 
                            break;
                        case "Y":
                            if (y == param[0]){
                                multTranslation(scale(-1, translation));
                                multRotationY(-param[1]*face_angle);
                                multTranslation(translation);
                            } 
                            break;
                        case "Z":
                            if (z == param[0]){
                                multTranslation(scale(-1, translation));
                                multRotationZ(-param[1]*face_angle);
                                multTranslation(translation);
                            } 
                            break;
                    }
                }
            }

            multScale([cube_part_length, cube_part_length, cube_part_length]);
            
            uploadModelView();

            CUBE.draw(gl,program,mode);  

            ColorRubicCell(piece);

        }

        function Rubics(){

            /*multRotationZ(cube_part_length*time/1000);
            multRotationY(cube_part_length*time/1000);
            multRotationX(cube_part_length*time/1000);*/
            
            for( let x = RUBICS.min ; x < RUBICS.max ; x++){
                for( let y = RUBICS.min  ; y < RUBICS.max ; y++){
                    for(let z = RUBICS.min  ; z < RUBICS.max ; z++){
                        pushMatrix();
                            gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(cube_part_inner_color));
                            RubicCell(x,y,z);
                        popMatrix();
                    }
                }
            }
        }
        
        pushMatrix();
            multTranslation([0, 0.1*Math.cos(Math.abs(time/1000)),0]);
            pushMatrix();
                gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(1,1,1)));
                uploadModelView();
                CUBE.draw(gl,program,gl.LINES);
            popMatrix();
            Rubics();
        popMatrix();
    }
}

const urls = ['shader.vert', 'shader.frag', 'picking_shader.vert', 'picking_shader.frag'];

loadShadersFromURLS(urls).then( shaders => setup(shaders));