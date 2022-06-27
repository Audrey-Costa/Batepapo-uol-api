import express from 'express';
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

server.post('/participantes', async (req, res)=>{
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

server.get('/participantes', async (req, res)=>{
    try {
        const participants = await db.collection("users").find().toArray();
        res.send(participants)
    } catch (error) {
        res.sendStatus(500)
    }
})

server.post('/messages', async (req, res)=>{
    const message = req.body
    const validate = messageSchema.validate(message, {abortEarly: false});
    message.time = dayjs(Date.now()).format("HH:mm:ss");
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

server.listen(5000, ()=> console.log("Server On"))