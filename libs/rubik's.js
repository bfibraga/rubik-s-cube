import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, scalem, rotate, normalize, mat4, rotateX, rotateY, rotateZ, translate, transpose, printm, equal } from './MV.js';
import { modelView, loadMatrix, popMatrix, pushMatrix, multScale, multTranslation, multRotationY, multRotationZ, multRotationX, multMatrix } from './stack.js'

export {init, min, max, getPiece, turnX, turnY, turnZ, planNextMove, makeNextMove, highlight, currentMove, shuffle, nVisibleFaces}

const RED = vec3(1.0,0.0,0.0);
const GREEN = vec3(0.0,1.0,0.0);
const BLUE = vec3(0.0,0.0,1.0);
const YELLOW = vec3(1.0,1.0,0.0);
const ORANGE = vec3(1.0,0.5,0.0);
const WHITE = vec3(1.0,1.0,1.0);
const NONE = vec3(0.0,0.0,0.0);

let min;
let max;

class Piece {
    constructor(pos, visible_faces){
        this.pos = pos;
        this.visible_faces = visible_faces;
    }

    update(x,y,z) { 
        this.pos = vec3(x,y,z);
    }   
}

class Face {
    constructor(normal, color){
        this.normal = normal;
        this.color = color;
    }

    update(normal){
        this.normal = normal;
    }

    getValidIndex(){
        let index = 0;
        for(let i = 0; i < this.normal.length && this.normal[i] == 0 ; i++){
            index++;
        }
        return index;
    }
}



let piece = [];

function init(dimensions, length, min_pos, max_pos){
    min = min_pos;
    max = max_pos;

    const build_normals = {
        "-X": [0, min, -1, GREEN],
        "X": [0, max-1, 1, BLUE],
        "-Y": [1, min, -1, YELLOW],
        "Y": [1, max-1, 1, WHITE],
        "-Z": [2,min, -1, ORANGE],
        "Z": [2, max-1, 1, RED]
    }

    for( let x = min ; x < max ; x++){
        //Add different possible indexes
        if (!possible_index.includes(x)){
            possible_index.push(x);
        }
        for( let y = min ; y < max ; y++){
            for(let z = min ; z < max ; z++){
                
                //Face building
                let new_faces = [];
                let new_face = applyFace(x, build_normals["-X"]);
                new_face != null ? new_faces.push(new_face) : null;

                new_face = applyFace(x, build_normals["X"]);
                new_face != null ? new_faces.push(new_face) : null;

                new_face = applyFace(y, build_normals["-Y"]);
                new_face != null ? new_faces.push(new_face) : null;

                new_face = applyFace(y, build_normals["Y"]);
                new_face != null ? new_faces.push(new_face) : null;

                new_face = applyFace(z, build_normals["-Z"]);
                new_face != null ? new_faces.push(new_face) : null;

                new_face = applyFace(z, build_normals["Z"]);
                new_face != null ? new_faces.push(new_face) : null;

                //Piece building
                const new_piece = new Piece(vec3(x,y,z), new_faces);
                piece.push(new_piece);
                    
            }
        }
    }
    console.log(piece);
    console.log(possible_index);
}

function applyFace(value, normal_data){
    let res = null;
    const axis = normal_data[0];
    const expected = normal_data[1];
    const normal_value = normal_data[2];
    const color = normal_data[3];
    if (value == expected){
        let normal = vec3(0,0,0);
        normal[axis] = normal_value;
        res = new Face(normal, color);
    }
    return res;
}

function getPiece(x,y,z){
    let curr_piece;
    for (let i = 0 ; i < piece.length ; i++){
        curr_piece = piece[i];
        if (x === curr_piece.pos[0] && y === curr_piece.pos[1] && z === curr_piece.pos[2])
            return curr_piece;
    }
    return null;
}

function nVisibleFaces(){
    let res = 0;
    piece.forEach(element =>{
        let faces = element.visible_faces;
        faces.forEach(visible => {
            res += visible != null ? 1 : 0;
        })
    })
    return res;
}

function highlight(x,y,z,color){
    let curr_piece = getPiece(x,y,z);
    let curr_face = curr_piece.visible_faces; 
    curr_face[0] != null ? curr_face[0].color = color : null;
    curr_face[1] != null ? curr_face[1].color = color : null;
    curr_face[2] != null ? curr_face[2].color = color : null;
}

/**
 * Turn around X axis
 * @param {*} index 
 * @param {*} dir
 * @pre index >= -1 && index <= 1
 * @pre dir >= -1 && dir <= -1
 */
 function turnX(parameters){
    if (parameters.length < 2){
        return false;
    } else {
        let index = Math.min(max-1, Math.max(parameters[0], min));
        let dir = Math.min(1, Math.max(parameters[1], -1));;
        for (let i = 0 ; i < piece.length ; i++){
            let curr_piece = piece[i];
            if (curr_piece.pos[0] === index){
                let matrix = mat4(1);
                let faces = curr_piece.visible_faces;
                matrix = mult(matrix, rotateX(-dir*90));
                for (let j = 0 ; j < faces.length ; j++){
                    if (faces[j] != null){
                        let curr_normal = faces[j].normal;
                        curr_normal = mult(matrix , vec4(curr_normal[0], curr_normal[1], curr_normal[2], 0));
                        faces[j].normal = vec3(Math.round(curr_normal[0]), Math.round(curr_normal[1]), Math.round(curr_normal[2]));
                    }
                }
                matrix = mult(matrix, translate(curr_piece.pos));
                const new_value = vec3(index, toFixed(matrix[1][3], 1), toFixed(matrix[2][3], 1));
                curr_piece.update(new_value);
            }
        }
    }
    return true;
}

