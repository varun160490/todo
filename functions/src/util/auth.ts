import { admin, db } from './admin';
import * as functions from "firebase-functions";

const auth = (request:any, response:any, next:any) => {
	let idToken;
	if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
		idToken = request.headers.authorization.split('Bearer ')[1];
	} else {
		console.error('No token found');
		response.status(403).json({ error: 'Unauthorized' });
	}
	admin
		.auth()
		.verifyIdToken(idToken)
		.then((decodedToken) => {
			request.user = decodedToken;
			return db.collection('users').where('userId', '==', request.user.uid).limit(1).get();
		})
		.then((data) => {
			request.user.username = data.docs[0].data().username;
			request.user.imageUrl = data.docs[0].data().imageUrl;
			return next();
		})
		.catch((err) => {
			console.error('Error while verifying token', err);
			response.status(403).json(err);
		});
};

export default auth;