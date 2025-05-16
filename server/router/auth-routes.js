const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Controler = require('../controllers/auth-controllers');
const authenticate = require('../middlewares/authenticate');
const { invEventController } = require('../services/inventoryEvent');

// Ensure upload directories exist
const ensureDirectoryExistence = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Set up multer storage for images
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'images');
        ensureDirectoryExistence(uploadDir); // Ensure the directory exists
        cb(null, uploadDir); // Set destination to 'uploads/images'
    },
    filename: (req, file, cb) => {
        const newFileName = `${Date.now()}_${file.originalname}`;
        cb(null, newFileName); // Set the filename with timestamp and original name
    },
});

// Set up multer storage for CSV files
const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'csv');
        ensureDirectoryExistence(uploadDir); // Ensure the directory exists
        cb(null, uploadDir); // Set destination to 'uploads/csv'
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Keep the original file name for CSV
    },
});

// Filter for image files
const imageFileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Allowed image file types
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
        return cb(null, true); // Accept image file
    } else {
        cb(new Error('Only image files are allowed'), false); // Reject non-image file
    }
};

// Filter for CSV files
const csvFileFilter = (req, file, cb) => {
    const filetypes = /csv/; // Allowed CSV file types
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype) {
        return cb(null, true); // Accept CSV file
    } else {
        cb(new Error('Only CSV files are allowed'), false); // Reject non-CSV file
    }
};

// Set up multer with image configurations
const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
});

// Set up multer with CSV configurations
const uploadCsv = multer({
    storage: csvStorage,
    fileFilter: csvFileFilter,
});

router.post('/user-register', Controler.userRegister);
router.post('/user-login', Controler.userLogin);
router.get('/validate-user', authenticate, Controler.validateUser);
router.post('/logout', authenticate, Controler.logoutUser);
router.put('/change-password', authenticate, Controler.updatePassword);
router.get('/get-users', authenticate, Controler.getUsers)
router.put('/update-user', authenticate, Controler.updateUser)
router.post('/delete-user', authenticate, Controler.deleteUser)

router.post('/upload-csv', uploadCsv.single('csvFile'), Controler.uploadCsvData);
router.post('/delete-csv', Controler.deleteCsvData);
router.delete('/delete-rows', Controler.deleteMultipleRows);
router.put('/update-row', Controler.updateRow);
router.post('/add-row', Controler.addRow);
router.delete('/remove-duplicateCsv', Controler.removeAllDuplicates);

router.get('/csv-data', Controler.getCsvData);
router.get('/csv-data-manufacturer', Controler.getCsvDataManufacturer);
router.get('/csv-data-years', Controler.getCsvDataYears);
router.get('/csv-data-models', Controler.getCsvDataModels);
router.get('/csv-data-sub-models', Controler.getCsvDataSubModels);
router.get('/csv-data-engine', Controler.getCsvDataEngine);
router.get('/csv-data-body', Controler.getCsvDataBody);
router.get('/csv-data-skus', Controler.getCsvDataSkus);
router.post('/get-products-by-skus', Controler.getProductsBySkus);

router.post('/sync-products', Controler.syncProductFromShopify);
router.post('/delete-products', Controler.deleteProductFromDb);
router.post('/product-update-notify', Controler.productWebhook)

router.get('/upload/progress', Controler.progress);

router.post('/add-category', Controler.addCategory);
router.get('/get-category', Controler.getCategories);
router.put('/update-category', uploadImage.single('labelImage'), Controler.updateCategory);
router.put('/update-subcategory', uploadImage.single('labelImage'), Controler.updateSubCategory);
router.put('/update-subcategory-order', Controler.arrangeOrderSubCat);
router.delete('/delete-subCategory', Controler.deleteSubCategory);
router.put('/update-sorting-tags',Controler.updateSortingTags);
router.get('/sorting-tags',Controler.getSortingTags)

router.get('/fresh-inventory', Controler.updateInventory);
router.get('/get-inventory-history',Controler.getInventoryHistory);
router.get('/inventory-events', invEventController);

router.delete('/flush-all',Controler.flushData);

module.exports = router;