const path = require("path")
const Bailiffs = require(path.join(__dirname, "..", "models", "Enforcer"));

const getAllBailiffs = async (req, res) => {
    try {
          
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getAllBailiffs
}