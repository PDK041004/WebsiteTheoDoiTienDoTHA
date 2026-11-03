# Website theo dõi tiến độ thi hành án

Hệ thống quản lý hồ sơ thi hành án dân sự với 3 nhóm người dùng: **người dân**, **công chức** và **chấp hành viên**.

Tài liệu này tóm tắt các thay đổi trong đợt cập nhật gần nhất.

---

## Tổng quan thay đổi

- Phần hồ sơ đã **chuyển hẳn từ MySQL sang MongoDB**. Các route hồ sơ cũ viết cho MySQL trong `server.js` đã bị gỡ, vì sau khi bỏ kết nối MySQL chúng báo lỗi `database is not defined`.
- Người dân gửi hồ sơ **kèm file bản án**.
- Công chức có các chức năng: **xác nhận hồ sơ**, **phân công xử lý** (giới hạn 200 hồ sơ/chấp hành viên) và **quản lý phòng ban**.
- Chấp hành viên nhận **thông báo** khi được phân công và **xác minh đã nhận hồ sơ**.

### Luồng xử lý hồ sơ

```
Người dân gửi hồ sơ + bản án
        │
        ▼
  [Chờ xác nhận] ──(công chức: yêu cầu bổ sung)──▶ [Cần bổ sung]
        ▲                                              │
        └────────────(người dân gửi bổ sung)───────────┘
        │
   (công chức: xác nhận đủ điều kiện)
        ▼
  [Đã xác nhận]
        │
   (công chức: phân công) ──▶ gửi thông báo cho chấp hành viên
        ▼
  [Đã phân công]
        │
   (chấp hành viên: xác minh đã nhận hồ sơ)
        ▼
  [Đang xử lý] ──▶ hiện ở "Hồ sơ được phân công" và "Cập nhật tiến độ"
```

Mỗi lần đổi trạng thái đều được ghi vào **lịch sử hồ sơ** (`lichsu`), kèm thời gian và ghi chú.

---

## Cài đặt và chạy

1. Cài thư viện. Đợt này có thêm thư viện **`multer`** để nhận file upload.
   ```
   npm install
   ```
2. Tạo file `.env` ở thư mục gốc:
   ```
   MONGODB_URI = '<chuỗi kết nối MongoDB>'
   ```
   Database được dùng là `CSDL-THA`. Nếu dùng MongoDB Atlas, cần thêm IP máy của bạn vào **Network Access**.
3. Chạy server:
   ```
   npm run dev
   ```
   Sau đó mở http://localhost:3000/homepage

File bản án được lưu trong thư mục `uploads/banan/`. Thư mục này được tạo tự động và đã có trong `.gitignore`.

---

## Chức năng theo từng trang

### Người dân (`views/nguoidan.html`)

- **Đăng ký hồ sơ:** nhập họ tên, CCCD, nội dung và loại hồ sơ, rồi **đính kèm bản án** (PDF/JPG/PNG, tối đa 5 file, mỗi file ≤ 10MB). Gửi xong sẽ nhận được **mã hồ sơ**.
  - Đã sửa lỗi: form gọi hàm `sendHoSo` nhưng hàm lại tên `sendHoso`, nên trước đây form không gửi được.
- **Tra cứu hồ sơ:** nhập CCCD để xem danh sách hồ sơ, trạng thái và phản hồi từ cơ quan thi hành án.
  - Nếu hồ sơ ở trạng thái **Cần bổ sung**, trang hiện nội dung còn thiếu và nút **Bổ sung** để gửi thêm file hoặc ghi chú.
- CCCD bắt buộc **12 chữ số**. Trình duyệt và server đều kiểm tra.

### Công chức (`views/congchuc.html`)

- **Quản lý phòng ban** (thay cho mục "Quản lý hồ sơ" cũ dùng dữ liệu cứng):
  - Thêm, sửa, xóa phòng ban (mã, tên, mô tả). Mã phòng không được trùng.
  - Không xóa được phòng còn nhân viên.
  - Thêm hoặc gỡ nhân viên (chấp hành viên `role = 1`, công chức `role = 2`). Mỗi người thuộc tối đa 1 phòng; thêm người đang ở phòng khác thì người đó được chuyển sang phòng mới.
  - **Chọn trưởng phòng.** Trưởng phòng phải là nhân viên của phòng đó, và tự bị bỏ chức danh khi rời phòng.
