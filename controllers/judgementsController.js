const path = require("path");
const Judgement = require(path.join(__dirname, "..", "models", "Judgement"));

/* ================== Truy vấn bản án ================== */
//Toàn bộ
const getAllJudgements = async (req, res) => {
   const judgements = await Judgement.find().exec();
   if(!judgements) res.status(200).json({ message: "No judgement was found."});
   res.status(200).json({ judgements });
}

const getJudgement = async (req, res) => {
   const { designation } = req.body;
   if(!designation) return res.status(400).json({ message: "Designation number is required." });

   const judgement = await Judgement.findOne({ designation }).exec();
   if(!judgement) res.status(200).json({ message: "No judgement was found."});
   res.status(200).json({ judgement });
}

const registerJudgement = async (req, res) => {
   const { designation, classification, documents} = req.body;
   if(!designation || ! classification || !documents) {
      return res.status(400).json ({ message: "Designation number, classification and documents are required." }); }

   const duplicate = await Judgement.findOne({ designation }).exec();
   if(duplicate) { return res.status(409).json({ message: "This judgement already exist." }); }

   try {
      const newJudgement = await Judgement.create({
         "designation": designation,
         "classification": classification,
         "documents": documents,
      });

      console.log(newJudgement);

      return res.status(201).json({
         message: `Judgement number ${designation} registered successfully!`,
         judgement: newJudgement
      });
   } catch(err) {
      res.status(500).json({
         message: err.message
      });
   }
}

const updateJudgement = async (req, res) => {
   const { designation, newDesignation, newClassification, newDocuments, newPhase } = req.body;
   if(!designation || !newDesignation || !newClassification || !newDocuments) {
      return res.status(400).json ({ message: "All fields are required." }); }

   const judgement = await Judgement.findOne({ designation }).exec();
   if(!judgement) { return res.status(404).json({ message: "This judgement cannot be found." }); }

   judgement.designation = newDesignation;
   judgement.classification = newClassification;
   judgement.documents = newDocuments;
   judgement.phase = newPhase;

   const result = await judgement.save();

   console.log(result);

   return res.status(204).json({
      message: "Light wieght!",
      judgement: judgement
   });
}

module.exports = {
   getAllJudgements,
   getJudgement,
   registerJudgement,
   updateJudgement
}