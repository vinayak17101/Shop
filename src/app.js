// Importing the required libraries
const path = require('path')
const fs = require('fs')
const express = require('express')
const hbs = require('hbs')
const multer = require('multer')
const sharp = require('sharp')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const visualRecognition = require('./models/visual-recognition')
require('./db/mongoose')
const User = require('./models/user')
const auth = require('./middleware/auth')
const productImage = require('./models/productImage')
const encode = require('./models/encode')

// Defining the class object
const upload = multer()
const app = express()

// Defining variables
const port = 3000
const publicDirectory = path.join(__dirname, '../public')
const viewDirectory = path.join(__dirname, '../templates/views')
const partialDirectory = path.join(__dirname, '../templates/partials')

// Setting up the directory
app.set('view engine', 'hbs')
app.set('views', viewDirectory)
hbs.registerPartials(partialDirectory)
app.use(express.static(publicDirectory))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())
app.use(session({secret: 'thisisme', saveUninitialized: true, resave: true}))

// Startup Page
app.get('/', (req, res) => {
    res.render('startup')
})

// Signup Page
app.get('/signup', (req, res) => {
  res.render('signup')
})

app.post('/signup', async(req, res) => {
  const user = new User(req.body)
  try {
      await user.save()
      const token = await user.generateAuthToken()
      res.cookie('jwt', token)
      res.redirect("/home")
  } catch (e) {
    console.log(e)
      res.render('signup', {
        errorMessage: 'Account with same email id exists! Try with different one.'
      })
  }
})

// Login Page
app.get('/login', (req, res) => {
  res.render('login')
})

app.post('/login', async(req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    res.cookie('jwt', token)
    res.redirect('/home')
  } catch (e) {
      res.render('login', {
        errorMessage: 'Provided credentials is not correct! Please try again.'
      })
  }
})

// Logout Page
app.get('/logout', auth, async (req, res) => {
  try {
      req.user.tokens = req.user.tokens.filter((token) => {
          return token.token !== req.token
      })
      await req.user.save()

      res.redirect('/')
  } catch (e) {
      res.status(500).send()
  }
})

// Home page
app.get('/home', auth, (req, res) => {
  res.render('home')
})

// Billing Page
app.get('/billing/:token', auth, (req, res) => {
  res.render('form')
})

app.post('/billing/:token', auth, upload.single('image'), async(req, res) => {
    await sharp(req.file.buffer).resize({width: 250, height: 250}).toFile('image.png')
    const imagePath = path.join(__dirname, '../image.png')
    const params = {
        imagesFile: [
          {
            data: fs.createReadStream(imagePath),
            contentType: 'image/jpeg',
          }
        ],
        collectionIds: ['663179e7-8856-4872-b255-75bdfc169b1a'],
        features: ['objects'],
      };
    fs.unlinkSync(imagePath)
    console.log('Ho')
    visualRecognition.analyze(params).then(response => {
        const objects = response.result.images[0].objects.collections[0].objects
        console.log(objects)
        res.render('form')
    }).catch(err => {
        console.log('error: ', err);
    })
})


// Add Product Page
app.get('/addproduct', auth, (req, res) => {
  res.render('addproduct', {})
})

app.post('/addproduct', auth, upload.single('image'), async(req, res) => {
  await sharp(req.file.buffer).resize({width: 250, height: 250}).toFile('image.png')
  const imagePath = path.join(__dirname, '../image.png')
  const params = {
      imagesFile: [
        {
          data: fs.createReadStream(imagePath),
          contentType: 'image/jpeg',
        }
      ],
      collectionIds: ['663179e7-8856-4872-b255-75bdfc169b1a'],
      features: ['objects'],
    };
  const response = await visualRecognition.analyze(params)
  const objects = response.result.images[0].objects.collections[0].objects
  var products = []
  for (const comp of objects) {
    const item = await productImage.findOne({product: comp.object})
    var bytes = new Uint8Array(item.image.buffer);
    src = 'data:image/png;base64,'+encode(bytes);
    products.push({
      name: item.product,
      image: src
    })
  }
  res.render('addproduct', {
    products
  })
})

// Add Product image
app.get('/image', (req, res) => {
  res.render('add-image')
})

app.post('/image', upload.single('image'), async(req, res) => {
  const pimage = await sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
  const pImage = new productImage({
    product: req.body.pname,
    image: pimage
  })
  await pImage.save()
  res.render('add-image')
})


app.listen(port, () => {
    console.log('Server is up on port ', port)
})