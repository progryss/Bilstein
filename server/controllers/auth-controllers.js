require("dotenv").config();
const bcrypt = require("bcryptjs");
const {
  User,
  Product,
  CsvData,
  filterData,
  inventoryUpdateHistory,
  SortTags,
} = require("../models/user-models");
const axios = require("axios");
const async = require("async");
const { performUpdateInventory } = require("../services/inventryUpdate");
const { redisClient } = require("../redisClient");

// for csv file upload
const fs = require("fs");
const csv = require("fast-csv");

const userRegister = async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).send("User already exists");
    }
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
    });
    await newUser.save();
    return res.status(200).send("User registered");
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal server error");
  }
};

const userLogin = async (req, res) => {
  try {
    const userValid = await User.findOne({ email: req.body.email });
    if (userValid) {
      const detailsMatch = await bcrypt.compare(
        req.body.password,
        userValid.password
      );
      if (!detailsMatch) {
        return res.status(401).send("Invalid credentials");
      } else {
        const token = await userValid.generateToken();
        res.cookie("userCookie", token, {
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: "Lax",
          secure: true,
        });
        return res.status(200).send({ userValid });
      }
    } else {
      return res.status(404).send("User not found");
    }
  } catch (error) {
    return res.status(500).send(error);
  }
};

const validateUser = async (req, res) => {
  try {
    let user = await User.findOne({ _id: req.userId });
    res.status(200).send(user);
  } catch (error) {
    res.status(401).send("user not found");
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("userCookie");
    res.status(200).send({ message: "Logged out successfully" });
  } catch (error) {
    res.status(401).send({ message: "error in Logged out" });
  }
};

const updatePassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const user = req.validUser;
    user.password = newPassword;
    await user.save();
    res.status(200).send("Password updated successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("error in updating password");
  }
};

const updateUser = async (req, res) => {
  const { _id, name, email, newPassword } = req.body;
  const data = {};
  data._id = _id;
  if (name) data.name = name;
  if (email) data.email = email;

  try {
    if (newPassword) {
      data.password = await bcrypt.hash(newPassword, 12);
    }
    const updateUser = await User.findByIdAndUpdate(
      data._id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updateUser) {
      return res.status(404).send("user not found");
    }
    res.status(200).send("User updated successfully");
  } catch (error) {
    res.status(500).send("error in updating user", error);
  }
};

const getUsers = async (req, res) => {
  try {
    const response = await User.find();
    if (!response) {
      return res.status(401).send("no user found");
    }
    res.status(200).send(response);
  } catch (error) {
    console.log("errer in getting user", error);
    res.status(500).send(error);
  }
};

const deleteUser = async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findOneAndDelete({ email: email });
    if (!user) {
      return res.status(404).send("user not found");
    }
    res.status(200).send("User deleted successfully");
  } catch (error) {
    console.log("error in deleting user");
    res.status(500).send("error deleting user", error);
  }
};

