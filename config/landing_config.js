require("dotenv").config()

const {MongoClient} = require("mongodb")

const client = new MongoClient(process.env.MONGO_URL2)


async function connectMongo() {
    try {
        await client.connect()
        console.log("Connected to MongoDB",process.env.MONGO_URL2)
        const db = client.db(process.env.DB_NAME)
        return db
    } catch (error) {
        console.log("Error: ",error)
    }
}

module.exports = connectMongo
