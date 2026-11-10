# Website theo dõi tiến độ thi hành án

Hệ thống quản lý hồ sơ thi hành án dân sự với 3 nhóm người dùng: **người dân**, **công chức** và **chấp hành viên**.

Tài liệu này tóm tắt các thay đổi trong đợt cập nhật gần nhất.

---

## Tổng quan thay đổi

- Phần hồ sơ đã **chuyển hẳn từ MySQL sang MongoDB**. Các route hồ sơ cũ viết cho MySQL trong `server.js` đã bị gỡ, vì sau khi bỏ kết nối MySQL chúng báo lỗi `database is not defined`.
- Người dân gửi hồ sơ **kèm file bản án**.
- Công chức có các chức năng: **xác nhận hồ sơ**, **phân công xử lý** (giới hạn 200 hồ sơ/chấp hành viên) và **quản lý phòng ban**.
- Chấp hành viên nhận **thông báo** khi được phân công và **xác minh đã nhận hồ sơ**.
- **Đợt 2:**
  - Chấp hành viên cập nhật **tiến độ thi hành án theo 5 giai đoạn**. Muốn chuyển sang Cưỡng chế phải có căn cứ và điều kiện.
  - Chấp hành viên **cập nhật hồ sơ**: đổi trạng thái, nhập nội dung xử lý và đính kèm tài liệu.
  - Công chức có thêm mục **Báo cáo** (lập phiếu thu phí thi hành án) và mục **Thống kê theo tháng**.

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
  [Đang xử lý] ◀──▶ [Tạm dừng]        (chấp hành viên đổi trong "Cập nhật hồ sơ")
        │
   (tiến độ đã đến giai đoạn Kết thúc, chấp hành viên chuyển trạng thái)
        ▼
  [Hoàn thành] ──▶ công chức lập phiếu thu phí thi hành án
```

Mỗi lần đổi trạng thái đều được ghi vào **lịch sử hồ sơ** (`lichsu`), kèm thời gian và ghi chú.

### Tiến độ thi hành án (khi hồ sơ "Đang xử lý")

```
1. Khởi động → 2. Xác nhận điều kiện → 3. Tự nguyện ─┬─ (tự nguyện thi hành) ──────────→ 5. Kết thúc
                                                      └─ (có vi phạm) → 4. Cưỡng chế ──→ 5. Kết thúc
```

- **Trạng thái** và **tiến độ** được tách riêng:
  - "Cập nhật tiến độ" chỉ đổi **giai đoạn**.
  - "Cập nhật hồ sơ" mới đổi **trạng thái**.
- Khi chấp hành viên xác minh nhận hồ sơ, hồ sơ bắt đầu ở giai đoạn **Khởi động**.
- Giai đoạn phải chuyển đúng thứ tự, không nhảy bước hay quay lui. Server cũng kiểm tra điều này.
- Chuyển sang **Cưỡng chế** bắt buộc:
  - chọn ít nhất một **căn cứ cưỡng chế**;
  - nhập **nội dung điều kiện**.

  Thông tin này được lưu vào trường `cuongche` của hồ sơ.
- Chỉ chuyển trạng thái **Hoàn thành** được khi giai đoạn đã là **Kết thúc**.
- Khi hồ sơ **Tạm dừng** thì không cập nhật tiến độ được.

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
- Khi tra cứu, hồ sơ đang xử lý hoặc tạm dừng có hiện thêm **giai đoạn thi hành án** hiện tại.

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
- **Báo cáo:**
  - Theo dõi tiến độ mọi hồ sơ đã phân công. Tra cứu theo **phòng ban**, **tên chấp hành viên** và **trạng thái**, kèm các ô thống kê nhanh.
  - Nút **Xem** mở chi tiết hồ sơ, gồm:
    - thông tin hồ sơ;
    - bản án và tài liệu của chấp hành viên;
    - thanh 5 giai đoạn;
    - điều kiện cưỡng chế (nếu có);
    - lịch sử tiến độ.
  - **Lập phiếu thu:** chỉ lập được khi hồ sơ đã **Hoàn thành** ở giai đoạn **Kết thúc**, và mỗi hồ sơ chỉ có một phiếu.
    - Công chức nhập số tiền hoặc giá trị tài sản thực nhận. Phí được tính **lũy tiến từng phần** theo biểu phí, và trang hiện chi tiết từng bậc.
    - Biên lai có số tiền bằng chữ, chỗ ký của hai bên và nút **In phiếu thu**.
- **Thống kê theo tháng:**
  - Số bản án hoàn thành trong tháng.
  - Số **bản án treo**: đã phân công nhưng đến cuối tháng chưa hoàn thành. Có hiện riêng số bản án đang tạm dừng.
  - Bảng **giá trị thành tiền của từng bản án** hoàn thành (giá trị thi hành và phí, lấy từ phiếu thu), cùng **tổng của tháng**. Bản án chưa lập phiếu thu được đánh dấu và chưa cộng vào tổng.
  - Danh sách bản án treo kèm số ngày treo.

### Chấp hành viên (`views/chaphanhvien.html`)

- **Thông báo:** mỗi hồ sơ được phân công tạo một thông báo **"Bản án cần xử lý"**.
  - Menu có số thông báo chưa xem. Trang tự kiểm tra thông báo mới mỗi 30 giây và hiện thông báo nhỏ ở góc màn hình.
  - Bấm vào thông báo thì chuyển sang mục **Xác minh** và mở đúng hồ sơ đó.
- **Xác minh:** xem thông tin hồ sơ và bản án, nhập ghi chú (không bắt buộc), rồi bấm **Xác nhận đã nhận hồ sơ**. Hồ sơ chuyển sang "Đang xử lý".
- **Hồ sơ được phân công / Cập nhật tiến độ:** dùng dữ liệu thật, chỉ hiện hồ sơ đã xác minh nhận.
- **Cập nhật hồ sơ:**
  - Nhập **nội dung xử lý**. Nội dung này lưu riêng, không ghi đè yêu cầu của người dân.
  - Đổi **trạng thái** Đang xử lý ↔ Tạm dừng. Chuyển sang Tạm dừng bắt buộc nhập lý do.
  - Chuyển **Hoàn thành** khi tiến độ đã Kết thúc. Sau đó hồ sơ bị khóa.
  - Đính kèm **tài liệu** (kéo thả, nhiều file).
- **Cập nhật tiến độ:**
  - Thanh 5 giai đoạn.
  - Nút **Ghi nhận tiến độ** để ghi chú trong giai đoạn hiện tại, và các nút chuyển sang giai đoạn kế tiếp.
  - Khi chọn Cưỡng chế, trang mở khung nhập **căn cứ** và **nội dung điều kiện**.
  - Bấm Kết thúc thì trang hỏi xác nhận trước.
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
| GET | `/hoso/can-cu-cuong-che` | Danh sách căn cứ cưỡng chế |
| PUT | `/hoso/:id/tien-do` | Cập nhật tiến độ (`{ officerId, giaidoan?, ghichu, cancu? }`). Không gửi `giaidoan` thì chỉ ghi nhận tiến độ |
| PUT | `/hoso/:id/cap-nhat` | Cập nhật hồ sơ (multipart: `officerId`, `trangthai`, `noidungxuly`, `ghichu`, file ở field `banan`) |

### Báo cáo, thống kê, phiếu thu – `/baocao`

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/baocao?phongban=&chv=&trangthai=` | Hồ sơ đã phân công kèm chấp hành viên, phòng ban, phiếu thu. `phongban=none` lọc chấp hành viên chưa có phòng |
| GET | `/baocao/thong-ke?thang=YYYY-MM` | Thống kê tháng: bản án hoàn thành, bản án treo, tổng giá trị và phí |
| GET | `/baocao/bieu-phi` | Biểu phí thi hành án |
| GET | `/baocao/:id/phieu-thu` | Xem phiếu thu của hồ sơ |
| POST | `/baocao/:id/phieu-thu` | Lập phiếu thu (`{ sotienthucnhan, nguoinop, hinhthuc, noidung, accountId }`) |

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
| `phieuthus` | `models/PhieuThu.js` | **Mới (đợt 2).** Phiếu thu phí thi hành án, mỗi hồ sơ một phiếu |