const syncProductFromShopify = async (req, res) => {
  try {
    const apiKey = process.env.STORE_API_KEY;
    const password = process.env.STORE_API_PASSWORD;
    const apiUrl = process.env.STORE_API_URL;

    if (!apiKey || !password || !apiUrl) {
      return res.status(400).json({ error: "API configuration is missing" });
    }

    let url = `${apiUrl}/products.json?limit=250`; // First request to fetch up to 250 products

    // Keep making requests until there is no 'next' URL
    while (url) {
      // Fetch data from Shopify
      const response = await axios.get(url, {
        auth: {
          username: apiKey,
          password: password,
        },
      });

      // Sync each product and store it in the database as soon as they are fetched
      await Promise.all(
        response.data.products.map(async (productData) => {
          const productFields = {
            productId: productData.id, // Use Shopify product ID
            title: productData?.title ?? "Unknown Title",
            handle: productData?.handle ?? "Unknown Handle",
            image_src: productData?.image?.src ?? "",
            images: productData?.images ?? [],
            tags: productData?.tags ?? [],
            variants:
              productData?.variants?.map((variant) => ({
                id: variant.id,
                sku: variant.sku,
                price: variant.price,
                compare_at_price: variant.compare_at_price,
                image_id: variant.image_id,
                inventory_item_id: variant.inventory_item_id,
                inventory_quantity: variant.inventory_quantity ?? 0,
                inventory_policy: variant.inventory_policy ?? "deny",
                inventory_management: variant.inventory_management === "shopify" ? "shopify" : null
              })) ?? [],
          };

          // Insert or update the product in MongoDB
          await Product.findOneAndUpdate(
            { productId: productData.id }, // Check if product exists by Shopify ID
            productFields, // Update fields if different
            { upsert: true, new: true } // Insert if not found, return updated document
          );
        })
      );

      // Check the Link header for the 'next' page URL for pagination
      const linkHeader = response.headers["link"]; // Get the Link header

      // If the Link header contains a 'next' URL, set it to the 'url' variable
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextPageUrl = linkHeader
          .split(",")
          .find((part) => part.includes('rel="next"'))
          .split(";")[0]
          .trim()
          .slice(1, -1);
        url = nextPageUrl; // Set the URL to the next page's URL
      } else {
        url = null; // No more pages, so we stop the loop
      }
    }

    res.status(200).send("All products synced successfully.");
  } catch (error) {
    console.error("Error syncing data:", error);
    res.status(500).json({ error: "Failed to sync products" });
  }
};

const deleteProductFromDb = async (req, res) => {
  try {
    await Product.deleteMany({});
    res.status(200).send("All products deleted successfully.");
  } catch (error) {
    console.log("Error deleting products:", error);
    res.status(500).send("Failed to delete products");
  }
};

function getYearsInRange(startYear, endYear) {
  const start = Math.min(parseInt(startYear), parseInt(endYear));
  const end = Math.max(parseInt(startYear), parseInt(endYear));
  const years = [];

  for (let year = start; year <= end; year++) {
    years.push(year.toString());
  }

  return years;
}

async function insertBatch(batch, batchNumber) {
  // console.log(`Inserting batch ${batchNumber} with ${batch.length} records.`);
  await CsvData.insertMany(batch);
  // console.log(`Batch ${batchNumber} inserted successfully.`);
}

const BATCH_SIZE = 50000;
let batchNumber = 0;
let totalRecords = 0;

// function to save csv product to db in batch
async function processCsvFile(filePath) {
  let batch = []; // Array to hold the batch
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const csvStream = csv
      .parse({ headers: true })
      .transform((data) => {
        let subModel = `${data.SubModel ? data.SubModel.trim() : ""}${
          data["Mark or Series"] ? ` ${data["Mark or Series"].trim()}` : ""
        }${data.Identifier ? ` ${data.Identifier.trim()}` : ""}`;

        let engine = `${data["Engine Size"] ? data["Engine Size"] : ""}${
          data.Valve ? ` ${data.Valve.trim()}` : ""
        }${data["BHP"] ? ` ${data["BHP"].trim()}` : ""}${
          data.Drive ? ` ${data.Drive.trim()}` : ""
        }${data.Fuel ? ` ${data.Fuel.trim()}` : ""}`;

        let yearInfo = `${
          data.StartEndDate ? data.StartEndDate.trim() : ""
        }`.match(/\d{4}/g);

        const transformed = {
          manufacturer: data.Manufacturer ? data.Manufacturer.trim() : "",
          year: getYearsInRange(yearInfo[0], yearInfo[1]),
          model: data.Model ? data.Model.trim() : "",
          subModel: subModel.trim(),
          engine: engine,
          bhp: data["BHP"] ? data["BHP"].trim() : "",
          body: data.Body ? data.Body.trim() : "",
          startEndDate: data.StartEndDate ? data.StartEndDate.split(',').map(code => code.trim()) : "",
          engineCode: data["Engine Code"] ? data["Engine Code"].split(',').map(code => code.trim()) : "",
          v8_Transmission_Gears: data["V8_Transmission_Gears"] ? data["V8_Transmission_Gears"].split(',').map(code => code.trim()) : "",
          partNo: data.PartNo ? data.PartNo.trim() : "",
          suspension_A: data.Suspension_A ? data.Suspension_A.trim() : "",
          transmissionType_A: data["Transmission Type_A"]
            ? data["Transmission Type_A"].trim()
            : "",
          type_A: data.Type_A ? data.Type_A.trim() : "",
          vehicleEquipment_A: data["Vehicle Equipment_A"]
            ? data["Vehicle Equipment_A"].trim()
            : "",
          chassisNumberFrom_A: data["Chassis number from_A"]
            ? data["Chassis number from_A"].trim()
            : "",
        };
        return transformed;
      })

      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject();
      })
      .on("data", async (row) => {
        batch.push(row);

        if (batch.length >= BATCH_SIZE) {
          csvStream.pause(); // Pause the stream to manage flow control
          batchNumber++;
          // Asynchronously insert the batch
          insertBatch(batch, batchNumber)
            .then(() => {
              batch = []; // Clear the batch after successful insertion
              csvStream.resume(); // Resume the stream
            })
            .catch((error) => {
              console.error(`Error inserting batch ${batchNumber}:`, error);
              csvStream.resume(); // Optionally continue processing after a failed insert
            });
        }
        resolve();
      })
      .on("end", () => {
        // Handle the last batch
        if (batch.length > 0) {
          batchNumber++;
          insertBatch(batch, batchNumber)
            .then(() => {
              console.log(`Final batch ${batchNumber} inserted.`);
            })
            .catch((error) => {
              console.error(
                `Error inserting final batch ${batchNumber}:`,
                error
              );
            });
        }
        console.log("CSV file has been processed successfully.");
      });

    stream.pipe(csvStream);
  });
}

