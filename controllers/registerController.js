const path = require("path");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const Account = require(path.join(__dirname, "..", "models", "Account"));
const PendingRegistration = require(path.join(__dirname, "..", "models", "PendingRegistration"));

const PHONE_REGEX = /^0\d{9}$/;
const CCCD_REGEX = /^\d{12}$/;
const USERNAME_REGEX = /^[A-Za-z0-9_.]{4,30}$/;
const MIN_AGE = 18;
const OTP_TTL_MS = 5 * 60 * 1000;   // OTP sống 5 phút
const RESEND_MS = 30 * 1000;        // gửi lại tối thiểu cách 30 giây
const MAX_ATTEMPTS = 5;

// "YYYY-MM-DD" -> Date (giờ địa phương); null nếu sai định dạng hoặc ngày không có thật
const parseNgaySinh = (value) => {
   const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
   if (!m) return null;
   const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
   const date = new Date(y, mo - 1, d);
   if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
   return date;
};

// Tuổi tính theo ngày sinh: chưa tới sinh nhật năm nay thì trừ 1
const tinhTuoi = (birth) => {
   const now = new Date();
   let age = now.getFullYear() - birth.getFullYear();
   const m = now.getMonth() - birth.getMonth();
   if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
   return age;
};

// Trả về câu báo lỗi nếu trùng, null nếu hợp lệ
const kiemTraTrung = async ({ userName, phoneNumber, cccd }) => {
   if (await Account.findOne({ userName }).exec()) return "Tên đăng nhập đã tồn tại.";
   if (await Account.findOne({ phoneNumber }).exec()) return "Số điện thoại này đã được sử dụng.";
   if (await Account.findOne({ cccd }).exec()) return "CCCD này đã được đăng ký tài khoản.";
   return null;
};

/* ================== Bước 1: kiểm tra thông tin và gửi OTP ================== */
const sendRegisterOTP = async (req, res) => {
   const fullname = String(req.body.fullname || "").trim();
   const phoneNumber = String(req.body.phoneNumber || "").trim();
   const cccd = String(req.body.cccd || "").trim();
   const userName = String(req.body.userName || "").trim();
   const diachi = String(req.body.diachi || "").trim();
   const password = String(req.body.password || "");
   const ngaysinh = parseNgaySinh(req.body.ngaysinh);

   if (!fullname || !diachi) return res.status(400).json({ message: "Vui lòng nhập đủ họ tên và địa chỉ." });
   if (!PHONE_REGEX.test(phoneNumber)) return res.status(400).json({ message: "Số điện thoại phải gồm 10 số và bắt đầu bằng 0." });
   if (!CCCD_REGEX.test(cccd)) return res.status(400).json({ message: "CCCD phải gồm đúng 12 chữ số." });
   if (!USERNAME_REGEX.test(userName)) return res.status(400).json({ message: "Tên đăng nhập gồm 4-30 ký tự: chữ, số, dấu _ hoặc dấu chấm." });
   if (!password) return res.status(400).json({ message: "Vui lòng nhập mật khẩu." });
   if (!ngaysinh) return res.status(400).json({ message: "Ngày sinh không hợp lệ." });

   const tuoi = tinhTuoi(ngaysinh);
   if (tuoi < MIN_AGE) return res.status(400).json({ message: "Chỉ người từ đủ 18 tuổi trở lên mới được đăng ký tài khoản." });
   if (tuoi > 120) return res.status(400).json({ message: "Ngày sinh không hợp lệ." });

   try {
      const trung = await kiemTraTrung({ userName, phoneNumber, cccd });
      if (trung) return res.status(409).json({ message: trung });

      // Chặn gửi OTP liên tục cho cùng tên đăng nhập hoặc cùng số điện thoại
      const recent = await PendingRegistration.findOne({
         $or: [{ userName }, { phoneNumber }],
         otpSentAt: { $gt: new Date(Date.now() - RESEND_MS) }
      }).exec();
      if (recent) return res.status(429).json({ message: "Vui lòng đợi ít giây trước khi gửi lại mã OTP." });

      const otp = otpGenerator.generate(6, {
         digits: true,
         upperCaseAlphabets: false,
         lowerCaseAlphabets: false,
         specialChars: false
      });

      await PendingRegistration.findOneAndUpdate(
         { userName },
         {
            userName, phoneNumber, fullname, cccd, diachi, ngaysinh,
            password: await bcrypt.hash(password, 10),
            otp: await bcrypt.hash(otp, 10),
            otpAttempts: 0,
            otpSentAt: new Date(),
            expiresAt: new Date(Date.now() + OTP_TTL_MS)
         },
         { upsert: true, setDefaultsOnInsert: true }
      );

      // Chưa có dịch vụ SMS thật: in OTP ra terminal giống bước đăng nhập
      console.log(`Registration OTP for "${userName}" (${phoneNumber}): ${otp}`);

      return res.status(200).json({
         message: `Mã OTP đã được gửi tới số điện thoại (*******${phoneNumber.slice(-3)}).`,
         requireOTP: true
      });
   } catch (error) {
      return res.status(500).json({ message: error.message });
   }
};

/* ================== Bước 2: xác nhận OTP rồi mới tạo tài khoản ================== */
const verifyRegisterOTP = async (req, res) => {
   const userName = String(req.body.userName || "").trim();
   const otp = String(req.body.otp || "").trim();
   if (!userName || !otp) return res.status(400).json({ message: "Thiếu tên đăng nhập hoặc mã OTP." });

   try {
      const pending = await PendingRegistration.findOne({ userName }).exec();
      if (!pending) {
         return res.status(401).json({ message: "Không có yêu cầu đăng ký nào đang chờ xác thực hoặc mã đã hết hạn. Vui lòng đăng ký lại." });
      }
      if (pending.expiresAt < new Date()) {
         await pending.deleteOne();
         return res.status(401).json({ message: "Mã OTP đã hết hạn. Vui lòng bấm Đăng ký để nhận mã mới." });
      }
      if (pending.otpAttempts >= MAX_ATTEMPTS) {
         await pending.deleteOne();
         return res.status(429).json({ message: "Nhập sai quá nhiều lần. Vui lòng đăng ký lại." });
      }

      const match = await bcrypt.compare(otp, pending.otp);
      if (!match) {
         pending.otpAttempts += 1;
         await pending.save();
         return res.status(401).json({ message: "Mã OTP không đúng." });
      }

      // Kiểm tra trùng lần nữa: có thể người khác đã đăng ký xong trong lúc chờ OTP
      const trung = await kiemTraTrung(pending);
      if (trung) {
         await pending.deleteOne();
         return res.status(409).json({ message: trung });
      }

      await Account.create({
         userName: pending.userName,
         phoneNumber: pending.phoneNumber,
         password: pending.password,   // đã băm ở bước 1
         fullname: pending.fullname,
         cccd: pending.cccd,
         diachi: pending.diachi,
         ngaysinh: pending.ngaysinh,
         role: 0                       // đăng ký công khai luôn là người dân
      });
      await pending.deleteOne();

      return res.status(201).json({ message: "Đăng ký thành công! Bạn có thể đăng nhập." });
   } catch (error) {
      return res.status(500).json({ message: error.message });
   }
};

module.exports = { sendRegisterOTP, verifyRegisterOTP }; 