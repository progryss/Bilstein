require('dotenv').config();
const axios = require('axios');
const {Product,inventoryData,inventoryUpdateHistory} = require('../models/user-models');
const { sendToAll } = require('./inventoryEvent');

const performUpdateInventory = async () => {
    let notificationResult = {
        totalSku: 0,
        startTimeDb: new Date(),
        updatedSkuDb: 0,
        failedSkuDb: [],
        endTimeDb: '',
        startTimeStore: '',
        updatedSkuStore: 0,
        failedSkuStore: 0,
        endTimeStore: ''
    }
    updateInventoryInDB(notificationResult).then(result => {
        updateInventoryInStore(notificationResult)
    }).catch(err => {
        console.log(err)
    });
}

const updateInventoryInDB = async (notificationResult) => {

    try {
        const tokenResponse = await axios.post(`${process.env.GRAVITE_API_URL}`, {
            api_credentials: {
                app_user: process.env.GRAVITE_API_USER,
                app_key: process.env.GRAVITE_API_KEY
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (tokenResponse.data.connection !== 'OK') {
            throw new Error("Error retrieving token: " + tokenResponse.data.error);
        }
        const apiToken = tokenResponse.data.token;
        // console.log('-----------')
        // console.log('Third Party Api Token - ', apiToken)

        // Get Location Id from Store
        const locationResponse = await axios.get(`${process.env.STORE_API_URL}/locations.json`, {
            headers: { 'X-Shopify-Access-Token': process.env.STORE_API_PASSWORD }
        });
        const locationId = locationResponse.data.locations[0].id;
        // console.log('-----------')
        // console.log('Store Location ID - ', locationId)

        await inventoryData.deleteMany({});

        // Fetch SKUs and inventory item of store product variants from db
        const products = await Product.find({
            $and: [
                { "variants.sku": { $ne: "" } },
                { "variants.sku": { $ne: null } }
            ]
        })

        const allSkuArr = products.flatMap(product => product.variants.map(variant => variant.sku ? ({
            sku: variant.sku,
            inventory_item_id: variant.inventory_item_id,
            current_qt:variant.inventory_quantity
        }) : ''));
        // console.log('-----------')
        // console.log('Total products - ', allSkuArr.length)

        // Notify clients that the batch process has started
        notificationResult.totalSku = allSkuArr.length;
        sendToAll({ message: "Batch process started", result: notificationResult });

        let result = await processBatches(allSkuArr, apiToken, locationId, notificationResult);

        // Notify clients that all batches are completed
        notificationResult.endTimeDb = new Date();
        sendToAll({ message: "All batches completed", result: notificationResult });

        const existingEntry = await inventoryUpdateHistory.findOne({ startTimeDb: notificationResult.startTimeDb })
        if (!existingEntry) {
            const newHistory = new inventoryUpdateHistory(notificationResult)
            await newHistory.save()
            // console.log('-----------')
            console.log('Inventory saved to DB Successfully')
        }


    } catch (error) {
        console.error("Failed to update inventory in db", error);
    }

};

const updateInventoryInStore = async (notificationResult) => {

    try {
        // Fetch SKUs and inventory item of store product variants from db
        const freshInventoryList = await inventoryData.find()
        const batches = chunkArray(freshInventoryList, 200);

        notificationResult.startTimeStore = new Date();
        sendToAll({ message: "Shopify Batch process started", result: notificationResult });

        let count = 0;
        let results = [];
        let totalResults = {count:0};
        for (const batch of batches) {
            count++;
            const batchData = await Promise.allSettled(batch.map(element => element && updateShopifyProductStock(element,totalResults)));
            results.push(batchData)
            notificationResult.updatedSkuStore += batchData.length;
            // console.log(`Store Batch ${count} Updated with ${notificationResult.updatedSkuStore} skus`)
            sendToAll({ message: `Shopify Batch processed ${count}`, result: notificationResult });
        }
        // console.log('-----------')
        console.log(`store process successfully complete ${totalResults.count}`)

        notificationResult.endTimeStore = new Date()
        sendToAll({ message: "All Shopify Batch processed", result: notificationResult });

        await inventoryUpdateHistory.findOneAndUpdate(
            { startTimeDb: notificationResult.startTimeDb },
            notificationResult
        )



        // Now all delete the previous data
        await inventoryData.deleteMany({});

        // console.log('-----------')
        // console.log('all inventory queries successfully deleted from DB')

    } catch (error) {
        console.log('error in updating shopify inventory', error)
        await inventoryData.deleteMany({});
    }
};

async function processBatches(allSkus, apiToken, locationId, notificationResult) {

    let result = {
        batchCount: 0,
        failedSku: [],
        updatedSku: 0
    }

    const batches = chunkArray(allSkus, 200);

    for (const batch of batches) {

        result.batchCount++;

        // console.log('-----------')
        // console.log(`batch - ${result.batchCount}`)

        // Notify clients that a batch has started
        sendToAll({ message: `Batch processing ${result.batchCount}`, result: notificationResult });

        const skuList = batch.map(element => ({ code: element.sku }));

        // console.log('-----------')
        // console.log('Sku To Third Party App - ', skuList.length)

        const resultFromThirdParty = await sendBatchRequest(skuList, apiToken);
        if (resultFromThirdParty.connection !== 'OK') {
            throw new Error("Error fetching stock levels: " + resultFromThirdParty.data.error);
        }

        const updatedInventory = Object.entries(resultFromThirdParty.product_stock);

        // creating new objects to set the updated inventory in store
        let inventoryObject = batch.map((element) => {
            let c = updatedInventory.find(ele => ele[0] == element.sku)
            if (c) {
                let obj = {
                    sku: element.sku,
                    inventory_item_id: element.inventory_item_id,
                    current_qt:element.current_qt,
                    available: parseInt(c[1].freestock),
                    locationId: locationId
                }
                return obj;
            } else {
                result.failedSku.push(element.sku)
                return undefined;
            }
        }).filter(element => element != undefined)

        inventoryObject.forEach(async (element) => {

            const newObj = new inventoryData(element);
            await newObj.save();

        })

        result.updatedSku += inventoryObject.length;
        // console.log('-----------')
        // console.log('Inventory Data Saved To DB - ', inventoryObject.length)

        // console.log('-----------')
        // console.log('Failed Sku - ', result.failedSku.length)

        notificationResult.updatedSkuDb += inventoryObject.length;
        notificationResult.failedSkuDb = result.failedSku;
        sendToAll({ message: `Batch processed ${result.batchCount}`, result: notificationResult });

    }

    return result;

}

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// function to fetch fresh inventory from thirdparty
async function sendBatchRequest(skuList, apiToken) {
    try {
        const response = await axios.post(`${process.env.GRAVITE_API_URL}`, {
            api_credentials: {
                app_user: process.env.GRAVITE_API_USER,
                app_key: process.env.GRAVITE_API_KEY,
                app_token: apiToken
            },
            product_codes: skuList
        });
        return response.data; // Assuming API returns JSON data
    } catch (error) {
        console.error('Failed to fetch stock levels:', error);
        throw error; // or handle the error as needed
    }
}

async function updateShopifyProductStock(element,totalResults) {
    const url = `${process.env.STORE_API_URL}/graphql.json`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.STORE_API_PASSWORD
    };

    const query = `
        mutation InventorySet($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
                inventoryAdjustmentGroup {
                    createdAt
                    reason
                    referenceDocumentUri
                    changes {
                        name
                        delta
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const variables = {
        input: {
            name: "available",
            reason: "correction",
            referenceDocumentUri: "logistics://some.warehouse/take/2023-01-23T13:14:15Z",
            quantities: [{
                inventoryItemId: `gid://shopify/InventoryItem/${element.inventory_item_id}`,
                locationId: `gid://shopify/Location/${element.locationId}`,
                quantity: element.available,
                compareQuantity: element.current_qt
            }]
        }
    };

    let attempt = 1; // Start with attempt 1

    while (attempt <= 5) { // Try up to 5 attempts
        try {
            let response = await axios.post(url, { query, variables }, { headers });

            // If rate limit is close, apply exponential backoff
            if (response.headers['x-shopify-shop-api-call-limit']) {
                const [used, limit] = response.headers['x-shopify-shop-api-call-limit'].split('/').map(Number);
                if (limit - used < 10) {
                    let delayTime = Math.pow(2, attempt) * 1000; // Exponential backoff formula
                    // console.log(`Rate limit approaching, waiting for ${delayTime}ms`);
                    await delay(delayTime);
                    attempt++;
                    continue; // Retry the request after delay
                }
            }

            if (response.data.errors) {
                if (response.data.errors.some(error => error.extensions.code === 'THROTTLED')) {
                    throw new Error('Throttled');
                }
                // console.error('GraphQL errors:', response.data.errors);
                return null;
            }
            if(response.data.data.inventorySetQuantities.inventoryAdjustmentGroup != null){
                totalResults.count += 1;
                // console.log(totalResults)
            }

            // console.log('Inventory update successful:', response.data.data.inventorySetQuantities.inventoryAdjustmentGroup);
            return response.data.data.inventorySetQuantities;
        } catch (error) {
            if (error.message === 'Throttled' && attempt < 5) {
                let delayTime = Math.pow(2, attempt) * 1000;
                // console.log(`Throttled. Retrying after ${delayTime} milliseconds...`);
                await delay(delayTime);
                attempt++;
                continue; // Retry the request after delay
            }
            // console.error('Error updating inventory:', error);
            return null;
        }
    }

    // console.log('Failed to update after maximum attempts due to throttling.');
    return null; // Return null after maximum attempts
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}





module.exports = {
    performUpdateInventory,
    updateInventoryInDB,
    updateInventoryInStore,
    processBatches,
    chunkArray,
    sendBatchRequest,
    updateShopifyProductStock
}