async function countCsvRows(filePath) {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true })) // Parse CSV with headers
      .on("data", (row) => {
        rowCount++;
      })
      .on("end", () => {
        // console.log(`Total batches: ${rowCount / BATCH_SIZE}`);
        resolve(rowCount);
      })
      .on("error", reject); // Handle any errors
  });
}

const uploadCsvData = async (req, res) => {
  batchNumber = 0;
  totalRecords = 0;
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  totalRecords = await countCsvRows(req.file.path);
  try {
    // Assume a function processCsvFile that processes your CSV file
    await processCsvFile(req.file.path);
    res.status(200).send("csv uploaded successfully.");
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.log("Error uploading csv:", error);
    res.status(500).send("Error uploading csv");
    try {
      fs.unlinkSync(req.file.path);
      console.log("File was deleted after a failure");
    } catch (deleteError) {
      console.error(
        "Failed to delete the file after processing error:",
        deleteError
      );
    }
  }
};

const progress = async (req, res) => {
  if (totalRecords > 0) {
    res.json({
      status: "processing",
      progress: batchNumber,
      totalBatches: totalRecords / BATCH_SIZE,
      totalRecords: totalRecords,
    });
  } else {
    res.json({
      status: "complete",
      progress: totalRecords,
    });
  }
};

const deleteCsvData = async (req, res) => {
  try {
    await CsvData.deleteMany({});
    res.status(200).send("Csv data deleted successfully.");
  } catch (error) {
    console.error("Error deleting csv data:", error);
    res.status(500).send("Failed to delete csv data");
  }
};

