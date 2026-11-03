const path = require("path");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const HoSo = require(path.join(__dirname, "..", "models", "HoSo"));
require(path.join(__dirname, "..", "models", "PhongBan")); // Đăng ký model để populate phòng ban

const ENFORCER_ROLE = 1;
const MAX_HOSO_PER_ENFORCER = 200;
// Hồ sơ ở các trạng thái này không còn tính vào giới hạn phân công
const FINISHED_STATUSES = ["Hoàn thành", "Đã hủy"];

/* ================== Đếm hồ sơ đang xử lý của từng CHV ================== */
const countActiveHoSo = async (enforcerIds) => {
   const counts = await HoSo.aggregate([
      { $match: { assignedTo: { $in: enforcerIds }, trangthai: { $nin: FINISHED_STATUSES } } },
      { $group: { _id: "$assignedTo", total: { $sum: 1 } } }
   ]);
   return new Map(counts.map(c => [String(c._id), c.total]));
};

/* ================== Danh sách chấp hành viên ================== */
const getAllEnforcers = async (req, res) => {
   try {
      const enforcers = await Account.find({ role: ENFORCER_ROLE })
         .select("userName fullname phone phongban")
         .populate("phongban", "tenphong")
         .lean();
      const counts = await countActiveHoSo(enforcers.map(e => e._id));

      res.status(200).json(enforcers.map(e => ({
         _id: e._id,
         username: e.userName,
         fullname: e.fullname || e.userName,
         phone: e.phone,
         phongban: e.phongban || null,
         assignedCount: counts.get(String(e._id)) || 0,
         limit: MAX_HOSO_PER_ENFORCER
      })));
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

module.exports = {
   ENFORCER_ROLE,
   MAX_HOSO_PER_ENFORCER,
   FINISHED_STATUSES,
   countActiveHoSo,
   getAllEnforcers
};
