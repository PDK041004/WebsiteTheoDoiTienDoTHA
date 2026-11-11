const Bailiffs = require("../models/Bailiff");

const getAllBailiffs = async (req, res) => {
    try {
          
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getAllBailiffs
}