const getCsvData = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100; // Default and maximum rows per page
  const skip = (page - 1) * limit;
  const search = req.query.search;
  // Build the query object
  let query = {};
  if (search) {
    query = {
      $text: { $search: `"${search}"` }, // Using text search for efficiency
    };
  }

  try {
    // Find documents based on the query
    const csvData = await CsvData.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    // Count only the documents that match the query
    const total =
      search != ""
        ? await CsvData.countDocuments(query)
        : await CsvData.estimatedDocumentCount();

    res.status(200).send({
      total,
      data: csvData,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching csv data:", error);
    res.status(500).json({ error: "Failed to fetch csv data" });
  }
};

const getCsvDataManufacturer = async (req, res) => {
  try {
    // Use a clear key name for the cache
    const cacheKey = "uniqueManufacturer";

    // 1. Check if data is cached in Redis
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      // console.log("Returning unique manufacturer from Redis cache");
      return res.status(200).send(JSON.parse(cachedData));
    }

    // 2. If not found in cache, fetch from MongoDB
    // console.log("Cache miss. Querying MongoDB...");
    const uniqueManufacturer = await CsvData.aggregate([
      { $group: { _id: "$manufacturer" } },
      { $project: { _id: 0, manufacturer: "$_id" } },
    ]);

    // 3. Store the result in Redis for next time
    await redisClient.set(cacheKey, JSON.stringify(uniqueManufacturer), {
      EX: 43200,
    });

    // 4. Send the fresh data
    return res.status(200).send(uniqueManufacturer);
  } catch (error) {
    console.error("Error fetching unique manufacturer:", error);
    return res.status(500).json({ error: "Failed to fetch unique manufacturer" });
  }
};

const getCsvDataYears = async (req, res) => {
  try {
    const selectedManufacturer = req.query.manufacturer;

    // Check if the selected manufacturer are provided
    if (!selectedManufacturer) {
      return res.status(400).json({ error: "Selected manufacturer are required" });
    }

    // Perform aggregation to get unique years for the selected model
    const years = await CsvData.aggregate([
      { $match: { manufacturer: selectedManufacturer } },
      { $group: { _id: "$year" } }, // Group documents by "year" field
      { $project: { _id: 0, year: "$_id" } }, // Project the "year" field without _id
    ]);

    res.status(200).send(years);
  } catch (error) {
    console.error("Error fetching unique start and end years:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch unique start and end years" });
  }
};

const getCsvDataModels = async (req, res) => {
  try {
    // Extract the selected manufacturer and year value from the query parameters
    const selectedManufacturer = req.query.manufacturer;
    const selectedYear = req.query.year;

    // Check if the selected manufacturer is provided
    if (!selectedManufacturer || !selectedYear) {
      return res
        .status(400)
        .json({ error: "Selected manufacturer and year is required" });
    }

    // Perform aggregation to get unique models for the selected manufacturer and year
    const uniqueModels = await CsvData.aggregate([
      { $match: { manufacturer: selectedManufacturer, year: selectedYear } }, // Filter documents by selected manufacturer
      { $group: { _id: "$model" } }, // Group documents by "model" field
      { $project: { _id: 0, model: "$_id" } }, // Project the "model" field without _id
    ]);

    res.status(200).send(uniqueModels.map((item) => item.model));
  } catch (error) {
    console.error("Error fetching unique models:", error);
    res.status(500).json({ error: "Failed to fetch unique models" });
  }
};

const getCsvDataSubModels = async (req, res) => {
  try {
    // Extract the selected manufacturer and year value from the query parameters
    const selectedManufacturer = req.query.manufacturer;
    const selectedYear = req.query.year;
    const selectedModel = req.query.model;

    // Check if the selected manufacturer is provided
    if (!selectedManufacturer || !selectedYear || !selectedModel) {
      return res
        .status(400)
        .json({ error: "Selected manufacturer, year and model is required" });
    }

    // Perform aggregation to get unique models for the selected manufacturer and year
    const uniqueSubModels = await CsvData.aggregate([
      { $match: { manufacturer: selectedManufacturer, year: selectedYear, model: selectedModel } }, // Filter documents by selected manufacturer
      { $group: { _id: "$subModel" } }, // Group documents by "model" field
      { $project: { _id: 0, subModel: "$_id" } }, // Project the "model" field without _id
    ]);
    res.status(200).send(uniqueSubModels.map((item) => item.subModel != "" ? item.subModel : 'all'));
  } catch (error) {
    console.error("Error fetching unique sub models:", error);
    res.status(500).json({ error: "Failed to fetch unique sub models" });
  }
};

