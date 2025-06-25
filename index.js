const express = require('express');
const app=express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const port=process.env.PORT||5000;
app.use(cors({
    origin: 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
   const paymentCollection=client.db("StudyDB").collection('payment')
   const bookedSessionCollection=client.db("StudyDB").collection('bookedSession')
   const notesCollection=client.db("StudyDB").collection('notes')
   const materialsCollection = client.db("StudyDB").collection("materials");
  //  jwt related api
  app.post('/jwt',async(req,res)=>{
    const user=req.body;
    const token=jwt.sign(user,process.env. ACCESS_TOKEN_SECRET,{expiresIn:"1h"});
    res.send({token})
  
  })
  // middleware
  const verifyToken=(req,res,next)=>{
   console.log('inside verifytoken',req.headers)
   if(!req.headers.authorization){
 return res.status(401).send({ message:'forbidden access token'})
   }
   const token=req.headers.authorization.split(' ')[1]
 jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
  if(error){
    return res.status(401).send({message:'forbidden access'})
  }
  req.decoded=decoded
   next()
 })
  
  }
  // use verify admin after use verifyToken
  const verifyAdmin=async(req,res,next)=>{
  const email=req.decoded.email;
  const query={email:email};
  const user=await userCollection.findOne(query)
  if(user?.role !=='admin'){
      return res.status(403).send({ message: 'forbidden access: admin only' });
  }
  next()
  }
  // payment history
  app.get('/payment/:email',verifyToken,async(req,res)=>{
    const query={email:req.params.email}
    if(req.params.email !==req.decoded.email){
      return res.status(403).send({message:'forbidden access'})
    }
    const result=await paymentCollection.find(query).toArray();
    res.send(result)
  })
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
// user role
app.get("/user/:email",async(req,res)=>{
  const email=req.params.email
  const user=await userCollection.findOne({email:email})
  res.send(user)
})
// all user get koray fetch korbo
app.get("/user",verifyToken,verifyAdmin,async(req,res)=>{
  
  const result=await userCollection.find().toArray();
  res.send(result)
})
// user delete
app.delete("/user/:id",verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await userCollection.deleteOne(query);
  res.send(result)
})
// admin setup
app.patch('/user/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const updatedoc={
    $set:{
      role:"admin"
    }
  }
  const result=await userCollection.updateOne(query,updatedoc);
  res.send(result)
})

// review
app.get("/review",async(req,res)=>{
    const result=await reviewCollection.find().toArray()
    res.send(result)
})
// payment intent
app.post('/create-payment-intent',async(req,res)=>{
  const {price}=req.body;
  const amount=parseInt(price * 100)
   if (amount < 50) {
    return res.status(400).send({ error: "Amount must be at least $0.50" });
  }
  const paymentIntent=await stripe.paymentIntents.create({
    amount:amount,
    currency:"usd",
    payment_method_types:['card']
  })
  res.send({
    clientSecret:paymentIntent.client_secret
  })
})
// payment related api
app.post( '/payment',async(req,res)=>{
  const payment=req.body;
  const paymentResult=await paymentCollection.insertOne(payment)
  // carefull delete each item from the cart
 console.log('payment info',payment)
 const query={_id:{
  $in:payment.cartId.map(id=>new ObjectId(id))
 }}
 const deleteResult=await cartCollection.deleteMany(query)
 res.send({paymentResult,deleteResult})
})
// booked session
app.get("/bookedSession",async(req,res)=>{
  const email=req.query.email;
  if(!email)return res.send([])
    const result=await bookedSessionCollection.find({studentEmail:email}).toArray();
  res.send(result)
})
 app.post('/bookedSession',async(req,res)=>{
  const bookingInfo=req.body;
  const result=await bookedSessionCollection.insertOne(bookingInfo);
  res.send(result)
 })
//  notes collection
app.get('/notes',async(req,res)=>{
  const email=req.query.email;
   const result=await notesCollection.find({email}).toArray();
   res.send(result)
})
app.post("/notes",async(req,res)=>{
  const note=req.body;
  const result=await notesCollection.insertOne(note);
  res.send(result)
})
// delete note
app.delete('/notes/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await notesCollection.deleteOne(query);
  res.send(result)
})
// update note
app.put('/notes/:id',async(req,res)=>{
  const {id}=req.params;
  const {title,description}=req.body
  const query={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
      title,description
    }
  }
  const result=await notesCollection.updateOne(query,updateDoc)
  res.send(result)
})
// get note
app.get('notes/:id',async(req,res)=>{
  const {id}=req.params;
  const query={_id:new ObjectId(id)}
  const note=await notesCollection.findOne(query);
  res.send(note)
})
// metarils
app.get('/materials', async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.send([]);
  const result = await materialsCollection.find({ sessionId }).toArray();
  res.send(result);
});
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