/**
 * Turn around Y axis
 * @param {*} index 
 * @param {*} dir
 * @pre index >= -1 && index <= 1
 * @pre dir >= -1 && dir <= -1
 */
 function turnY(parameters){
    if (parameters.length < 2){
        return false;
    } else {
        let index = Math.min(max-1, Math.max(parameters[0], min));
        let dir = Math.sign(parameters[1])*1;
        for (let i = 0 ; i < piece.length ; i++){
            let curr_piece = piece[i];
            if (curr_piece.pos[1] === index){
                let matrix = mat4(1);
                let faces = curr_piece.visible_faces;
                matrix = mult(matrix, rotateY(-dir*90));
                for (let j = 0 ; j < faces.length ; j++){
                    if (faces[j] != null){
                        let curr_normal = faces[j].normal;
                        curr_normal = mult(matrix , vec4(curr_normal[0], curr_normal[1], curr_normal[2], 0));
                        faces[j].normal = vec3(Math.round(curr_normal[0]), Math.round(curr_normal[1]), Math.round(curr_normal[2]));
                    }
                }
                matrix = mult(matrix, translate(curr_piece.pos));
                const new_value = vec3(toFixed(matrix[0][3], 1), index, toFixed(matrix[2][3], 1));
                curr_piece.update(new_value);
            }
        }
    }
    return true;
}

/**
 * Turn around Z axis
 * @param {*} index 
 * @param {*} angle
 * @pre index >= -1 && index <= 1
 * @pre dir >= -1 && dir <= -1
 */
function turnZ(parameters){
    if (parameters.length < 2){
        return false;
    } else {
        let index = Math.min(max-1, Math.max(parameters[0], min));
        let dir = Math.sign(parameters[1])*1;
        for (let i = 0 ; i < piece.length ; i++){
            let curr_piece = piece[i];
            if (curr_piece.pos[2] === index){
                let matrix = mat4(1);
                matrix = mult(matrix, rotateZ(-dir*90));
                let faces = curr_piece.visible_faces;
                for (let j = 0 ; j < faces.length ; j++){
                    if (faces[j] != null){
                        let curr_normal = faces[j].normal;
                        curr_normal = mult(matrix , vec4(curr_normal[0], curr_normal[1], curr_normal[2], 0));
                        faces[j].normal = vec3(Math.round(curr_normal[0]), Math.round(curr_normal[1]), Math.round(curr_normal[2]));
                    }
                }
                matrix = mult(matrix, translate(curr_piece.pos));
                const new_value = vec3(toFixed(matrix[0][3], 1), toFixed(matrix[1][3], 1), index);
                curr_piece.update(new_value);
            }
        }
    }
    return true;
}

//---- Move ----

class Move {
    constructor(type, parameters, id){
        this.type = type;
        this.parameters = parameters;
        this.id = id;
        this.animating = true;
    }
}

/**
 * Queue of Moves
 */
 let move = [];
 let move_counter = 0;
 let shuffling = false;
 let possible_index = [];

function currentMove(){
    return move[move_counter];
}

function makeNextMove(){
    const nextmove = currentMove();
    if (nextmove != null){
        nextmove.type(nextmove.parameters)
        nextmove.animating = false;
        move_counter++;
    }
}

function planNextMove(new_type, new_parameters, new_id){
    const new_move = new Move(new_type, new_parameters, new_id);
    move.push(new_move);
    return new_move;
}

function clearMoveList(){
    move = [];
    move_counter = 0;
}

function toFixed(value, precision) {
    var power = Math.pow(10, precision || 0);
    return Math.round(value * power) / power;
}

function randomIntFromInterval(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomParameters(){
    const get_move = randomIntFromInterval(0, possible_index.length-1);
    let index = possible_index[get_move];
    index = index === 0 ? possible_index[0] : index;
    let dir =  Math.random() >= 0.5 ? 1 : -1;
    return [index,dir];
}

function chooseParameters(move, id){
    let new_param = randomParameters();
    let old_param = move.parameters;
    
    if (move.id === id && old_param[0] === new_param[0] && Math.abs(old_param[1]) === Math.abs(new_param[1])){
        new_param = chooseParameters(move, id);
    }  
    
    return new_param;
}

function shuffle(){
    shuffling = true;
    const n = randomIntFromInterval(25,50);
    let previous_move = new Move(turnX, [0,0], "X");
    for(let i = 0 ; i < n ; i++){
        const rand = Math.random();
        let param; 
        if (rand < 0.3){
            param = chooseParameters(previous_move, "X");
            previous_move = planNextMove(turnX, param, "X");
        } else if (rand < 0.6){
            param = chooseParameters(previous_move, "Y");
            previous_move = planNextMove(turnY, param, "Y");
        } else {
            param = chooseParameters(previous_move, "Z");
            previous_move = planNextMove(turnZ, param, "Z");
        }
    }
    shuffling = false;
}