const getCsvDataEngine = async (req, res) => {
  try {
    const selectedManufacturer = req.query.manufacturer;
    const selectedYear = req.query.year;
    const selectedModel = req.query.model;
    const selectedSubModel = req.query.sub_model === "all" ? "" : req.query.sub_model;

    // Check if the engine is provided
    if (!selectedManufacturer || !selectedYear || !selectedModel) {
      return res
        .status(400)
        .json({ error: "Selected manufacturer , year, model and sub_model are required" });
    }

    // Perform aggregation to get unique engine types for the selected year
    const uniqueEngine = await CsvData.aggregate([
      {
        $match: {
          manufacturer: selectedManufacturer,
          year: selectedYear,
          model: selectedModel,
          subModel:selectedSubModel 
        },
      },
      { $group: { _id: "$engine" } },
      { $project: { _id: 0, engine: "$_id" } },
    ]);

    res.status(200).send(uniqueEngine);
  } catch (error) {
    console.error("Error fetching unique engine types:", error);
    res.status(500).json({ error: "Failed to fetch unique engine types" });
  }
};

const getCsvDataBody = async (req,res)=>{
  try{

  const selectedManufacturer = req.query.manufacturer;
  const selectedYear = req.query.year;
  const selectedModel = req.query.model;
  const selectedSubModel = req.query.sub_model === "all" ? "" : req.query.sub_model;
  const selectedEngine = req.query.engine;
    // Check all values are provided
    if (
      !selectedManufacturer ||
      !selectedYear ||
      !selectedModel ||
      !selectedEngine
    ) {
      return res.status(400).json({ error: "data missing" });
    }

    const uniqueBody = await CsvData.aggregate([
      {
        $match:{
          manufacturer:selectedManufacturer,
          year:selectedYear,
          model:selectedModel,
          subModel:selectedSubModel,
          engine:selectedEngine
        }
      },
      {
        $group:{
          _id:"$body"
        }
      },
      {
        $project:{
          _id:0,
          body:"$_id"
        }
      }
    ])

    res.status(200).send(uniqueBody)
  }catch(err){
    console.log('error in getting bodies',err)
    res.status(500).json({error:'error in getting bodies'})
  }
}

const getCsvDataSkus = async (req, res) => {
  try {
    const selectedManufacturer = req.query.manufacturer;
    const selectedYear = req.query.year;
    const selectedModel = req.query.model;
    const selectedSubModel = req.query.sub_model === "all" ? "" : req.query.sub_model;
    const selectedEngine = req.query.engine;
    const selectedBody = req.query.body;

    // Check all values are provided
    if (
      !selectedManufacturer ||
      !selectedYear ||
      !selectedModel ||
      !selectedBody ||
      !selectedEngine
    ) {
      return res.status(400).json({ error: "required data missing" });
    }

    // Perform aggregation to get unique SKUs for the selected dropdown values
    const uniqueSKUs = await CsvData.aggregate([
      {
        $match: {
          manufacturer: selectedManufacturer,
          year: selectedYear,
          model: selectedModel,
          subModel: selectedSubModel,
          engine: selectedEngine,
          body: selectedBody,
        },
      },
      { $group: { _id: "$partNo" } },
      { $project: { _id: 0, sku: "$_id" } },
    ]);

    res.status(200).send(uniqueSKUs);
  } catch (error) {
    console.error("Error fetching unique SKUs:", error);
    res.status(500).send("Failed to fetch unique SKUs");
  }
};

const getProductsBySkus = async (req, res) => {
  try {
    const { skus, manufacturer,year, model, subModel, engine, body } = req.body;

    let csvQuery = { partNo: { $in: skus } };
    if (manufacturer) csvQuery.manufacturer = manufacturer;
    if (year) csvQuery.year = year;
    if (model) csvQuery.model = model;
    if (subModel) csvQuery.subModel = subModel;
    if (engine) csvQuery.engine = engine;
    if (body) csvQuery.body = body;

    let productQuery = { "variants.sku": { $in: skus } };

    // Fetching data concurrently using async.parallel
    async.parallel(
      {
        csvDataResults: async () => await CsvData.find(csvQuery),
        products: async () => await Product.find(productQuery),
      },
      (err, results) => {
        if (err) {
          console.error("Error fetching data:", err);
          return res
            .status(500)
            .send({ message: "Failed to fetch products", error: err });
        }
        // Send combined results as response
        return res.status(200).send(results);
      }
    );
  } catch (error) {
    console.error("Error fetching products by SKU:", error);
    res.status(500).send({
      message: "Failed to fetch products due to an internal error",
      error,
    });
  }
};

