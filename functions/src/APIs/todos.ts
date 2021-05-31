import * as functions from "firebase-functions";
import {admin,db} from "../util/admin";

export const getAllTodos = functions.https.onRequest((request:any, response) => {
    
    db
		.collection('todos')   
        .where('username', '==', request.user.username)
		.orderBy('createdAt', 'desc')
		.get()
		.then((data) => {
			const todos:any = [];
			data.forEach((doc) => {
				todos.push({
                    todoId: doc.id,
                    title: doc.data().title,
					body: doc.data().body,
					createdAt: doc.data().createdAt,
				});
			});
			response.json(todos);
		})
		.catch((err) => {
			console.error(err);
			response.status(500).json({ error: err.code});
		});
});

export const postOneTodo = functions.https.onRequest((request:any, response) => {
	
	if (request.body.body.trim() === '') {
		response.status(400).json({ body: 'Must not be empty' });
    }
    
    if(request.body.title.trim() === '') {
        response.status(400).json({ title: 'Must not be empty' });
    }
	
    const newTodoItem = {
        username: request.user.username,
        title: request.body.title,
        body: request.body.body,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    }

    db
        .collection('todos')
        .add(newTodoItem)
        .then((doc)=>{
            const responseTodoItem:any = newTodoItem;
            responseTodoItem.id = doc.id;
            response.json(responseTodoItem);
        })
        .catch((err) => {
			response.status(500).json({ error: 'Something went wrong' });
			console.error(err);
		});
});

export const deleteTodo = functions.https.onRequest((request:any, response:any) => {
    const document = db.doc(`/todos/${request.params.todoId}`);
	
    document
        .get()
        .then((doc:any) => {
            if (!doc.exists) {
                return response.status(404).json({ error: 'Todo does not exist.' });
            }

            if(doc.data().username !== request.user.username){
                return response.status(403).json({error:"Not authorized to access this todo."});
            }

            return document.delete();
        })
        .then(() => {
            return response.json({ message: 'Todo Deleted successfully.' });
        })
        .catch((err) => {
            console.error(err);
            response.status(500).json({ error: err.code });
        });
});

export const editTodo = functions.https.onRequest((request, response ) => { 
    if(request.body.todoId || request.body.createdAt){
        response.status(403).json({message: 'Not allowed to edit'});
    }
    let document = db.collection('todos').doc(`${request.params.todoId}`);
    document.update(request.body)
    .then(()=> {
        response.json({message: 'Updated successfully'});
    })
    .catch((err) => {
        console.error(err);
        return response.status(500).json({ 
                error: err.code 
        });
    });
});

