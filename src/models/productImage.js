const mongoose = require('mongoose')

const productImageSchema = new mongoose.Schema({
    product: {
        type: String,
        require: true,
        unique: true,
        trim: true
    },
    image: {
        type: Buffer
    }
})

const productImage = mongoose.model('Product Image', productImageSchema)

module.exports = productImage