const deleteMultipleRows = async (req, res) => {
  try {
    const rowId = req.body.ids;
    if (!Array.isArray(rowId) || rowId.length === 0) {
      return res.status(400).send("Invalid or no IDs provided");
    }
    const result = await CsvData.deleteMany({
      _id: { $in: rowId },
    });
    if (result.deletedCount === 0) {
      return res.status(404).send("No row found to delete");
    }
    return res
      .status(200)
      .send(`${result.deletedCount} csv data deleted successfully`);
  } catch (error) {
    console.error("Error deleting csv data:", error);
    res.status(500).send("Error deleting csv data");
  }
};

const updateRow = async (req, res) => {
  try {
    const data = req.body;
    let yearInfo = req.body.year;
    yearInfo = yearInfo.split("-");
    const updatedRow = await CsvData.findByIdAndUpdate(
      data._id,
      {
        $set: {
          manufacturer: data.manufacturer ? data.manufacturer.trim() : "",
          year: getYearsInRange(yearInfo[0], yearInfo[1]),
          model: data.model ? data.model.trim() : "",
          subModel: data.subModel ? data.subModel.trim() : "",
          engine: data.engine ? data.engine.trim() : "",
          bhp: data.bhp ? data.bhp.trim() : "",
          body: data.body ? data.body.trim() : "",
          startEndDate: data.startEndDate ? data.startEndDate.split(',').map(code => code.trim()) : [],
          engineCode: data.engineCode ? data.engineCode.split(',').map(code => code.trim()) : [],
          v8_Transmission_Gears: data.v8_Transmission_Gears ? data.v8_Transmission_Gears.split(',').map(code => code.trim()) : [],
          partNo: data.partNo ? data.partNo.trim() : "",
          suspension_A: data.suspension_A ? data.suspension_A.trim() : "",
          transmissionType_A: data.transmissionType_A
            ? data.transmissionType_A.trim()
            : "",
          type_A: data.type_A ? data.type_A.trim() : "",
          vehicleEquipment_A: data.vehicleEquipment_A
            ? data.vehicleEquipment_A.trim()
            : "",
          chassisNumberFrom_A: data.chassisNumberFrom_A
            ? data.chassisNumberFrom_A.trim()
            : "",
        },
      },
      { new: true, runValidators: true }
    );
    if (!updatedRow) {
      return res.status(404).send("row not found");
    }

    res.status(200).send("row data updated successfully");
  } catch (error) {
    console.error("Error in row data:", error);
    res.status(500).send("Error updating row data");
  }
};

const addRow = async (req, res) => {
  const data = req.body;
  try {
    let yearInfo = req.body.year;
    yearInfo = yearInfo.split("-");
    const newRow = new CsvData({
      manufacturer: data.manufacturer ? data.manufacturer.trim() : "",
      year: getYearsInRange(yearInfo[0], yearInfo[1]),
      model: data.model ? data.model.trim() : "",
      subModel: data.subModel ? data.subModel.trim() : "",
      engine: data.engine ? data.engine.trim() : "",
      bhp: data.bhp ? data.bhp.trim() : "",
      body: data.body ? data.body.trim() : "",
      startEndDate: data.startEndDate ? data.startEndDate.trim() : "",
      engineCode: data.engineCode ? data.engineCode.trim() : "",
      v8_Transmission_Gears: data.v8_Transmission_Gears
        ? data.v8_Transmission_Gears.trim()
        : "",
      partNo: data.partNo ? data.partNo.trim() : "",
      suspension_A: data.suspension_A ? data.suspension_A.trim() : "",
      transmissionType_A: data.transmissionType_A
        ? data.transmissionType_A.trim()
        : "",
      type_A: data.type_A ? data.type_A.trim() : "",
      vehicleEquipment_A: data.vehicleEquipment_A
        ? data.vehicleEquipment_A.trim()
        : "",
      chassisNumberFrom_A: data.chassisNumberFrom_A
        ? data.chassisNumberFrom_A.trim()
        : "",
    });

    await newRow.save();
    return res.status(201).send("new row added");
  } catch (error) {
    console.log("error in adding new row data", error);
    return res.status(500).send("error in adding new row data");
  }
};