Đợt 2 thêm vào `hosos` các trường:
- `giaidoan`: giai đoạn thi hành án hiện tại.
- `cuongche`: căn cứ, nội dung điều kiện và thời gian chuyển sang cưỡng chế.
- `noidungxuly`: nội dung xử lý của chấp hành viên.
- `tailieu`: tài liệu chấp hành viên đính kèm.

Đợt 2 cũng thêm trạng thái **Tạm dừng**.
| `accounts` | `models/Account.js` | Thêm các trường `fullname`, `phone`, `phongban` |

Quy ước `role` của tài khoản: `0` người dân, `1` chấp hành viên, `2` công chức, `3` quản trị.

Các giá trị được khai báo tập trung, muốn đổi chỉ cần sửa một chỗ:

| Giá trị | Vị trí |
|---|---|
| Trạng thái hồ sơ | `HoSo.TRANG_THAI` trong `models/HoSo.js` |
| Giai đoạn | `HoSo.GIAI_DOAN` trong `models/HoSo.js` |
| Thứ tự chuyển giai đoạn | `HoSo.GIAI_DOAN_TIEP_THEO` trong `models/HoSo.js` |
| Căn cứ cưỡng chế | `HoSo.CAN_CU_CUONG_CHE` trong `models/HoSo.js` |
| Biểu phí | `BIEU_PHI` trong `models/PhieuThu.js` |
| Giới hạn 200 hồ sơ | `MAX_HOSO_PER_ENFORCER` trong `controllers/enforcersController.js` |

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
models/PhieuThu.js                  (đợt 2) Phiếu thu, biểu phí và hàm tính phí
controllers/baocaoController.js     (đợt 2) Báo cáo, thống kê tháng, phiếu thu
routes/api/baocao.js                (đợt 2)
```

**Cập nhật:**
```
server.js                           Gỡ route hồ sơ MySQL, gắn các route mới (gồm /baocao), phục vụ /uploads
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
- **Biểu phí** thi hành án (3% / 2% / 1% / 0,5% theo bậc) được đặt theo Thông tư 216/2016/TT-BTC nhưng **chưa được đối chiếu lại** với văn bản hiện hành. Danh sách **căn cứ cưỡng chế** là bản soạn sẵn. Cần kiểm tra cả hai trước khi dùng thật.
- Người lập phiếu thu lấy từ tài khoản đang đăng nhập, lưu ở `localStorage` của trình duyệt. Trang công chức chưa kiểm tra đăng nhập.
- Tab **Xem tiến độ** của người dân vẫn là dữ liệu mẫu, dù dữ liệu lịch sử hồ sơ đã có sẵn.
- Trang **quản lý tài khoản** (`views/taikhoan.html`) vẫn gọi các route `/users` viết cho MySQL, nên chưa hoạt động.
- Nếu hai công chức cùng phân công cho một chấp hành viên vào đúng một thời điểm, số hồ sơ có thể vượt 200 một chút.
- File `database.js` ở thư mục gốc là phần MySQL cũ, không còn được dùng.
