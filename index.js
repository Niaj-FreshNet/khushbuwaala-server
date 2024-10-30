const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kqlaj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("khushbuwaalaDB").collection("users");
    const itemCollection = client.db("khushbuwaalaDB").collection("items");
    const reviewCollection = client.db("khushbuwaalaDB").collection("reviews");
    const cartCollection = client.db("khushbuwaalaDB").collection("carts");
    const orderCollection = client.db("khushbuwaalaDB").collection("orders");

    // Order-related API to handle order creation
    app.post('/api/orders', async (req, res) => {
      const orderDetails = req.body;

      try {
        const result = await orderCollection.insertOne(orderDetails);
        console.log(result, '::::::::::::::::::::')
        res.status(201).json({ success: true, orderId: result.insertedId });
      } catch (error) {
        console.error("Order creation failed:", error);
        res.status(500).json({ success: false, message: 'Order creation failed' });
      }
    });

    // Orders GET route to retrieve an order by ID
    app.get('/api/orders/:orderId', async (req, res) => {
      const { orderId } = req.params;
      try {
        const order = await orderCollection.findOne({ _id: new ObjectId(orderId) });
        if (order) {
          res.status(200).send(order);
        } else {
          res.status(404).send({ message: 'Order not found' });
        }
      } catch (error) {
        res.status(500).send({ message: 'Error retrieving the order', error });
      }
    });


    // // jwt related api
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: '24h'
    //   });
    //   res.send({ token });
    // })

    // // middlewares
    // const verifyToken = (req, res, next) => {
    //   console.log('inside verify token', req.headers.authorization);
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: 'unauthorized access' });
    //   }
    //   const token = req.headers.authorization.split(' ')[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: 'unauthorized access' })
    //     }
    //     req.decoded = decoded;
    //     next();
    //   })
    // }

    // // use verify admin after verifyToken
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === 'admin';
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // }

    // user related api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exists
      // you can do this many ways (1. email unique, 2. upsert, 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedTd: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // item related apis
    app.get('/item', async (req, res) => {
      const result = await itemCollection.find().toArray();
      console.log(result)
      res.send(result);
    });

    app.get('/item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await itemCollection.findOne(query);
      res.send(result);
    });


    app.post('/item', async (req, res) => {
      const item = req.body;
      const result = await itemCollection.insertOne(item);
      res.send(result);
    });


    // Update item route
    app.patch('/item/:id', async (req, res) => {
      const itemId = req.params.id;

      console.log("Updating Item ID:", itemId); // Log the ID
      console.log("Request Body:", req.body); // Log the incoming request body

      // Prepare the update data
      const updateData = { $set: req.body };

      try {
        const result = await itemCollection.updateOne(
          { _id: new ObjectId(itemId) },
          updateData
        );
        console.log("Update Result:", result); // Log the result

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: 'Item not found or no changes made' });
        }

        res.status(200).json({ message: 'Item updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating item', error: error.message });
      }
    });


    app.delete('/item/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const result = await itemCollection.deleteOne({ _id: id });
        res.json({ deletedCount: result.deletedCount });
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.get('/related-products/:id', async (req, res) => {
      try {
          const itemId = req.params.id;
          const currentItem = await itemCollection.findOne({ _id: new ObjectId(itemId) });
  
          if (!currentItem) {
              return res.status(404).json({ error: "Product not found" });
          }
  
          const { category, smell } = currentItem;
  
          const relatedProducts = await itemCollection.find({
              _id: { $ne: new ObjectId(itemId) },
              category,
              smell: { $in: smell }
          }).limit(4).toArray();
  
          // Log the relatedProducts to inspect the format
          console.log("Related products:", relatedProducts);
  
          // Confirm that relatedProducts is an array before sending
          if (!Array.isArray(relatedProducts)) {
              return res.status(500).json({ error: "Unexpected response format: relatedProducts is not an array" });
          }
  
          res.json(relatedProducts);
      } catch (error) {
          console.error("Error fetching related products:", error);
          res.status(500).json({ error: "Error fetching related products" });
      }
  });

    // review related apis
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // carts collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
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


app.get('/', (req, res) => {
  res.send('Khushbuwaala is sitting')
});

app.listen(port, () => {
  console.log(`Khushbuwaala is sitting on port ${port}`);
});