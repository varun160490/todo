import * as functions from "firebase-functions";
import firebase from "firebase";
import {db,admin} from "../util/admin";
import config from "../util/config";
import { validateLoginData, validateSignUpData } from '../util/validators';
import * as BusBoy from 'busboy';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { object } from "firebase-functions/lib/providers/storage";

firebase.initializeApp(config);

// Login
export const loginUser = functions.https.onRequest((request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLoginData(user);
	
    if (!valid) 
        response.status(400).json(errors);

    let token:any;

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user?.getIdToken();
        })
        .then((idtoken) => {
            token = idtoken;
            console.log(token);
            return response.json({ token: token });
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({ general: 'Something went wrong, please try again' });
        });
});

// Signup
export const signUpUser = functions.https.onRequest((request, response) => {
    const newUser = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        phoneNumber: request.body.phoneNumber,
        country: request.body.country,
		password: request.body.password,
		confirmPassword: request.body.confirmPassword,
		username: request.body.username
    };

    const { valid, errors } = validateSignUpData(newUser);

	if (!valid) 
        response.status(400).json(errors);

    let token:any;
    let userId:any;
    db
        .doc(`/users/${newUser.username}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                response.status(400).json({ username: 'this username is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email, 
                        newUser.password
                );

            }
        })
        .then((data) => {
            userId = data?.user?.uid;
            return data?.user?.getIdToken();
        })
        .then((idtoken) => {
            token = idtoken;
            const userCredentials = {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                phoneNumber: newUser.phoneNumber,
                country: newUser.country,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            return db
                    .doc(`/users/${newUser.username}`)
                    .set(userCredentials);
        })
        .then(()=>{
            response.status(201).json({ token });
        })
        .catch((err) => {
			console.error(err);
			if (err.code === 'auth/email-already-in-use') {
				return response.status(400).json({ email: 'Email already in use' });
			} else {
				return response.status(500).json({ general: 'Something went wrong, please try again' });
			}
		});
});

// Delete image
const deleteImage = (imageName:string) => {
    const bucket = admin.storage().bucket();
    const path = `${imageName}`
    return bucket.file(path).delete()
    .then(() => {
        return
    })
    .catch((error) => {
        return
    })
}

// Upload profile picture
export const uploadProfilePhoto = functions.https.onRequest((request:any, response) => {
    const busboy = new BusBoy({ headers: request.headers });

	let imageFileName = "";
	let imageToBeUploaded = {filePath:'',mimetype:''};

	busboy.on('file', (fieldname:any, file:any, filename:any, encoding:any, mimetype:string) => {
		if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
			response.status(400).json({ error: 'Wrong file type submited' });
		}
		const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${request.user.username}.${imageExtension}`;
		const filePath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = { filePath, mimetype };
		file.pipe(fs.createWriteStream(filePath));

        deleteImage(imageFileName);
    });
    
	busboy.on('finish', () => {
		admin
			.storage()
			.bucket()
			.upload(imageToBeUploaded.filePath, {
				resumable: false,
				metadata: {
					metadata: {
						contentType: imageToBeUploaded.mimetype
					}
				}
			})
			.then(() => {
				const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
				return db.doc(`/users/${request.user.username}`).update({
					imageUrl
				});
			})
			.then(() => {
				response.json({ message: 'Image uploaded successfully' });
			})
			.catch((error) => {
				console.error(error);
				response.status(500).json({ error: error.code });
			});
	});
	busboy.end(request.rawBody);
});

// Get user details
export const getUserDetail = functions.https.onRequest((request:any, response) => {
    const userData:any = {};
	db
		.doc(`/users/${request.user.username}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
                userData.userCredentials = doc.data();
                return response.json(userData);
			}	
		})
		.catch((error) => {
			console.error(error);
			return response.status(500).json({ error: error.code });
		});
});

// Update user details
export const updateUserDetails = functions.https.onRequest((request:any, response) => {
    
    let document = db.collection('users').doc(`${request.user.username}`);
    
    document.update(request.body)
    .then(()=> {
        response.json({message: 'Updated successfully'});
    })
    .catch((error) => {
        console.error(error);
        return response.status(500).json({ 
            message: "Cannot Update the value"
        });
    });
});

