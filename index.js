const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");

// manir-it-service-5e4f8-firebase-adminsdk

const serviceAccount = require('./manir-it-service-5e4f8-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const cors = require('cors');
require('dotenv').config();
const app = express();
const port =process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bstay.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {

    }
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db('manirIt');
    const servicesCollection = database.collection('services');
    const ordersCollection = database.collection('orders');
    const usersCollection = database.collection('users');
    const reviewsCollection = database.collection('reviews');



    // Get api
    app.get('/services', async (req, res) => {
      const cursor = servicesCollection.find({});
      const services = await cursor.toArray();
      res.send(services);
    })

    // get single service
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      console.log = ('getting specific service', id);
      const query = { _id: ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.json(service);
    });
    // delete api
    app.delete('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.json(result);
    })
    //POST API
    app.post('/services', async (req, res) => {
      const service = req.body;
      const result = await servicesCollection.insertOne(service); 
      res.json(result)
    });
    // post booking
    app.post('/orders', async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await ordersCollection.insertOne(order);
      res.json(result);
    })

    // get booking
    app.get('/orders', verifyToken, async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = { email: email };
      }
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);

    });

    // delete/cancel bookings
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query)
      res.json(result);
    })


    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.findOne(query);
      res.json(result)
    })

    //  update status
    app.put("/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      const updateStatus = req.body.status;
      const filter = { _id: ObjectId(id) };

      ordersCollection.updateOne(filter, {
        $set: { status: updateStatus },
      })
        .then(result => {
          res.send(result);
        })
    });

    // post user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);

      res.json(result);
    });

    // upsert 
    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    })

    // put admin
    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email:
            requester
        });

        if (requesterAccount.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc)
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: 'you do not have access to make admin' })
      }

    });

    // add review 

    app.post('/reviews', async (req, res) => {
      const review = req.body;
      review.createdAt = new Date();
      const result = await reviewsCollection.insertOne(review);
      res.json(result);
    });

    // get review
    app.get('/reviews', async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);

    });

    // admin get by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    })

  }
  finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('running manir-it-server');
});
app.listen(port, () => {
  console.log(`running manir-it-server, ${port}`);
})