- **Xác nhận hồ sơ:**
  - Danh sách hồ sơ chờ xác nhận. Hồ sơ người dân đã bổ sung có nhãn "Đã bổ sung".
  - **Xem bản án** ngay trong trang (PDF/ảnh), cùng thông tin người gửi và lịch sử hồ sơ.
  - **Xác nhận đủ điều kiện**: hồ sơ chuyển sang mục Phân công.
  - **Yêu cầu bổ sung**: bắt buộc nhập nội dung còn thiếu; nội dung này hiện cho người dân khi tra cứu.
- **Phân công xử lý:**
  - Chỉ hiện hồ sơ **đã được xác nhận** và chưa phân công.
  - Có thể **lọc chấp hành viên theo phòng ban**.
  - Mỗi chấp hành viên hiện số hồ sơ đang xử lý trên giới hạn, ví dụ `150/200`, kèm thanh tiến độ. Người đã đủ 200 thì không chọn được.
  - **Giới hạn 200 hồ sơ/chấp hành viên** được kiểm tra cả ở giao diện lẫn server. Hồ sơ "Hoàn thành" hoặc "Đã hủy" không tính vào giới hạn.
  - Khi phân công, hệ thống tự gửi thông báo cho chấp hành viên.

### Chấp hành viên (`views/chaphanhvien.html`)

- **Thông báo:** mỗi hồ sơ được phân công tạo một thông báo **"Bản án cần xử lý"**.
  - Menu có số thông báo chưa xem. Trang tự kiểm tra thông báo mới mỗi 30 giây và hiện thông báo nhỏ ở góc màn hình.
  - Bấm vào thông báo thì chuyển sang mục **Xác minh** và mở đúng hồ sơ đó.
- **Xác minh:** xem thông tin hồ sơ và bản án, nhập ghi chú (không bắt buộc), rồi bấm **Xác nhận đã nhận hồ sơ**. Hồ sơ chuyển sang "Đang xử lý".
- **Hồ sơ được phân công / Cập nhật tiến độ:** dùng dữ liệu thật, chỉ hiện hồ sơ đã xác minh nhận.
- Các ô thống kê đầu trang dùng số liệu thật: Tổng hồ sơ / Chờ xác minh / Đang xử lý / Hoàn thành.
- Đã sửa lỗi bố cục: mục Thông báo trước đây nằm ngoài khung nội dung.

---

## API mới

### Hồ sơ – `/hoso`

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/hoso` | Tất cả hồ sơ |
| POST | `/hoso` | Người dân gửi hồ sơ (multipart, file ở field `banan`) |
| GET | `/hoso/tra-cuu?cccd=` | Tra cứu hồ sơ theo CCCD |
| GET | `/hoso/cho-xac-nhan` | Hồ sơ chờ công chức xác nhận |
| PUT | `/hoso/:id/xac-nhan` | Xác nhận hồ sơ đủ điều kiện |
| PUT | `/hoso/:id/yeu-cau-bo-sung` | Yêu cầu bổ sung (`{ phanhoi }`) |
| PUT | `/hoso/:id/bo-sung` | Người dân gửi bổ sung (multipart: `cccd`, `ghichu`, `banan`) |
| GET | `/hoso/chua-phan-cong` | Hồ sơ đã xác nhận, chưa phân công |
| PUT | `/hoso/phan-cong` | Phân công (`{ hosoIds, officerId }`) |
| GET | `/hoso/cua-toi?officerId=` | Hồ sơ của một chấp hành viên |
| PUT | `/hoso/:id/nhan-ho-so` | Chấp hành viên xác minh đã nhận (`{ officerId, ghichu }`) |

### Chấp hành viên – `/enforcers`

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/enforcers` | Danh sách chấp hành viên, kèm phòng ban và số hồ sơ đang xử lý |

