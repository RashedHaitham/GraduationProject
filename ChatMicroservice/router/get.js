const express = require('express')
const viewController = require('../controller/view') // Import view controller

const router = express.Router() // Create Express.js router

// GET requests
router.get('/', viewController.homePage)

module.exports = router
