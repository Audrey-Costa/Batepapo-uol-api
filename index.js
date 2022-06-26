import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

const server = express();
server.use(cors());
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI);

server.listen(5000, ()=> console.log("Server On"))