const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenKey = process.env.SECRET_KEY;
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: Boolean
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
});

// Define schema for Shopify products with indexing
const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    handle: {
        type: String,
        required: true,
        index: true // Adding index
    },
    image_src: {
        type: String
    },
    images: {
        type: Array
    },
    tags: {
        type: [String],
    },
    variants: [{
        id: {
            type: String
        },
        sku: {
            type: String,
            index: true // Adding index on SKU
        },
        price: {
            type: String
        },
        compare_at_price: {
            type: String
        },
        image_id: {
            type: String
        },
        inventory_item_id: {
            type: String
        },
        inventory_quantity: {
            type: String
        },
        inventory_policy: {
            type: String
        }
    }]
});

// Define schema for csv products with indexing
const csvDataSchema = new mongoose.Schema({
    manufacturer: {
        type: String,
        index: true // Adding index
    },
    year: {
        type: Array
    },
    model: {
        type: String,
        index: true // Adding index
    },
    subModel: {
        type: String,
        index: true // Adding index
    },
    engine: {
        type: String
    },
    bhp: {
        type: String
    },
    body: {
        type: String
    },
    startEndDate: {
        type: Array
    },
    engineCode: {
        type: Array
    },
    v8_Transmission_Gears: {
        type: Array
    },
    partNo: {
        type: String,
        index: true // Adding index
    },
    suspension_A: {
        type: String
    },
    transmissionType_A: {
        type: String
    },
    type_A: {
        type: String
    },
    vehicleEquipment_A: {
        type: String
    },
    chassisNumberFrom_A: {
        type: String
    },
});

// Creating a text index
csvDataSchema.index({
    manufacturer: 'text',
    model: 'text',
    subModel: 'text',
    partNo: 'text'
});

// Filter data schema
const filterDataSchema = new mongoose.Schema({
    name: {
        type: String
    },
    options: {
        type: Array
    }
});

const inventoryDataSchema = new mongoose.Schema({
    sku:{
        type:String
    },
    inventory_item_id:{
        type:String
    },
    current_qt:{
        type:Number
    },
    available:{
        type:Number
    },
    locationId:{
        type:Number
    }
})

const inventoryUpdateHistorySchema = new mongoose.Schema({
    totalSku:{
        type:Number
    },
    startTimeDb:{
        type:Date
    },
    updatedSkuDb:{
        type:Number
    },
    failedSkuDb:{
        type:Array
    },
    endTimeDb:{
        type:Date
    },
    startTimeStore:{
        type:Date
    },
    updatedSkuStore:{
        type:Number
    },
    failedSkuStore:{
        type:Number
    },
    endTimeStore:{
        type:Date
    }
})

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

userSchema.methods.generateToken = async function () {
    try {
        let userToken = jwt.sign({ _id: this._id }, tokenKey, { expiresIn: "24h" });
        this.tokens = this.tokens.concat({ token: userToken });
        await this.save();
        return userToken;
    } catch (error) {
        console.error("error in token generation function:", error);
        return error;
    }
};

// Method to clean up expired tokens
userSchema.methods.cleanupExpiredTokens = async function () {
    // Filter out expired tokens
    this.tokens = this.tokens.filter(tokenObj => {
        try {
            jwt.verify(tokenObj.token, tokenKey);
            return true; // keep the token if it's still valid
        } catch (error) {
            return false; // remove the token if it's expired
        }
    });

    // Optionally save the user document if you want the method to save changes automatically
    await this.save();
};

const sortTagSchema = new mongoose.Schema({
    sortTag:{
        type:'String'
    }
})

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Shopify Product', productSchema);
const CsvData = mongoose.model('Csv Option', csvDataSchema);
const filterData = mongoose.model('Filter Category', filterDataSchema);
const inventoryData = mongoose.model('Inventory Queries', inventoryDataSchema);
const inventoryUpdateHistory = mongoose.model('Inventory History',inventoryUpdateHistorySchema);
const SortTags = mongoose.model('Sort Tag',sortTagSchema);

module.exports = { User, Product, CsvData, filterData, inventoryData, inventoryUpdateHistory, SortTags };
