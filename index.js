const express = require('express');
const app=express();
const cors = require('cors');
require('dotenv').config()

const port=process.env.PORT||5000;
app.use(cors());
app.use(express.json());
// DB_USER=Study-Session
// DB_PASS=wyuJpyXhuph9XaaU


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.leope.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
   const studysessionCollection=client.db("StudyDB").collection("studysession")
   const tutorCollection=client.db("StudyDB").collection('tutor')
   const reviewCollection=client.db("StudyDB").collection('review')
   const cartCollection=client.db("StudyDB").collection('cart')
   const userCollection=client.db("StudyDB").collection('user')
//  studysessio
app.get("/studysession",async(req,res)=>{
    const result=await studysessionCollection.find().toArray()
    res.send(result)
})
// tutor
app.get("/tutor",async(req,res)=>{
    const result=await tutorCollection.find().toArray()
    res.send(result)
})
// cart
app.get("/cart",async(req,res)=>{
    const email=req.query.email
    const query={email:email}
    const result=await cartCollection.find(query).toArray();
    res.send(result)
})
app.post('/cart',async(req,res)=>{
    const cartItem=req.body;
    const result=await cartCollection.insertOne(cartItem);
    res.send(result)
})
app.delete('/cart/:id',async(req,res)=>{
const id=req.params.id
const query={_id:new ObjectId(id)}
const result=await cartCollection.deleteOne(query)
res.send(result)
})
// user related api
app.post('/user',async(req,res)=>{
  const user=req.body;
  // insert email user if user does not exist
  // you can do this manay ways(1.email uniq 2. upsert 3.simple checking)
  const query={email:user.email}
  const existingUser=await userCollection.findOne(query)
  if(existingUser){
    return res.send({message:"user already exist",insertedId:null})
  }
  const result=await userCollection.insertOne(user);
  res.send(result)
})
// user ar role setup
app.post('/user',async(req,res)=>{
  const userInfo=req.body;
  const result=await userCollection.insertOne(userInfo)
  res.send(result)
})
// review
app.get("/review",async(req,res)=>{
    const result=await reviewCollection.find().toArray()
    res.send(result)
})
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('Study session server Running')
})
app.listen(port,()=>{
console.log(`Study session is RunningOn port:${port}`)
})