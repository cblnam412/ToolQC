# Sơ Đồ Quản Lý Dự Án (QC Tool) 🚀

Hệ thống cung cấp bộ công cụ đa năng dành riêng cho kỹ sư QC, Tester và Developer. Giúp quản lý dự án, viết Testcase nhanh chóng và theo dõi Log theo thời gian thực (Live Stream).

---

## ⚡ Hướng dẫn cài đặt & Khởi chạy nhanh (No-Code)

Dự án được thiết kế để bất kỳ ai cũng có thể tải về và chạy ngay mà không cần rành về lệnh Terminal.

1. **Tải code về máy** (Clone hoặc Download ZIP).
2. **Chạy hệ thống:** Nháy đúp vào file `start.bat` ở thư mục gốc.
   - *Hệ thống sẽ tự động kiểm tra, cài đặt các thư viện (node_modules) và Build frontend nếu chưa có.*
3. Mở trình duyệt và truy cập: [http://localhost:3001](http://localhost:3001)

---

## 🛠 Hướng dẫn sử dụng các công cụ

### 1. 📂 Sơ Đồ Dự Án (Project Manager)
Đây là nơi bạn quản lý cấu trúc tổng thể của các dự án.
- **Tạo Dự án:** Click "+ Thêm Dự Án" để bắt đầu.
- **Quản lý Link:** Lưu trữ các đường dẫn quan trọng (Link Jira, Link Figma, Link Tài liệu).
- **Quản lý Ghi chú (Notes):** Viết các ghi chú nhanh, thay đổi màu sắc y như giấy nhớ (Sticky Notes).
- **Thiết kế API (API Def):** Lưu trữ cấu trúc API, phương thức (GET/POST), và hỗ trợ sinh ra dữ liệu Mock (giả lập) theo chuẩn JSON.

### 2. 📝 Công Cụ CSV (Testcase Editor)
Được nâng cấp trở thành một công cụ viết Testcase mượt mà, hỗ trợ file CSV khổng lồ mà không bị giật lag (Virtual Scrolling).
- **Thêm/Xóa Hàng & Cột:** Click **Chuột phải (Right-click)** vào bất kỳ ô nào để mở Menu tùy chọn (Thêm hàng trên/dưới, Thêm cột trái/phải, Xóa, Nhân bản).
- **Chỉnh sửa nội dung:** Click đúp (Double-click) hoặc gõ trực tiếp vào ô để sửa.
- **Tìm kiếm (Search):** Thanh tìm kiếm thông minh giúp lọc ngay lập tức các Testcase cần tìm.
- **Sắp xếp (Sort):** Click vào **Tiêu đề cột** để sắp xếp dữ liệu (A-Z, Z-A).

### 3. 🐞 Debug Log (Log Theo Dõi Lỗi)
Công cụ tối thượng để đọc file log của hệ thống một cách trực quan, hỗ trợ màu sắc phân biệt rõ ràng.
- **Truy vấn nâng cao (Advanced Query):** 
  - Gõ vào ô tìm kiếm cú pháp `key:value` để lọc log.
  - *Ví dụ:* `status:500`, `method:POST`, `elapsed:>1000`. Cực kỳ hữu ích để tìm chính xác request bị lỗi hoặc chạy chậm.
- **Theo dõi thời gian thực (Live Stream - Theo dõi File tĩnh):**
  - Nhập đường dẫn tuyệt đối của một file log có sẵn trên ổ cứng máy bạn (Ví dụ: `D:\logs\app.log`).
  - Click **Start Stream**, hệ thống sẽ tự động cập nhật và cuộn màn hình mỗi khi file log có dòng mới được ghi vào (tương tự lệnh `tail -f` trên Linux).

---

## 🧱 Cấu trúc Kỹ thuật (Dành cho Developer)

- **Frontend:** React, Vite, Papaparse (Xử lý CSV nhanh), Vis-network.
- **Backend:** Node.js, Express, SQLite (Lưu trữ dữ liệu dạng file nhẹ nhàng, không cần cài MySQL/MongoDB).
- **Chế độ Production:** Backend được cấu hình để phục vụ (host) luôn file tĩnh (thư mục `dist`) của Frontend, giúp hệ thống chỉ chạy duy nhất trên một cổng (`3001`).
