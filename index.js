import express, { response } from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';

dotenv.config()
const server = express();
server.use([cors(), express.json()]);

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db
await mongoClient.connect(()=>{db = mongoClient.db("Batepapo_UOL")})

const userSchema = joi.object({
    name: joi.string().required()
})

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
})

server.post('/participants', async (req, res)=>{
    const user = req.body
    const validate = userSchema.validate(user, {abortEarly: false});
    user.lastStatus = Date.now()
    const loginMessage = {
        from: user.name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs(Date.now()).format("HH:mm:ss")}
    
    if(validate.error){
        res.sendStatus(422);
        return
    }
    try {

        const anyUser = await db.collection("users").findOne({user: user.name})
        if(anyUser){
            return res.sendStatus(409)
        }

        await db.collection("users").insertOne(user)
        await db.collection("messages").insertOne(loginMessage)
        return res.sendStatus(201)
        
    } catch (error) {
        console.log(error)
        return res.status(500).send(error)
    }
})

server.get('/participants', async (req, res)=>{
    try {
        const participants = await db.collection("users").find().toArray();
        res.send(participants)
    } catch (error) {
        return res.sendStatus(500)
    }
})

server.post('/messages', async (req, res)=>{
    const validate = messageSchema.validate(req.body, {abortEarly: false});
    const message = {
        from: req.headers.user,
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        time: dayjs(Date.now()).format("HH:mm:ss")}

    if(validate.error){
        res.sendStatus(422);
        return
    }
    try {
        const user = await db.collection("users").findOne({name: req.headers.user});
        if(!user){
            return  res.sendStatus(422)
        }
        await db.collection("messages").insertOne(message)
        return res.sendStatus(201)
    } catch (error) {
        return res.sendStatus(500)
    }
})

server.get('/messages', async (req, res)=>{
    const limit = parseInt(req.query.limit)
    try {
        const messages = await db.collection("messages").find({$or:[{from: req.headers.user},{to: req.headers.user},{to: "Todos"},{type: "message"}]}).toArray();
        const messagesLimited = messages.slice(-limit)
        return res.send(messagesLimited)
    } catch (error) {
        return response.status(500)
    }

})

server.post('/status', async (req, res)=>{
    try {
        const user = await db.collection("users").findOne({name: req.headers.user})
        if(!user){
            return res.sendStatus(404)
        }
        user.lastStatus = Date.now();
        console.log(user)
        return res.sendStatus(200)
    } catch (error) {
        return res.sendStatus(500)
    }
})
server.listen(5000, ()=> console.log("Server On"))