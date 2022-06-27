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
    name: joi.string().required(),
    lastStatus: joi.number().required()
})

server.post('/participantes', async (req, res)=>{
    const user = req.body
    user.lastStatus = Date.now()
    
    const validate = userSchema.validate(user, {abortEarly: false});
    if(validate.error){
        console.log(validate.error.message);
        res.sendStatus(422);
        return
    }
    try {

        const anyUser = await db.collection("users").findOne({user: user.name})
        if(anyUser){
            return res.sendStatus(409)
        }

        await db.collection("users").insertOne(user)
        await db.collection("messages").insertOne({from: user.name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs(Date.now()).format("HH:mm:ss")})
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



server.listen(5000, ()=> console.log("Server On"))