const productWebhook = (req, res) => {
  try {
    const productData = req.body;
    // console.log("Product update received:");
    updateProductInDatabase(productData);

    res.status(200).send("Message received");
  } catch (error) {
    console.error("Error handling product webhook:", error);
    res.status(500).send("Failed to process webhook");
  }
};

async function updateProductInDatabase(productData) {
  try {
    // Assuming a MongoDB database with Mongoose
    await Product.findOneAndUpdate(
      { productId: productData.id },
      {
        title: productData?.title ?? "Unknown Title",
        handle: productData?.handle ?? "Unknown Handle",
        image_src: productData?.image?.src ?? "",
        images: productData?.images ?? [],
        tags: productData?.tags ?? [],
        variants:
          productData?.variants?.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            image_id: variant.image_id,
            inventory_quantity: variant.inventory_quantity ?? 0,
            inventory_policy: variant.inventory_policy ?? "deny",
          })) ?? [],
      },
      { upsert: true, new: true }
    );
    console.log(`Product ${productData.title} updated successfully.`);
  } catch (error) {
    console.error("Database update failed for product:", error);
  }
}

const addCategory = async (req, res) => {
  try {
    const existingCategory = await filterData.findOne({ name: req.body.name });
    if (existingCategory) {
      return res.status(409).send("category already exists.");
    }
    const newCategory = new filterData({
      name: req.body.name,
    });
    await newCategory.save();
    res.status(200).send("category saved successfully");
  } catch (error) {
    res.status(500).send("error in creating category", error);
  }
};

const updateCategory = async (req, res) => {
  try {
    // Check if image is uploaded
    const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;
    const option = {
      subCategory: req.body.subCategory,
      labelBg: req.body.labelBg,
      labelText: req.body.labelText,
      labelImage: imagePath,
    };
    // findOneAndUpdate takes a filter object, update object, and options
    const existingCategory = await filterData.findOneAndUpdate(
      { name: req.body.category },
      { $addToSet: { options: option } },
      { new: true, runValidators: true }
    );

    if (!existingCategory) {
      return res.status(404).send("Category not found.");
    }
    res.status(200).send("Category updated successfully");
  } catch (error) {
    // Use JSON to send error details
    res.status(500).json({
      message: "Error in updating category",
      error: error.message,
    });
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;
    const query = { "options.subCategory": req.body.oldSubCategory };
    let update = {
      $set: {
        "options.$.subCategory": req.body.subCategory,
        "options.$.labelBg": req.body.labelBg,
        "options.$.labelText": req.body.labelText,
      },
    };

    if (imagePath) {
      update.$set["options.$.labelImage"] = imagePath;
    } else if (req.body.labelImage === "removeImage") {
      update.$set["options.$.labelImage"] = null;
    }
    const data = await filterData.findOneAndUpdate(query, update, {
      new: true,
    });
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({
      message: "Error in updating category",
      error: error.message,
    });
  }
};

const arrangeOrderSubCat = async (req, res) => {
  try {
    const category = await filterData.findOneAndUpdate(
      { name: req.body.name },
      { $set: { options: req.body.options } }
    );
    res.status(200).send("subCategory re-arranged");
  } catch (error) {
    res.status(500).send("error in arranging subCategory");
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await filterData.find();
    if (!categories) {
      res.status(404).send("no category found");
    }
    res.status(200).send(categories);
  } catch (error) {
    res.status(500).send("error in getting filter categories");
  }
};

