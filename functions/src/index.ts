import * as functions from "firebase-functions";
import * as express from "express";
import {getAllTodos,postOneTodo,deleteTodo,editTodo} from "./APIs/todos";
import {loginUser,signUpUser,uploadProfilePhoto,getUserDetail,updateUserDetails} from './APIs/users';
import auth from './util/auth';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

const app = express();

// Todo APIs
app.get('/todos', auth, getAllTodos);
app.post('/todo', auth, postOneTodo);
app.delete('/todo/:todoId',auth, deleteTodo);
app.put('/todo/:todoId',auth, editTodo);

// User APIs
app.post('/login', loginUser);
app.post('/signup', signUpUser);
app.post('/user/image', auth, uploadProfilePhoto);
app.get('/user', auth, getUserDetail);
app.post('/user', auth, updateUserDetails);

export const api = functions.https.onRequest(app);

