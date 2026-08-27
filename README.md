# Xây dựng và Tối ưu hóa Hệ thống Hỗ trợ Đảm bảo Chất lượng Phần mềm (QC Tool)

**Tóm tắt (Abstract):**  
Bài báo cáo/tài liệu này trình bày việc thiết kế, xây dựng và tối ưu hóa một hệ thống phần mềm chuyên dụng nhằm hỗ trợ quá trình Đảm bảo Chất lượng (Quality Assurance - QA/QC) và kiểm thử phần mềm. Hệ thống cung cấp một nền tảng tích hợp bao gồm quản lý thông tin dự án, thao tác với dữ liệu kiểm thử khối lượng lớn (Testcase dạng CSV) và giám sát nhật ký hệ thống (Debug Log) theo thời gian thực. Bằng việc áp dụng cấu trúc Micro-frontend trên nền tảng React và kỹ thuật Virtual Scrolling, công cụ giải quyết hiệu quả bài toán về hiệu năng khi xử lý dữ liệu lớn trên trình duyệt, đồng thời tối giản hóa quá trình triển khai cho người dùng không có nền tảng chuyên sâu về lập trình.

---

## 1. Giới thiệu (Introduction)
Trong quy trình phát triển phần mềm hiện đại, đội ngũ kiểm thử (QC/Tester) và phát triển (Developer) thường phải làm việc với nhiều công cụ phân mảnh để quản lý tài liệu, viết testcase và phân tích log. Sự phân mảnh này dẫn đến sự suy giảm hiệu suất và mất tính đồng bộ. 
Nghiên cứu này đề xuất một giải pháp tích hợp (All-in-one) nhằm tối ưu hóa quy trình làm việc. Mục tiêu của hệ thống là cung cấp một giao diện trực quan, khả năng xử lý dữ liệu lớn với độ trễ thấp, và cơ chế triển khai độc lập (Standalone) không phụ thuộc vào hạ tầng mạng phức tạp.

## 2. Kiến trúc Hệ thống (System Architecture)
Hệ thống được thiết kế theo mô hình Client-Server với các công nghệ lõi:
- **Client-side (Frontend):** Ứng dụng Single-Page Application (SPA) phát triển bằng thư viện React và Vite. 
- **Server-side (Backend):** Sử dụng Node.js kết hợp framework Express nhằm xử lý các luồng dữ liệu I/O không đồng bộ.
- **Hệ quản trị Cơ sở dữ liệu:** SQLite được sử dụng nhằm đảm bảo tính di động (portability) của dự án, cho phép triển khai cục bộ (Local Deployment) mà không cần cấu hình Database Server.
- **Môi trường Thực thi (Production Mode):** Backend được cấu hình tĩnh (Static Hosting) để phân phối trực tiếp bản build của Frontend, gộp chung hai hệ thống vào một tiến trình duy nhất hoạt động trên cổng `3001`.

## 3. Các Phân hệ và Giải pháp Kỹ thuật (Technical Solutions)

### 3.1. Phân hệ Quản lý Dự án Tổng thể
Phân hệ này giải quyết bài toán quản lý siêu dữ liệu (metadata) của các dự án phần mềm.
- **Mô hình hóa Dữ liệu:** Quản lý tập trung các liên kết hệ thống (Jira, Figma), ghi chú định dạng động (Sticky Notes) và tài liệu đặc tả API.
- **Tích hợp Mock Data:** Cung cấp cơ chế tự động sinh dữ liệu giả lập (Mocking) cho các API (GET/POST) dựa trên cấu trúc JSON, hỗ trợ quá trình kiểm thử độc lập mà không cần chờ tích hợp Backend.

### 3.2. Trình soạn thảo Testcase CSV và Tối ưu Hiệu năng
Xử lý tệp CSV kích thước lớn trên DOM của HTML thường dẫn đến hiện tượng nghẽn cổ chai (bottleneck) về bộ nhớ.
- **Cơ chế Virtual Scrolling:** Hệ thống chỉ render (kết xuất) các hàng (rows) đang nằm trong vùng nhìn thấy (Viewport) của người dùng, giúp duy trì FPS (Frames Per Second) ở mức 60 ngay cả với tệp dữ liệu lên đến hàng chục nghìn dòng.
- **Tương tác Động (Dynamic Context Menu):** Thiết kế lại UX/UI bằng cách loại bỏ các nút thao tác dư thừa, tích hợp Menu ngữ cảnh (Right-click) để thao tác cấu trúc ma trận (thêm/xóa hàng, cột).
- **Thuật toán Lọc và Phân loại:** Ứng dụng `useMemo` và các thuật toán tìm kiếm trên bộ nhớ đệm (In-memory Search) để cho phép phân tích và sắp xếp dữ liệu (A-Z) theo thời gian thực (Real-time Filtering).