const deleteSubCategory = async (req, res) => {
  try {
    const { category, subCategory } = req.body;

    // Use findOneAndUpdate with $pull to remove the option
    const updatedCategory = await filterData.findOneAndUpdate(
      { name: category },
      { $pull: { options: { subCategory: subCategory } } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).send("Category not found or option not found.");
    }

    res.status(200).send("Option deleted successfully from the category.");
  } catch (error) {
    res.status(500).json({
      message: "Error deleting option from category",
      error: error.message,
    });
  }
};

const removeAllDuplicates = async (req, res) => {
  try {
    // Step 1: Identify duplicates
    const duplicates = await CsvData.aggregate(
      [
        {
          $group: {
            _id: {
              manufacturer: "$manufacturer",
              year: "$year",
              model: "$model",
              subModel: "$subModel",
              engine: "$engine",
              bhp: "$bhp",
              body:"$body",
              startEndDate :"$startEndDate",
              engineCode: "$engineCode",
              v8_Transmission_Gears: "$v8_Transmission_Gears",
              partNo:"$partNo",
              suspension_A:"$suspension_A",
              transmissionType_A:"$transmissionType_A",
              type_A:"$type_A",
              vehicleEquipment_A:"$vehicleEquipment_A",
              chassisNumberFrom_A:"$chassisNumberFrom_A"
            },
            docIds: { $addToSet: "$_id" },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 }, // filters groups having more than one document
          },
        },
      ],
      { allowDiskUse: true }
    );

    // Step 2: Remove duplicates
    let countRemoved = 0;
    for (let duplicate of duplicates) {
      // Keep the first document and remove the rest
      const idsToRemove = duplicate.docIds.slice(1); // Skip the first element to keep
      await CsvData.deleteMany({ _id: { $in: idsToRemove } });
      countRemoved += idsToRemove.length;
    }

    res.status(200).send(`${countRemoved} Duplicates Entries Removed.`);
  } catch (error) {
    res.status(500).send("Error removing duplicates: " + error.message);
  }
};

const getInventoryHistory = async (req, res) => {
  try {
    const response = await inventoryUpdateHistory
      .find({ endTimeStore: { $ne: null } })
      .sort({ endTimeStore: -1 })
      .limit(10);
    res.status(200).send(response);
  } catch (error) {
    res.status(500).send("error in getting inventory history");
  }
};

const updateInventory = async (req, res) => {
  try {
    performUpdateInventory();
    res.status(202).send("process started");
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
};

const updateSortingTags = async (req, res) => {
  try {
    const data = req.body.sortingTags;
    await SortTags.updateOne({}, { $set: { sortTag: data } }, { upsert: true });
    res.status(200).send("sorting tags updated");
  } catch (error) {
    res.status(500).send("error in updating sorting tags");
  }
};

const getSortingTags = async (req, res) => {
  try {
    const response = await SortTags.find();
    res.status(200).send(response);
  } catch (error) {
    res.status(500).send("error in getting sorting tags");
  }
};

const flushData = async (req, res) => {
  try {
    await redisClient.flushAll();
    console.log("Flushed entire Redis DB(s)");
    return res.status(200).send("All Cache Cleared");
  } catch (error) {
    console.error("Error flushing Redis:", error);
    return res.status(500).send("Failed to clear cache");
  }
};

module.exports = {
  validateUser,
  userLogin,
  userRegister,
  logoutUser,
  updatePassword,
  getUsers,
  syncProductFromShopify,
  deleteProductFromDb,
  uploadCsvData,
  deleteCsvData,
  getCsvData,
  getCsvDataManufacturer,
  getCsvDataModels,
  getCsvDataSubModels,
  getCsvDataYears,
  getCsvDataEngine,
  getCsvDataBody,
  getCsvDataSkus,
  getProductsBySkus,
  deleteMultipleRows,
  updateRow,
  addRow,
  progress,
  updateUser,
  deleteUser,
  productWebhook,
  addCategory,
  getCategories,
  updateCategory,
  updateSubCategory,
  arrangeOrderSubCat,
  deleteSubCategory,
  removeAllDuplicates,
  updateInventory,
  getInventoryHistory,
  updateSortingTags,
  getSortingTags,
  flushData,
};
