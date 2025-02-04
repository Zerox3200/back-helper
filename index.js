import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { appRouter } from './src/app.router.js'
import { conn } from './DB/connection.js'

dotenv.config()
const app = express()

app.use(cors())
const port = process.env.PORT
conn();

appRouter(app, express)


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