### 3.3. Giám sát Log thời gian thực (Real-time Log Stream)
Việc phân tích file log là một thách thức lớn khi lỗi phát sinh liên tục trong môi trường kiểm thử.
- **Giao thức Server-Sent Events (SSE):** Thay vì sử dụng WebSockets, hệ thống sử dụng SSE kết hợp với hàm `fs.watch` của Node.js để liên tục đẩy (push) các dòng log mới từ tệp văn bản ở ổ cứng cục bộ lên trình duyệt, mô phỏng cơ chế `tail -f` trên môi trường Unix.
- **Trình phân tích Cú pháp Truy vấn (Query Parser):** Hỗ trợ ngôn ngữ truy vấn phi cấu trúc, cho phép bộ lọc hoạt động dựa trên các từ khóa chỉ định như `status:500` hoặc `method:POST`, kết hợp cùng cơ chế tô màu cú pháp (Syntax Highlighting) để nâng cao khả năng phân tích trực quan.

## 4. Triển khai Thực nghiệm (Deployment & Setup)
Định hướng "No-Code Setup" được áp dụng để giảm thiểu rào cản triển khai cho người dùng cuối (End-user). Hệ thống cung cấp chuỗi kịch bản tự động hóa (`start.bat`).

**Quy trình triển khai tiêu chuẩn:**
1. Sao chép (Clone) hoặc tải mã nguồn dự án.
2. Thực thi kịch bản `start.bat`. Hệ thống sẽ thực hiện luồng công việc:
   - Đánh giá sự tồn tại của các gói phụ thuộc (`node_modules`).
   - Tự động biên dịch (Compile) Frontend thành các tệp tĩnh (Asset) nếu chưa tồn tại thư mục `dist`.
   - Khởi động Runtime Environment trên Node.js.
3. Truy cập thông qua giao diện web tại địa chỉ: `http://localhost:3001`

## 5. Tài liệu Hướng dẫn Vận hành (Operational Guidelines)
Nhằm hỗ trợ quá trình thực nghiệm, dưới đây là đặc tả các thao tác vận hành cơ bản đối với từng phân hệ:

**A. Phân hệ Quản lý Dự án:**
- Giao diện cung cấp chức năng **"+ Thêm Dự Án"** tại khu vực điều hướng.
- Người dùng có thể đính kèm các tài nguyên phân tán (Jira, Figma) và khởi tạo các ghi chú (Sticky Notes) được mã hóa màu sắc để phân loại mức độ ưu tiên.
- Khai báo API bằng cách định nghĩa Endpoint, Method và cấu trúc JSON mong muốn.

**B. Phân hệ Xử lý Dữ liệu CSV (Testcase):**
- **Thao tác cấu trúc (Matrix Manipulation):** Thực hiện **Click chuột phải (Right-click)** vào một ô (cell) bất kỳ để kích hoạt Menu Ngữ cảnh. Tại đây, người dùng có thể thêm/xóa hàng và cột linh hoạt.
- **Truy vấn Dữ liệu:** Sử dụng thanh tìm kiếm tổng thể để lọc các bản ghi (records) và nhấp chuột vào Tiêu đề cột (Column Header) để kích hoạt thuật toán sắp xếp tuyến tính (A-Z, Z-A).

**C. Phân hệ Giám sát Log:**
- **Khai báo Nguồn cấp dữ liệu:** Nhập đường dẫn tuyệt đối (Absolute Path) của tệp log hệ thống (Ví dụ: `D:\logs\error.log`) vào trường dữ liệu đầu vào, sau đó nhấn **Start Stream** để mở luồng kết nối SSE.
- **Truy vấn Cú pháp:** Áp dụng định dạng `key:value` (Ví dụ: `status:500`) vào thanh tìm kiếm nâng cao để bóc tách các cảnh báo lỗi cụ thể.

## 6. Hướng phát triển Tương lai (Future Work)
- **Tích hợp Đồ thị Khai phá Dữ liệu (Graph Data Visualization):** Đang trong quá trình thử nghiệm (hiện tạm ẩn ở phiên bản này) nhằm hỗ trợ vẽ sơ đồ luồng hệ thống tự động hóa.
- **Mở rộng Đám mây (Cloud Integration):** Chuyển đổi kiến trúc sang Microservices để hỗ trợ làm việc cộng tác nhiều người dùng (Multi-tenant) thay vì chế độ Standalone như hiện tại.
