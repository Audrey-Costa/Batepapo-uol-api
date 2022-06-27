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

    setInterval(async ()=>{
        let timer = Date.now() - 10000;
        let users = await db.collection("users").find({lastStatus: {$lt: timer}}).toArray()
        const usersId = users.map(user=> user._id)
        await db.collection("users").deleteMany({_id: {$in: usersId}})
        users.map(async user=>{
            const logoutMessage = {
                from: user.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs(Date.now()).format("HH:mm:ss")
            }
            await db.collection("messages").insertOne(logoutMessage)
        })

    }, 15000);

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

        const anyUser = await db.collection("users").findOne({name: user.name})
        if(anyUser){
            return res.sendStatus(409)
        }
        await db.collection("users").insertOne(user)
        await db.collection("messages").insertOne(loginMessage)
        return res.sendStatus(201)
        
    } catch (error) {
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
            return res.sendStatus(422)
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
        await db.collection("users").updateOne({_id: user._id}, {$set: {lastStatus: Date.now()}});
        return res.sendStatus(200)
    } catch (error) {
        return res.sendStatus(500)
    }
})

server.delete("/messages/:messageId", async (req, res)=>{
    const messageId = req.params.messageId
    try {
        const message = await db.collection("messages").findOne({_id: new ObjectId(messageId)})
        const user = await db.collection("users").findOne({name: message.from})
        if(!message){
            return res.sendStatus(404)
        }
        if(user.name !== req.headers.user){
            return res.sendStatus(401)
        }

        await db.collection("messages").deleteOne({_id: new ObjectId(messageId)})
        return res.sendStatus(200)

    } catch (error) {
        return res.sendStatus(500)
    }
})

server.put("/messages/:messageId", async (req, res)=>{
    const messageId = req.params.messageId
    const validate = messageSchema.validate(req.body, {abortEarly: false});
    const newMessage = {
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        time: dayjs(Date.now()).format("HH:mm:ss")};
    try {
        const message = await db.collection("messages").findOne({_id: new ObjectId(messageId)})
        const user = await db.collection("users").findOne({name: message.from});
        if(!user){
            return res.sendStatus(422)
        }
        if(!message){
            return res.sendStatus(404)
        }
        if(user.name !== req.headers.user){
            return res.sendStatus(401)
        }

        await db.collection("messages").updateOne({_id: new ObjectId(messageId)}, {$set: newMessage})
        return res.sendStatus(200)
    } catch (error) {
        return res.sendStatus(500)
    }
})
server.listen(5000, ()=> console.log("Server On"))