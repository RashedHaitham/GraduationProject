const express = require('express')
const authController = require('../controller/auth') // Import authentication controller

const router = express.Router()

// POST requests
router.post('/check-user', authController.checkUser)
module.exports = router