### Phòng ban – `/phongban`

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/phongban` | Danh sách phòng ban kèm nhân viên |
| POST | `/phongban` | Thêm phòng ban (`{ maphong, tenphong, mota }`) |
| PUT | `/phongban/:id` | Sửa phòng ban |
| DELETE | `/phongban/:id` | Xóa phòng ban (chỉ khi không còn nhân viên) |
| GET | `/phongban/nhan-vien` | Chấp hành viên / công chức có thể xếp phòng |
| POST | `/phongban/:id/nhan-vien` | Thêm nhân viên (`{ accountId }`) |
| DELETE | `/phongban/:id/nhan-vien/:accountId` | Gỡ nhân viên |
| PUT | `/phongban/:id/truong-phong` | Chọn trưởng phòng (`{ accountId }`, gửi `null` để bỏ) |

### Thông báo – `/thongbao`

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/thongbao?nguoinhan=` | Thông báo của một người (50 thông báo mới nhất) |
| PUT | `/thongbao/:id/da-xem` | Đánh dấu đã xem (`{ nguoinhan }`) |

Các API trả về JSON dạng `{ code, message }`, với thông báo bằng tiếng Việt.

---

## Dữ liệu (MongoDB)

| Collection | Model | Ghi chú |
|---|---|---|
| `hosos` | `models/HoSo.js` | **Mới.** Hồ sơ, file bản án (`files`), phản hồi (`phanhoi`), lịch sử (`lichsu`), chấp hành viên được giao (`assignedTo`) |
| `phongbans` | `models/PhongBan.js` | **Mới.** Phòng ban và trưởng phòng (`truongphong`) |
| `thongbaos` | `models/ThongBao.js` | **Mới.** Thông báo gửi cho từng tài khoản |
| `accounts` | `models/Account.js` | Thêm các trường `fullname`, `phone`, `phongban` |

Quy ước `role` của tài khoản: `0` người dân, `1` chấp hành viên, `2` công chức, `3` quản trị.

Trạng thái hồ sơ được khai báo tập trung trong `HoSo.TRANG_THAI` (`models/HoSo.js`). Giới hạn 200 hồ sơ là hằng số `MAX_HOSO_PER_ENFORCER` trong `controllers/enforcersController.js`.

---

## Danh sách file

**Mới:**
```
configs/upload.js                   Cấu hình nhận file bản án (multer)
models/HoSo.js
models/PhongBan.js
models/ThongBao.js
controllers/hosoController.js
controllers/phongbanController.js
controllers/thongbaoController.js
routes/api/hoso.js
routes/api/enforcers.js
routes/api/phongban.js
routes/api/thongbao.js
```

**Cập nhật:**
```
server.js                           Gỡ route hồ sơ MySQL, gắn các route mới, phục vụ /uploads
models/Account.js
controllers/enforcersController.js
views/nguoidan.html
views/congchuc.html
views/chaphanhvien.html
package.json                        Thêm multer
.gitignore                          Thêm uploads/
```

---

## Hạn chế hiện tại

- **Chưa có phân quyền ở API:** ai biết đường dẫn đều gọi được, và file bản án trong `/uploads` mở được nếu có link (tên file được đặt ngẫu nhiên). Ai biết CCCD của người khác cũng tra cứu được hồ sơ của họ.
- Nút **Lưu** trong "Cập nhật nội dung hồ sơ" và "Cập nhật tiến độ" của chấp hành viên **chưa hoạt động**.
- Tab **Xem tiến độ** của người dân vẫn là dữ liệu mẫu, dù dữ liệu lịch sử hồ sơ đã có sẵn.
- Trang **quản lý tài khoản** (`views/taikhoan.html`) vẫn gọi các route `/users` viết cho MySQL, nên chưa hoạt động.
- Nếu hai công chức cùng phân công cho một chấp hành viên vào đúng một thời điểm, số hồ sơ có thể vượt 200 một chút.
- File `database.js` ở thư mục gốc là phần MySQL cũ, không còn được dùng.
